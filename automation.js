/**
 * automation.js — 核心自动化逻辑
 * 负责：发送提示词、监听图片生成、队列执行
 */

// ========== 全局状态 ==========
window._geminiQueueAbort = false;
window._geminiIsRunning = false;

// 日志回调（由 sidebar.js 注入）
window._geminiAddLog = window._geminiAddLog || function(msg, type) {
  console.log(`[LOG][${type || 'info'}] ${msg}`);
};

// ========== 配置 ==========
const GEMINI_CONFIG = {
  minDelay: 5000,
  maxDelay: 15000,
  timeoutMs: 60000,
  inputSelector: 'div[contenteditable="true"], textarea',
  sendButtonSelector: 'button[aria-label*="发送"], button[aria-label*="Send"], .send-button-class',
};

// ========== 工具函数 ==========
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function simulateInput(element, text) {
  element.focus();
  if (element.isContentEditable) {
    element.textContent = text;
  } else {
    element.value = text;
  }
  element.dispatchEvent(new Event('input', { bubbles: true }));
  element.dispatchEvent(new Event('change', { bubbles: true }));
  element.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
  element.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', bubbles: true, cancelable: true }));
}

// ========== 执行输入 ==========
async function executeInput(promptText) {
  window._geminiAddLog('正在寻找输入框...', 'info');
  let inputBox = document.querySelector(GEMINI_CONFIG.inputSelector);

  if (!inputBox) {
    window._geminiAddLog('❌ 未找到输入框！', 'error');
    return false;
  }

  window._geminiAddLog(`填入提示词: "${promptText.substring(0, 40)}${promptText.length > 40 ? '...' : ''}"`, 'info');
  simulateInput(inputBox, promptText);
  await sleep(500);

  let sendBtn = document.querySelector(GEMINI_CONFIG.sendButtonSelector);
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
function startObserver() {
  return new Promise((resolve) => {
    window._geminiAddLog(`开启监听，等待生成结果 (超时: ${GEMINI_CONFIG.timeoutMs / 1000}s)...`, 'info');

    const targetNode = document.body;
    const config = { childList: true, subtree: true, characterData: true };
    let isGenerating = true;
    let checkTimeout;

    const callback = function(mutationsList, observer) {
      if (!isGenerating) return;

      // 检查是否被中止
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
              const generatedImages = Array.from(images).filter(img => img.src && !img.src.includes('avatar'));

              if (generatedImages.length > 0) {
                isGenerating = false;
                observer.disconnect();
                clearTimeout(checkTimeout);
                resolve('success');
                return;
              }

              const textContent = node.textContent || "";
              if (textContent.includes("无法生成") || textContent.includes("请重试") || textContent.includes("安全限制")) {
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
    }, GEMINI_CONFIG.timeoutMs);
  });
}

// ========== 格式化时间 ==========
function formatElapsed(ms) {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}分${sec}秒`;
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
  const progressText = document.getElementById('gemini-progress-text');

  progressBar.style.width = '0%';
  progressText.innerText = `准备就绪: 0 / ${prompts.length}`;

  // 重置中止标记
  window._geminiQueueAbort = false;
  window._geminiIsRunning = true;

  const queueStartTime = Date.now();
  window._geminiAddLog(`🚀 队列启动，共 ${prompts.length} 个任务`, 'success');
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
    progressText.innerText = `正在执行: ${i + 1} / ${prompts.length}`;

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

    // 队列间歇
    if (i < prompts.length - 1 && !window._geminiQueueAbort) {
      const delay = Math.floor(Math.random() * (GEMINI_CONFIG.maxDelay - GEMINI_CONFIG.minDelay + 1)) + GEMINI_CONFIG.minDelay;
      window._geminiAddLog(`⏸ 冷却 ${(delay / 1000).toFixed(1)}s...`, 'info');

      const btn = document.getElementById('gemini-auto-runner-btn');

      // 分段 sleep 以便及时响应中止，同时显示倒计时
      const sliceMs = 500;
      let waited = 0;
      while (waited < delay && !window._geminiQueueAbort) {
        const remaining = Math.max(0, (delay - waited) / 1000);
        progressText.innerText = `冷却中 ${remaining.toFixed(1)}s | ${i + 1} / ${prompts.length}`;
        if (btn) btn.innerText = `⏸ 冷却 ${remaining.toFixed(1)}s`;
        await sleep(Math.min(sliceMs, delay - waited));
        waited += sliceMs;
      }
      // 恢复按钮文字
      if (btn && !window._geminiQueueAbort) {
        btn.innerText = '⏹ 停止队列';
      }
    }
  }

  const totalElapsed = Date.now() - queueStartTime;

  if (!window._geminiQueueAbort) {
    progressBar.style.width = '100%';
    progressText.innerText = `队列完成: ${prompts.length} / ${prompts.length}`;
    window._geminiAddLog(`🎉 全部完成！总耗时 ${formatElapsed(totalElapsed)}`, 'success');
  }

  window._geminiIsRunning = false;

  // 通知 sidebar 停止计时
  if (window._geminiOnQueueEnd) window._geminiOnQueueEnd();
}
