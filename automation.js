/**
 * automation.js — 核心自动化逻辑
 * 负责：发送提示词、监听图片生成、队列执行
 * 支持：Gemini、ChatGPT、Grok
 */

// ========== 全局状态 ==========
window._geminiQueueAbort = false;
window._geminiIsRunning = false;

// 日志回调（由 sidebar.js 注入）
window._geminiAddLog = window._geminiAddLog || function(msg, type) {
  console.log(`[LOG][${type || 'info'}] ${msg}`);
};

// ========== 多站点配置 ==========
const SITE_CONFIGS = {
  gemini: {
    name: 'Gemini',
    urlPattern: /gemini\.google\.com/,
    inputSelector: 'div[contenteditable="true"], textarea',
    sendButtonSelector: 'button[aria-label*="发送"], button[aria-label*="Send"], .send-button-class',
    failKeywords: ['无法生成', '请重试', '安全限制'],
    fileInputSelector: 'input[type="file"]',
    uploadButtonSelector: 'button[aria-label*="上传"], button[aria-label*="Upload"], button[aria-label*="image"], button[aria-label*="图片"]',
    newChatButtonSelector: 'a[aria-label*="New chat"], a[aria-label*="新建聊天"], button[aria-label*="New chat"]',
  },
  chatgpt: {
    name: 'ChatGPT',
    urlPattern: /chat(gpt)?\.openai\.com|chatgpt\.com/,
    inputSelector: '#prompt-textarea, div.ProseMirror[contenteditable="true"], div[contenteditable="true"]',
    sendButtonSelector: 'button[data-testid="send-button"], button[aria-label*="Send"], button[aria-label*="发送"]',
    failKeywords: ['unable to generate', 'content policy', '无法生成'],
    fileInputSelector: 'input[type="file"]',
    uploadButtonSelector: 'button[aria-label*="Attach"], button[aria-label*="附件"], button[aria-label*="Upload"]',
    newChatButtonSelector: 'a[data-testid="create-new-chat-button"], nav a[href="/"], button[aria-label*="New chat"]',
  },
  grok: {
    name: 'Grok',
    urlPattern: /grok\.com/,
    inputSelector: 'textarea, div[contenteditable="true"]',
    sendButtonSelector: 'button[aria-label*="Send"], button[aria-label*="submit"], button[type="submit"]',
    failKeywords: ['unable to generate', 'content policy', '无法生成'],
    fileInputSelector: 'input[type="file"]',
    uploadButtonSelector: 'button[aria-label*="Attach"], button[aria-label*="Upload"]',
    newChatButtonSelector: 'a[href="/chat"], a[aria-label*="聊天"], a[aria-label*="Chat"], button[aria-label*="New chat"], button[aria-label*="New conversation"]',
  },
};

// 通用配置
const QUEUE_CONFIG = {
  minDelay: 5000,
  maxDelay: 15000,
  timeoutMs: 60000,
};

function getSiteConfig() {
  const url = window.location.href;
  for (const [key, config] of Object.entries(SITE_CONFIGS)) {
    if (config.urlPattern.test(url)) {
      return config;
    }
  }
  // 默认回退到 Gemini 配置
  return SITE_CONFIGS.gemini;
}

// ========== 工具函数 ==========
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function simulateInput(element, text) {
  element.focus();

  if (element.isContentEditable) {
    // 清空并插入文本（兼容 ProseMirror 等富文本编辑器）
    element.innerHTML = '';
    const p = document.createElement('p');
    p.textContent = text;
    element.appendChild(p);
  } else {
    // 原生 textarea
    const nativeSetter = Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement.prototype, 'value'
    )?.set;
    if (nativeSetter) {
      nativeSetter.call(element, text);
    } else {
      element.value = text;
    }
  }
  element.dispatchEvent(new Event('input', { bubbles: true }));
  element.dispatchEvent(new Event('change', { bubbles: true }));
}

// ========== 执行输入 ==========
async function executeInput(promptText) {
  const site = getSiteConfig();
  window._geminiAddLog(`[${site.name}] 正在寻找输入框...`, 'info');

  let inputBox = document.querySelector(site.inputSelector);

  if (!inputBox) {
    // 重试一次，等待动态渲染
    await sleep(1000);
    inputBox = document.querySelector(site.inputSelector);
  }

  if (!inputBox) {
    window._geminiAddLog('❌ 未找到输入框！', 'error');
    return false;
  }

  window._geminiAddLog(`填入提示词: "${promptText.substring(0, 40)}${promptText.length > 40 ? '...' : ''}"`, 'info');
  simulateInput(inputBox, promptText);
  await sleep(800);

  let sendBtn = document.querySelector(site.sendButtonSelector);
  if (sendBtn) {
    window._geminiAddLog('点击发送按钮', 'info');
    sendBtn.click();
  } else {
    window._geminiAddLog('未找到发送按钮，模拟回车发送', 'warn');
    const enterEvent = new KeyboardEvent('keydown', {
      key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true, cancelable: true
    });
    inputBox.dispatchEvent(enterEvent);
  }
  return true;
}

// ========== 监听生成结果 ==========

// 获取页面上回复前的图片快照（用于对比新增）
function _getExistingImageSrcs() {
  const imgs = document.querySelectorAll('img');
  return new Set(Array.from(imgs).map(img => img.src).filter(Boolean));
}

// --- Gemini / Grok: MutationObserver 方式 ---
function startObserverDefault(site) {
  // 快照当前所有图片 src，避免把上传预览误判为生成结果
  const existingImgSrcs = _getExistingImageSrcs();

  return new Promise((resolve) => {
    window._geminiAddLog(`开启监听，等待生成结果 (超时: ${QUEUE_CONFIG.timeoutMs / 1000}s)...`, 'info');

    const targetNode = document.body;
    const config = { childList: true, subtree: true, characterData: true };
    let isGenerating = true;
    let checkTimeout;

    const callback = function(mutationsList, observer) {
      if (!isGenerating) return;

      if (window._geminiQueueAbort) {
        isGenerating = false;
        observer.disconnect();
        clearTimeout(checkTimeout);
        resolve('aborted');
        return;
      }

      for (let mutation of mutationsList) {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          mutation.addedNodes.forEach(node => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const images = node.querySelectorAll ? node.querySelectorAll('img') : [];
              // 只计算 src 不在快照中的真正新图片
              const newImages = Array.from(images).filter(img =>
                img.src && !img.src.includes('avatar') && !existingImgSrcs.has(img.src)
              );

              if (newImages.length > 0) {
                isGenerating = false;
                observer.disconnect();
                clearTimeout(checkTimeout);
                resolve('success');
                return;
              }

              const textContent = node.textContent || "";
              if (site.failKeywords.some(kw => textContent.includes(kw))) {
                isGenerating = false;
                observer.disconnect();
                clearTimeout(checkTimeout);
                resolve('failed');
                return;
              }
            }
          });
        }
      }
    };

    const observer = new MutationObserver(callback);
    observer.observe(targetNode, config);

    checkTimeout = setTimeout(() => {
      if (isGenerating) {
        isGenerating = false;
        observer.disconnect();
        resolve('timeout');
      }
    }, QUEUE_CONFIG.timeoutMs);
  });
}

// --- ChatGPT: 组合检测（DOM 稳定性 + 轮询 img） ---
function startObserverChatGPT(site) {
  return new Promise((resolve) => {
    window._geminiAddLog(`[ChatGPT] 开启组合检测 (轮询img + DOM稳定性)...`, 'info');

    const beforeImgSrcs = _getExistingImageSrcs();
    let resolved = false;
    let lastMutationTime = Date.now();
    let mutationStarted = false; // AI 是否已开始回复（首次 DOM 变化）
    const DOM_STABLE_THRESHOLD = 5000; // DOM 连续 5 秒无变化视为完成

    function done(result) {
      if (resolved) return;
      resolved = true;
      observer.disconnect();
      clearInterval(pollInterval);
      clearTimeout(globalTimeout);
      resolve(result);
    }

    // 方法 1: MutationObserver 跟踪 DOM 变化时间
    const observer = new MutationObserver((mutations) => {
      if (resolved) return;

      if (window._geminiQueueAbort) {
        done('aborted');
        return;
      }

      lastMutationTime = Date.now();
      mutationStarted = true;

      // 检查失败关键词
      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach(node => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const text = node.textContent || '';
              if (site.failKeywords.some(kw => text.includes(kw))) {
                window._geminiAddLog('检测到失败关键词', 'warn');
                done('failed');
              }
            }
          });
        }
      }
    });

    observer.observe(document.body, {
      childList: true, subtree: true, characterData: true, attributes: true
    });

    // 方法 2: 每秒轮询检查新增图片 + DOM 稳定性
    const pollInterval = setInterval(() => {
      if (resolved) return;

      if (window._geminiQueueAbort) {
        done('aborted');
        return;
      }

      // 检查新图片
      const currentImgs = document.querySelectorAll('img');
      for (const img of currentImgs) {
        if (img.src && !beforeImgSrcs.has(img.src) && !img.src.includes('avatar') && !img.src.includes('data:image/svg')) {
          window._geminiAddLog('轮询检测到新图片', 'info');
          done('success');
          return;
        }
      }

      // DOM 稳定性检测：AI 开始回复后，连续 N 秒无 DOM 变化
      if (mutationStarted) {
        const silentMs = Date.now() - lastMutationTime;
        if (silentMs >= DOM_STABLE_THRESHOLD) {
          window._geminiAddLog(`DOM 已稳定 ${(silentMs / 1000).toFixed(1)}s，判定生成完成`, 'info');
          done('success');
          return;
        }
      }
    }, 1000);

    // 全局超时
    const globalTimeout = setTimeout(() => {
      if (!resolved) {
        window._geminiAddLog('监听超时', 'warn');
        done('timeout');
      }
    }, QUEUE_CONFIG.timeoutMs);
  });
}

// --- 调度入口 ---
function startObserver() {
  const site = getSiteConfig();
  if (site === SITE_CONFIGS.chatgpt) {
    return startObserverChatGPT(site);
  }
  return startObserverDefault(site);
}

// ========== 格式化时间 ==========
function formatElapsed(ms) {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}分${sec}秒`;
}

// ========== 自动新建会话 ==========
function getNewChatInterval() {
  const input = document.getElementById('gemini-newchat-interval');
  const val = parseInt(input?.value, 10);
  return (val && val > 0) ? val : 0; // 0 = 不启用
}

async function openNewChat() {
  const site = getSiteConfig();

  // 找到“新建会话”按钮并点击
  const newChatBtn = document.querySelector(site.newChatButtonSelector);
  if (!newChatBtn) {
    window._geminiAddLog('⚠️ 未找到“新建会话”按钮，跳过', 'warn');
    return;
  }

  window._geminiAddLog('🔄 点击“新建会话”...', 'info');
  newChatBtn.click();

  // 等待新会话加载
  await sleep(3000);

  // 等待输入框出现（最多再等 10s）
  for (let i = 0; i < 20; i++) {
    const input = document.querySelector(site.inputSelector);
    if (input) {
      window._geminiAddLog('✅ 新会话已就绪', 'info');
      return;
    }
    await sleep(500);
  }
  window._geminiAddLog('⚠️ 新会话加载超时，尝试继续...', 'warn');
}

// ========== 主队列执行 ==========
async function runGeminiQueue() {
  // 读取提示词
  const rawPrompts = document.getElementById('gemini-prompt-input').value;
  const prompts = rawPrompts.split('\n').map(p => p.trim()).filter(p => p !== '');

  if (prompts.length === 0) {
    window._geminiAddLog('⚠️ 请先输入至少一个提示词！', 'warn');
    return;
  }

  // 读取前缀/后缀
  const prefix = (document.getElementById('gemini-prefix-input')?.value || '').trim();
  const suffix = (document.getElementById('gemini-suffix-input')?.value || '').trim();

  // 获取 UI 元素
  const progressBar = document.getElementById('gemini-progress-fill');

  progressBar.style.width = '0%';
  if (window._updateDashboardProgress) window._updateDashboardProgress(0, prompts.length);

  // 重置中止标记
  window._geminiQueueAbort = false;
  window._geminiIsRunning = true;

  const queueStartTime = Date.now();
  const site = getSiteConfig();
  window._geminiAddLog(`🚀 [${site.name}] 队列启动，共 ${prompts.length} 个任务`, 'success');
  if (prefix) window._geminiAddLog(`前缀: "${prefix}"`, 'info');
  if (suffix) window._geminiAddLog(`后缀: "${suffix}"`, 'info');

  // 通知 sidebar 开始计时
  if (window._geminiOnQueueStart) window._geminiOnQueueStart();

  for (let i = 0; i < prompts.length; i++) {
    // 检查是否中止
    if (window._geminiQueueAbort) {
      window._geminiAddLog(`⏹ 队列已停止 (已完成 ${i}/${prompts.length})`, 'warn');
      break;
    }

    // 组合完整提示词
    const fullPrompt = [prefix, prompts[i], suffix].filter(Boolean).join('\n');

    window._geminiAddLog(`▶ 任务 ${i + 1}/${prompts.length} 开始`, 'info');

    // 更新进度条
    progressBar.style.width = `${(i / prompts.length) * 100}%`;
    if (window._updateDashboardProgress) window._updateDashboardProgress(i + 1, prompts.length);

    // 通知 sidebar 重置单任务计时
    if (window._geminiOnPromptStart) window._geminiOnPromptStart();

    const promptStartTime = Date.now();
    const inputSuccess = await executeInput(fullPrompt);

    if (inputSuccess) {
      await sleep(1000);
      const result = await startObserver();
      const elapsed = Date.now() - promptStartTime;

      if (result === 'aborted') {
        window._geminiAddLog(`⏹ 队列已停止 (已完成 ${i}/${prompts.length})`, 'warn');
        break;
      }

      const statusMap = {
        'success': { icon: '🎉', text: '图片生成成功', type: 'success' },
        'failed':  { icon: '❌', text: '生成失败/被拦截', type: 'error' },
        'timeout': { icon: '⏳', text: '监听超时', type: 'warn' },
      };
      const info = statusMap[result] || { icon: '❓', text: result, type: 'info' };
      window._geminiAddLog(`${info.icon} 任务 ${i + 1}: ${info.text} (耗时 ${formatElapsed(elapsed)})`, info.type);
    } else {
      window._geminiAddLog(`❌ 任务 ${i + 1}: 输入失败，跳过`, 'error');
    }

    // 自动新建会话
    const newChatN = getNewChatInterval();
    if (newChatN > 0 && (i + 1) % newChatN === 0 && i < prompts.length - 1 && !window._geminiQueueAbort) {
      window._geminiAddLog(`📌 已完成 ${i + 1} 个任务，自动新建会话...`, 'info');
      await openNewChat();
    }

    // 队列间歇
    if (i < prompts.length - 1 && !window._geminiQueueAbort) {
      const delay = Math.floor(Math.random() * (QUEUE_CONFIG.maxDelay - QUEUE_CONFIG.minDelay + 1)) + QUEUE_CONFIG.minDelay;
      const totalSec = Math.ceil(delay / 1000);
      window._geminiAddLog(`⏸ 冷却 ${totalSec}s...`, 'info');

      const btn = document.getElementById('gemini-auto-runner-btn');

      // 以 1 秒为周期倒计时
      for (let sec = totalSec; sec > 0 && !window._geminiQueueAbort; sec--) {
        const progress = ((totalSec - sec) / totalSec) * 100;
        if (window._updateDashboardProgress) window._updateDashboardProgress(i + 1, prompts.length);
        if (btn) {
          btn.innerText = `⏸ 冷却 ${sec}s`;
          btn.style.background = `linear-gradient(90deg, rgba(255,255,255,0.15) ${progress}%, transparent ${progress}%), linear-gradient(135deg, #e53935, #c62828)`;
        }
        await sleep(1000);
      }
      // 恢复按钮样式
      if (btn && !window._geminiQueueAbort) {
        btn.innerText = '⏹ 停止队列';
        btn.style.background = '';
      }
    }
  }

  const totalElapsed = Date.now() - queueStartTime;

  if (!window._geminiQueueAbort) {
    progressBar.style.width = '100%';
    if (window._updateDashboardProgress) window._updateDashboardProgress(prompts.length, prompts.length);
    window._geminiAddLog(`🎉 全部完成！总耗时 ${formatElapsed(totalElapsed)}`, 'success');
  }

  window._geminiIsRunning = false;

  // 通知 sidebar 停止计时
  if (window._geminiOnQueueEnd) window._geminiOnQueueEnd();
}

// ========== 图片上传（剪贴板粘贴方式） ==========
async function uploadImageToSite(file) {
  const site = getSiteConfig();
  window._geminiAddLog(`[${site.name}] 正在粘贴图片: ${file.name}`, 'info');

  // 找到输入区域
  let inputBox = document.querySelector(site.inputSelector);
  if (!inputBox) {
    await sleep(1000);
    inputBox = document.querySelector(site.inputSelector);
  }
  if (!inputBox) {
    window._geminiAddLog('❌ 未找到输入框，无法粘贴图片！', 'error');
    return false;
  }

  inputBox.focus();
  await sleep(300);

  // 构造 ClipboardEvent 模拟粘贴
  const dataTransfer = new DataTransfer();
  dataTransfer.items.add(file);

  const pasteEvent = new ClipboardEvent('paste', {
    bubbles: true,
    cancelable: true,
    clipboardData: dataTransfer,
  });

  inputBox.dispatchEvent(pasteEvent);
  window._geminiAddLog('已模拟粘贴，等待上传确认...', 'info');
  return true;
}

// 等待图片上传完成（固定延时，等待 loading → 预览完成）
async function waitForUploadComplete(delayMs = 10000) {
  window._geminiAddLog(`等待图片上传完成 (${delayMs / 1000}s)...`, 'info');
  const step = 500;
  let waited = 0;
  while (waited < delayMs) {
    if (window._geminiQueueAbort) return 'aborted';
    await sleep(step);
    waited += step;
  }
  window._geminiAddLog('✅ 图片上传等待完成', 'info');
  return 'success';
}

// ========== 图片转换队列 ==========
async function runImageQueue() {
  const files = window._imageQueueFiles || [];
  const prompt = (document.getElementById('gemini-image-prompt')?.value || '').trim();

  if (files.length === 0) {
    window._geminiAddLog('⚠️ 请先选择图片！', 'warn');
    return;
  }
  if (!prompt) {
    window._geminiAddLog('⚠️ 请输入转换提示词！', 'warn');
    return;
  }

  const progressBar = document.getElementById('gemini-progress-fill');

  progressBar.style.width = '0%';
  if (window._updateDashboardProgress) window._updateDashboardProgress(0, files.length);

  window._geminiQueueAbort = false;
  window._geminiIsRunning = true;

  const queueStartTime = Date.now();
  const site = getSiteConfig();
  window._geminiAddLog(`🖼 [${site.name}] 图片转换队列启动，共 ${files.length} 张`, 'success');
  window._geminiAddLog(`提示词: "${prompt}"`, 'info');

  if (window._geminiOnQueueStart) window._geminiOnQueueStart();

  for (let i = 0; i < files.length; i++) {
    if (window._geminiQueueAbort) {
      window._geminiAddLog(`⏹ 队列已停止 (已完成 ${i}/${files.length})`, 'warn');
      break;
    }

    const file = files[i];
    window._geminiAddLog(`▶ 任务 ${i + 1}/${files.length}: ${file.name}`, 'info');

    progressBar.style.width = `${(i / files.length) * 100}%`;
    if (window._updateDashboardProgress) window._updateDashboardProgress(i + 1, files.length);

    if (window._geminiOnPromptStart) window._geminiOnPromptStart();

    const promptStartTime = Date.now();

    // 第一步：上传图片
    const uploadOk = await uploadImageToSite(file);
    if (!uploadOk) {
      window._geminiAddLog(`❌ 任务 ${i + 1}: 上传失败，跳过`, 'error');
      continue;
    }

    // 第二步：等待上传完成
    const uploadResult = await waitForUploadComplete();
    if (uploadResult === 'aborted') {
      window._geminiAddLog(`⏹ 队列已停止 (已完成 ${i}/${files.length})`, 'warn');
      break;
    }

    await sleep(500);

    // 第三步：输入提示词
    const inputSuccess = await executeInput(prompt);

    if (inputSuccess) {
      // 第四步：等待生成完成
      await sleep(1000);
      const result = await startObserver();
      const elapsed = Date.now() - promptStartTime;

      if (result === 'aborted') {
        window._geminiAddLog(`⏹ 队列已停止 (已完成 ${i}/${files.length})`, 'warn');
        break;
      }

      const statusMap = {
        success: { icon: '✅', text: '生成成功', type: 'success' },
        failed: { icon: '⚠️', text: '生成失败', type: 'warn' },
        timeout: { icon: '⏰', text: '生成超时', type: 'warn' },
      };
      const info = statusMap[result] || { icon: '❓', text: '未知状态', type: 'info' };
      window._geminiAddLog(`${info.icon} 任务 ${i + 1} (${file.name}): ${info.text} (耗时 ${formatElapsed(elapsed)})`, info.type);
    } else {
      window._geminiAddLog(`❌ 任务 ${i + 1}: 输入失败，跳过`, 'error');
    }

    // 自动新建会话
    const newChatN = getNewChatInterval();
    if (newChatN > 0 && (i + 1) % newChatN === 0 && i < files.length - 1 && !window._geminiQueueAbort) {
      window._geminiAddLog(`📌 已完成 ${i + 1} 个任务，自动新建会话...`, 'info');
      await openNewChat();
    }

    // 冷却
    if (i < files.length - 1 && !window._geminiQueueAbort) {
      const delay = Math.floor(Math.random() * (QUEUE_CONFIG.maxDelay - QUEUE_CONFIG.minDelay + 1)) + QUEUE_CONFIG.minDelay;
      const totalSec = Math.ceil(delay / 1000);
      window._geminiAddLog(`⏸ 冷却 ${totalSec}s...`, 'info');

      const btn = document.getElementById('gemini-image-runner-btn');

      for (let sec = totalSec; sec > 0 && !window._geminiQueueAbort; sec--) {
        const progress = ((totalSec - sec) / totalSec) * 100;
        if (window._updateDashboardProgress) window._updateDashboardProgress(i + 1, files.length);
        if (btn) {
          btn.innerText = `⏸ 冷却 ${sec}s`;
          btn.style.background = `linear-gradient(90deg, rgba(255,255,255,0.15) ${progress}%, transparent ${progress}%), linear-gradient(135deg, #e53935, #c62828)`;
        }
        await sleep(1000);
      }
      if (btn && !window._geminiQueueAbort) {
        btn.innerText = '⏹ 停止队列';
        btn.style.background = '';
      }
    }
  }

  const totalElapsed = Date.now() - queueStartTime;

  if (!window._geminiQueueAbort) {
    progressBar.style.width = '100%';
    if (window._updateDashboardProgress) window._updateDashboardProgress(files.length, files.length);
    window._geminiAddLog(`🎉 图片转换全部完成！总耗时 ${formatElapsed(totalElapsed)}`, 'success');
  }

  window._geminiIsRunning = false;

  if (window._geminiOnQueueEnd) window._geminiOnQueueEnd();
}
