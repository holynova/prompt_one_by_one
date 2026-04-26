/**
 * sidebar.js — 侧边栏 UI 注入与事件处理
 * 负责：注入侧边栏 HTML、绑定按钮事件、日志面板、计时器
 */

// ========== 风格中文翻译映射 ==========
const STYLE_CN_MAP = {
  'Japanese Ukiyo-e': '日本浮世绘',
  'Manga': '漫画',
  'Anime': '动漫',
  'Watercolor Illustration': '水彩插画',
  '3D Animation': '3D动画',
  'Wasteland': '废土',
  'Retro-futurism': '复古未来主义',
  'Space Opera': '太空歌剧',
  'Steampunk': '蒸汽朋克',
  'Cyberpunk': '赛博朋克',
  'Oil Painting': '油画',
  'Ethnic Art': '民族艺术',
  'Paper Quilling Artwork': '纸卷艺术',
  'Chinese Ink Painting': '中国水墨画',
  'Vintage': '复古',
  'Ivory Carving Artwork': '牙雕艺术',
  'Stained Glass Artwork': '彩色玻璃艺术',
  'Clay Artwork': '陶艺',
  'Origami Artwork': '折纸艺术',
  'Rangoli': '兰果丽',
  'Surrealism': '超现实主义',
  'Abstract Art': '抽象艺术',
  'Pointillism': '点彩画',
  'Retro Poster Style': '复古海报',
  'Minimalist Poster Style': '极简海报',
  'Sketch Drawing': '素描',
  'Op Art': '欧普艺术',
  'Doodle Art': '涂鸦艺术',
  'Constructivism': '构成主义',
  'Bauhaus': '包豪斯',
  'Renaissance': '文艺复兴',
  'Baroque Period': '巴洛克',
  'Gothic Art': '哥特艺术',
  'Victorian Period': '维多利亚时期',
};

// ========== 侧边栏 HTML 模板 ==========
const SIDEBAR_HTML = `
  <div class="gemini-sidebar-header">
    <div class="gemini-sidebar-title">🛠️ 批量作图队列</div>
    <div class="gemini-header-actions">
      <a href="https://gemini.google.com/app" target="_blank" class="gemini-link-btn" title="打开新的 Gemini 页面">🔗 新建 Gemini</a>
      <button class="gemini-collapse-btn" id="gemini-collapse-btn">▶ 收起</button>
    </div>
  </div>

  <div class="gemini-setting-row" style="flex-shrink:0;">
    <label for="gemini-newchat-interval">每完成 N 张自动新建会话</label>
    <input type="number" id="gemini-newchat-interval" class="gemini-setting-number" min="0" value="1" title="设为 0 表示不启用" />
  </div>

  <div class="gemini-setting-row" style="flex-shrink:0;">
    <label for="gemini-task-interval">作图启动间隔 / 随机波动（分钟）</label>
    <div style="display:flex; gap:8px; align-items:center;">
      <input type="number" id="gemini-task-interval" class="gemini-setting-number" min="0" step="0.1" value="0" title="设为 0 表示上一张结束后立即开始下一张" />
      <span style="color:#888; font-size:12px;">±</span>
      <input type="number" id="gemini-task-jitter" class="gemini-setting-number" min="0" step="0.1" value="0" title="每个任务都会在基础间隔上随机波动" />
    </div>
  </div>

  <div class="gemini-tabs" style="flex-shrink:0;">
    <button class="gemini-tab active" data-tab="text">📝 文本生图</button>
    <button class="gemini-tab" data-tab="image">🖼 图片转换</button>
  </div>

  <!-- ===== Tab 1: 文本生图 ===== -->
  <div class="gemini-tab-content active" id="gemini-tab-text">
    <div class="gemini-label">前缀（自动添加到每条提示词前）</div>
    <input type="text" id="gemini-prefix-input" class="gemini-input-field" placeholder="例如：请帮我生成一张" value="生成图片" />

    <div class="gemini-label" style="display:flex;justify-content:space-between;align-items:center;">
      <span>提示词列表</span>
      <div style="display:flex;align-items:center;gap:4px;">
        <button id="gemini-shuffle-prompts-btn" class="gemini-link-btn" title="打乱当前列表">🔀 打乱</button>
        <button id="gemini-all-prompts-btn" class="gemini-link-btn" title="使用全部预设">🌌 全都要</button>
        <div id="gemini-style-select-wrapper" class="gemini-style-select-wrapper"><button id="gemini-style-select-btn" class="gemini-link-btn" title="选择风格范围">🏷️ 选择风格 <span id="gemini-style-count"></span></button><div id="gemini-style-dropdown" class="gemini-style-dropdown" style="display:none;"><input type="text" id="gemini-style-search" class="gemini-style-search" placeholder="搜索风格..." /><div id="gemini-style-options" class="gemini-style-options"></div></div></div>
        <button id="gemini-random-style-btn" class="gemini-link-btn" title="从预设风格中随机选取5个">🎲 随机风格</button>
      </div>
    </div>
    <textarea id="gemini-prompt-input" placeholder="在此粘贴提示词，一行一个...&#10;例如：&#10;下雨天的东方明珠, 浮世绘风格&#10;下雨天的东方明珠, 印象主义风格">下雨天的东方明珠, 浮世绘风格
下雨天的东方明珠, 点彩派绘画风格
下雨天的东方明珠, 印象主义风格</textarea>
    <div style="text-align:right;font-size:12px;margin-top:-6px;margin-bottom:8px;color:#888;">条数：<span id="gemini-prompt-count" style="color:#8ab4f8;font-weight:bold;">0</span></div>

    <div class="gemini-label">后缀（自动添加到每条提示词后）</div>
    <input type="text" id="gemini-suffix-input" class="gemini-input-field" placeholder="例如：高清, 8K" value="4K高清, 比例1:1" />

    <div id="gemini-text-btn-container">
      <div id="gemini-text-start-row" class="gemini-btn-row">
        <button id="gemini-auto-runner-btn">▶ 启动作图队列</button>
        <button id="gemini-experiment-btn" class="gemini-experiment-btn">🧪 小批量实验</button>
      </div>
      <button id="gemini-text-pause-btn" class="gemini-running-pause-btn" style="display:none;">⏸ 暂停队列</button>
      <div id="gemini-text-pause-actions" class="gemini-pause-actions" style="display:none;">
        <button id="gemini-text-resume-btn" class="gemini-resume-btn">▶ 继续</button>
        <button id="gemini-text-terminate-btn" class="gemini-terminate-btn">🛑 终止</button>
      </div>
    </div>
  </div>

  <!-- ===== Tab 2: 图片转换 ===== -->
  <div class="gemini-tab-content" id="gemini-tab-image">
    <div class="gemini-label">选择图片（支持多选）</div>
    <div class="gemini-image-upload-area" id="gemini-image-upload-area">
      <input type="file" id="gemini-image-file-input" multiple accept="image/*" style="display:none;" />
      <button id="gemini-image-select-btn" class="gemini-image-select-btn">📂 选择图片/拖拽文件夹</button>
      <span id="gemini-image-count" class="gemini-image-count">未选择文件</span>
    </div>

    <div id="gemini-image-preview" class="gemini-image-preview"></div>

    <div class="gemini-label">转换提示词（所有图片共用）</div>
    <textarea id="gemini-image-prompt" class="gemini-image-prompt-textarea" placeholder="例如：将这张图片转换为吉卜力风格">将上面这一张图转成真人照片风格, 照相机拍出来的风格
1. 保持原图的构图, 布局, 尺寸
2. 保持原图中人物的发型, 衣着风格
3. 图中全部人物都要转换
4. 不是绘画风格, 不是动漫风格</textarea>

    <div id="gemini-image-btn-container">
      <button id="gemini-image-runner-btn">▶ 启动图片转换队列</button>
      <div id="gemini-image-pause-actions" class="gemini-pause-actions" style="display:none;">
        <button id="gemini-image-resume-btn" class="gemini-resume-btn">▶ 继续</button>
        <button id="gemini-image-terminate-btn" class="gemini-terminate-btn">🛑 终止</button>
      </div>
    </div>
  </div>

  <button id="gemini-download-btn" class="gemini-download-main-btn" style="margin-top:10px; margin-bottom:10px; flex-shrink:0;">📥 打包下载本页原图 (ZIP)</button>

  <div id="gemini-dashboard" class="gemini-dashboard" style="display:none; flex-shrink:0;">
    <div class="gemini-dashboard-grid">
      <div class="gemini-dashboard-row">
        <span class="gemini-dashboard-label">📋 任务进度</span>
        <span id="gemini-dash-progress" class="gemini-dashboard-value">0 / 0</span>
      </div>
      <div class="gemini-dashboard-row">
        <span class="gemini-dashboard-label">🖼 当前耗时</span>
        <span id="gemini-dash-current" class="gemini-dashboard-value gemini-dash-blue">00:00</span>
      </div>
      <div class="gemini-dashboard-row">
        <span class="gemini-dashboard-label">⏱ 总计耗时</span>
        <span id="gemini-dash-total" class="gemini-dashboard-value gemini-dash-orange">00:00</span>
      </div>
      <div class="gemini-dashboard-row">
        <span class="gemini-dashboard-label">📊 平均作图</span>
        <span id="gemini-dash-average" class="gemini-dashboard-value gemini-dash-green" style="color:#34a853">00:00</span>
      </div>
    </div>
    <div class="gemini-progress-bg" style="margin-top:6px;">
      <div id="gemini-progress-fill"></div>
    </div>
  </div>

  <div class="gemini-log-container">
    <div class="gemini-label">运行日志</div>
    <div id="gemini-log-panel"></div>
  </div>
`;

// ========== 计时器管理 ==========
let _timerInterval = null;
let _timerStartTime = null;   // 单张图片计时
let _totalTimerStartTime = null;  // 总任务计时

function _formatTime(ms) {
  const totalSec = Math.floor(ms / 1000);
  const min = String(Math.floor(totalSec / 60)).padStart(2, '0');
  const sec = String(totalSec % 60).padStart(2, '0');
  return `${min}:${sec}`;
}

function startTimer() {
  _timerStartTime = Date.now();
  _totalTimerStartTime = Date.now();

  const dashboard = document.getElementById('gemini-dashboard');
  const currentDisplay = document.getElementById('gemini-dash-current');
  const totalDisplay = document.getElementById('gemini-dash-total');

  if (dashboard) dashboard.style.display = '';

  if (_timerInterval) clearInterval(_timerInterval);
  _timerInterval = setInterval(() => {
    if (_timerStartTime && currentDisplay) {
      currentDisplay.textContent = _formatTime(Date.now() - _timerStartTime);
    }
    if (_totalTimerStartTime && totalDisplay) {
      totalDisplay.textContent = _formatTime(Date.now() - _totalTimerStartTime);
    }
  }, 1000);
}

function stopTimer() {
  if (_timerInterval) {
    clearInterval(_timerInterval);
    _timerInterval = null;
  }
}

function resetTimerDisplay() {
  const currentDisplay = document.getElementById('gemini-dash-current');
  const totalDisplay = document.getElementById('gemini-dash-total');
  const progressDisplay = document.getElementById('gemini-dash-progress');
  const avgDisplay = document.getElementById('gemini-dash-average');
  if (currentDisplay) currentDisplay.textContent = '00:00';
  if (totalDisplay) totalDisplay.textContent = '00:00';
  if (progressDisplay) progressDisplay.textContent = '0 / 0';
  if (avgDisplay) avgDisplay.textContent = '00:00';
  _timerStartTime = null;
  _totalTimerStartTime = null;
}

// 更新看板进度
window._updateDashboardProgress = function(current, total) {
  const el = document.getElementById('gemini-dash-progress');
  if (el) el.textContent = `${current} / ${total}`;
};

// 更新看板平均时间
window._updateDashboardAverage = function(timeStr) {
  const el = document.getElementById('gemini-dash-average');
  if (el) el.textContent = timeStr;
};


// ========== 日志功能 ==========
window._geminiAddLog = function(message, type = 'info') {
  const panel = document.getElementById('gemini-log-panel');
  if (!panel) return;

  const now = new Date();
  const timeStr = [now.getHours(), now.getMinutes(), now.getSeconds()]
    .map(n => String(n).padStart(2, '0')).join(':');

  const entry = document.createElement('div');
  entry.className = 'gemini-log-entry';

  const typeClass = {
    'success': 'gemini-log-success',
    'error':   'gemini-log-error',
    'warn':    'gemini-log-warn',
    'info':    'gemini-log-info',
  }[type] || 'gemini-log-info';

  entry.innerHTML = `<span class="gemini-log-time">[${timeStr}]</span> <span class="${typeClass}">${message}</span>`;
  panel.appendChild(entry);
  panel.scrollTop = panel.scrollHeight;
};

// ========== 队列生命周期回调 ==========
window._geminiOnQueueStart = function() {
  startTimer();
};

window._geminiOnPromptStart = function() {
  // 每个 prompt 重置计时器
  _timerStartTime = Date.now();
};

window._geminiOnQueueEnd = function() {
  stopTimer();
  const textarea = document.getElementById('gemini-prompt-input');
  const progressBar = document.getElementById('gemini-progress-fill');
  const progressText = document.getElementById('gemini-progress-text');

  // 文本 Tab: 恢复三态容器到 idle
  const textStartRow = document.getElementById('gemini-text-start-row');
  const textPauseBtn = document.getElementById('gemini-text-pause-btn');
  const textPauseActions = document.getElementById('gemini-text-pause-actions');
  const btn = document.getElementById('gemini-auto-runner-btn');
  const experimentBtn = document.getElementById('gemini-experiment-btn');
  const imageBtn = document.getElementById('gemini-image-runner-btn');
  const imagePauseActions = document.getElementById('gemini-image-pause-actions');

  if (textPauseBtn) { textPauseBtn.style.display = 'none'; textPauseBtn.disabled = false; }
  if (textPauseActions) textPauseActions.style.display = 'none';
  if (imagePauseActions) imagePauseActions.style.display = 'none';

  const resetToIdle = () => {
    if (progressBar) progressBar.style.width = '0%';
    if (progressText) progressText.innerText = '准备就绪: 0 / 0';
    if (textStartRow) textStartRow.style.display = '';
    if (btn) { btn.innerText = '▶ 启动作图队列'; btn.className = ''; btn.style.background = ''; btn.disabled = false; }
    if (experimentBtn) { experimentBtn.innerText = '🧪 小批量实验'; experimentBtn.className = 'gemini-experiment-btn'; experimentBtn.disabled = false; }
  };

  if (!window._geminiQueueAbort) {
    // 完成 → 短暂显示完成状态后恢复
    if (textStartRow) textStartRow.style.display = '';
    if (btn) { btn.innerText = '✅ 完成'; btn.className = 'completed'; }
    setTimeout(resetToIdle, 3000);
  } else {
    resetToIdle();
  }

  // 重置图片队列按钮
  if (imageBtn) {
    imageBtn.style.display = '';
    if (!window._geminiQueueAbort) {
      imageBtn.innerText = '✅ 队列完成';
      imageBtn.className = 'completed';
      setTimeout(() => {
        imageBtn.innerText = '▶ 启动图片转换队列';
        imageBtn.className = '';
        imageBtn.style.background = '';
      }, 3000);
    } else {
      imageBtn.innerText = '▶ 启动图片转换队列';
      imageBtn.className = '';
      imageBtn.style.background = '';
    }
    imageBtn.disabled = false;
  }

  if (textarea) textarea.disabled = false;
};

// ========== 注入侧边栏 ==========
function injectControlUI() {
  if (document.getElementById('gemini-auto-sidebar')) return;

  // 创建侧边栏容器
  const sidebar = document.createElement('div');
  sidebar.id = 'gemini-auto-sidebar';
  sidebar.innerHTML = SIDEBAR_HTML;
  document.body.appendChild(sidebar);

  // 恢复文本设置和下载目录设置
  const downloadFolderInput = document.getElementById('gemini-download-folder');
  if (downloadFolderInput) {
    const savedFolder = localStorage.getItem('gemini-download-folder');
    if (savedFolder) downloadFolderInput.value = savedFolder;
    downloadFolderInput.addEventListener('input', (e) => {
      localStorage.setItem('gemini-download-folder', e.target.value);
    });
  }

  // 原图提取下载
  const downloadBtn = document.getElementById('gemini-download-btn');
  if (downloadBtn) {
    downloadBtn.addEventListener('click', async () => {
      if (downloadBtn.disabled) return;
      
      let fileHandle;
      try {
        if (window.showSaveFilePicker) {
          fileHandle = await window.showSaveFilePicker({
            suggestedName: `gemini_images_${Date.now()}.zip`,
            types: [{ description: 'ZIP Archive', accept: { 'application/zip': ['.zip'] } }]
          });
        }
      } catch (e) {
        // 用户取消或拒绝
        if (e.name === 'AbortError') return;
        window._geminiAddLog('⚠️ 无法呼出保存对话框，将采用默认下载方式。', 'warn');
      }

      downloadBtn.disabled = true;

      const startTime = Date.now();
      const formatTime = (ms) => {
        const total = Math.floor(ms / 1000);
        const m = String(Math.floor(total / 60)).padStart(2, '0');
        const s = String(total % 60).padStart(2, '0');
        return `${m}:${s}`;
      };

      downloadBtn.innerText = `⏳ 打包中... 00:00`;
      const timerStr = setInterval(() => {
        downloadBtn.innerText = `⏳ 打包中... ${formatTime(Date.now() - startTime)}`;
      }, 1000);

      try {
        window._geminiAddLog('正在提取页面所有原图...', 'info');
        const images = Array.from(document.querySelectorAll('img'));
        const imageUrls = images
          .map(img => img.src)
          .filter(src => src.includes('googleusercontent.com') && !src.includes('favicon') && !src.includes('avatar'));
        
        const uniqueUrls = new Set(imageUrls);
        const downloadList = Array.from(uniqueUrls).map(url => {
          let fullUrl = url;
          const lastEqIndex = url.lastIndexOf('=');
          if (lastEqIndex !== -1) {
            fullUrl = url.substring(0, lastEqIndex + 1) + 's0';
          } else {
            fullUrl = url + '=s0';
          }
          return fullUrl;
        });

        if (downloadList.length > 0) {
          window._geminiAddLog(`✅ 找到 ${downloadList.length} 张图片，正在下载并准备打包...`, 'info');

          if (typeof JSZip === 'undefined') {
             throw new Error("JSZip 库未加载，无法执行打包");
          }

          const zip = new JSZip();
          // 用根目录代替之前的自定义文件夹层级
          let completed = 0;
          const maxConcurrency = 5; // 控制并发
          for (let i = 0; i < downloadList.length; i += maxConcurrency) {
            const chunk = downloadList.slice(i, i + maxConcurrency);
            await Promise.all(chunk.map(async (url, idx) => {
              const globalIdx = i + idx;
              try {
                const response = await new Promise((resolve, reject) => {
                  chrome.runtime.sendMessage({ action: 'FETCH_IMAGE_B64', url: url }, (res) => {
                    if (chrome.runtime.lastError) return reject(chrome.runtime.lastError.message);
                    if (res && res.success) resolve(res.data);
                    else reject(res ? res.error : 'Unknown fetch error');
                  });
                });
                zip.file(`image_${Date.now()}_${globalIdx + 1}.jpg`, response, { base64: true });
              } catch (err) {
                console.error("Fetch image error", err);
              }
            }));
            completed += chunk.length;
            window._geminiAddLog(`🕒 下载进度: ${completed}/${downloadList.length}`, 'info');
          }
          
          window._geminiAddLog(`📦 获取结束，开始生成 ZIP 归档...`, 'info');
          const content = await zip.generateAsync({ type: "blob" });
          
          if (fileHandle) {
             window._geminiAddLog(`💾 正在安全写入您的指定目录...`, 'info');
             const writable = await fileHandle.createWritable();
             await writable.write(content);
             await writable.close();
          } else {
             const a = document.createElement("a");
             const objectUrl = URL.createObjectURL(content);
             a.href = objectUrl;
             a.download = `gemini_images_${Date.now()}.zip`;
             a.click();
             setTimeout(() => URL.revokeObjectURL(objectUrl), 10000);
          }

          window._geminiAddLog(`🚀 下载完成！(总耗时 ${formatTime(Date.now() - startTime)})`, 'success');
        } else {
          window._geminiAddLog('❌ 未找到可下载的 AI 生成图片。', 'warn');
        }
      } catch(e) {
         window._geminiAddLog('❌ 打包过程出错: ' + e, 'error');
      } finally {
        clearInterval(timerStr);
        downloadBtn.disabled = false;
        downloadBtn.innerText = '📥 打包下载本页原图 (ZIP)';
      }
    });
  }

  // ===== 启动文本批量任务 =====
  const resizeHandle = document.createElement('div');
  resizeHandle.className = 'gemini-resize-handle';
  sidebar.appendChild(resizeHandle);

  // 恢复上次保存的宽度
  const savedWidth = localStorage.getItem('gemini-sidebar-width');
  if (savedWidth) {
    sidebar.style.setProperty('--sidebar-width', savedWidth);
    document.documentElement.style.setProperty('--sidebar-width', savedWidth);
  }

  let isResizing = false;
  resizeHandle.addEventListener('mousedown', (e) => {
    e.preventDefault();
    isResizing = true;
    resizeHandle.classList.add('active');
    sidebar.style.transition = 'none'; // 拖拽时禁用过渡动画
    document.documentElement.style.transition = 'none';
  });

  document.addEventListener('mousemove', (e) => {
    if (!isResizing) return;
    const newWidth = Math.min(600, Math.max(260, window.innerWidth - e.clientX));
    const widthPx = newWidth + 'px';
    sidebar.style.setProperty('--sidebar-width', widthPx);
    document.documentElement.style.setProperty('--sidebar-width', widthPx);
  });

  document.addEventListener('mouseup', () => {
    if (!isResizing) return;
    isResizing = false;
    resizeHandle.classList.remove('active');
    sidebar.style.transition = '';
    document.documentElement.style.transition = '';
    // 保存宽度
    const currentWidth = getComputedStyle(sidebar).getPropertyValue('--sidebar-width').trim();
    localStorage.setItem('gemini-sidebar-width', currentWidth);
  });

  // 创建展开按钮
  const openBtn = document.createElement('button');
  openBtn.id = 'gemini-open-btn';
  openBtn.innerText = '◀ 展开';
  document.body.appendChild(openBtn);
  
  // === 初始化侧边栏状态 ===
  let defaultOpen = false;
  if (window.location.search.includes('gemini_sidebar_open=1')) {
    defaultOpen = true;
    // 重写 URL，去掉参数避免刷新时错误
    const newUrl = window.location.href.replace('gemini_sidebar_open=1', '').replace(/[\?&]$/, '').replace('?&', '?');
    window.history.replaceState({}, document.title, newUrl);
  }

  if (defaultOpen) {
    sidebar.style.transform = 'translateX(0)';
    document.documentElement.classList.add('gemini-sidebar-open');
    openBtn.style.display = 'none';
  } else {
    sidebar.style.transform = 'translateX(100%)';
    document.documentElement.classList.remove('gemini-sidebar-open');
    openBtn.style.display = 'block';
  }

  // ===== 绑定事件 =====

  // 收起/展开
  const collapseBtn = document.getElementById('gemini-collapse-btn');
  collapseBtn.onclick = () => {
    sidebar.style.transform = 'translateX(100%)';
    document.documentElement.classList.remove('gemini-sidebar-open');
    setTimeout(() => { openBtn.style.display = 'block'; }, 300);
  };
  openBtn.onclick = () => {
    openBtn.style.display = 'none';
    sidebar.style.transform = 'translateX(0)';
    document.documentElement.classList.add('gemini-sidebar-open');
  };

  // ===== Tab 切换 =====
  const tabs = sidebar.querySelectorAll('.gemini-tab');
  const tabContents = sidebar.querySelectorAll('.gemini-tab-content');
  tabs.forEach(tab => {
    tab.onclick = () => {
      if (window._geminiIsRunning) return; // 运行中不允许切换
      tabs.forEach(t => t.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));
      tab.classList.add('active');
      const target = sidebar.querySelector(`#gemini-tab-${tab.dataset.tab}`);
      if (target) target.classList.add('active');
    };
  });

  // ===== 文本生图 启动/暂停/继续/终止按钮 =====
  const btn = document.getElementById('gemini-auto-runner-btn');
  const textarea = document.getElementById('gemini-prompt-input');
  const prefixInput = document.getElementById('gemini-prefix-input');
  const suffixInput = document.getElementById('gemini-suffix-input');
  const experimentBtn = document.getElementById('gemini-experiment-btn');
  const textStartRow = document.getElementById('gemini-text-start-row');
  const textPauseBtn = document.getElementById('gemini-text-pause-btn');
  const textPauseActions = document.getElementById('gemini-text-pause-actions');
  const textResumeBtn = document.getElementById('gemini-text-resume-btn');
  const textTerminateBtn = document.getElementById('gemini-text-terminate-btn');

  // ===== 状态持久化 (localStorage) =====
  if (localStorage.getItem('gemini_saved_prefix')) {
    prefixInput.value = localStorage.getItem('gemini_saved_prefix');
  }
  if (localStorage.getItem('gemini_saved_prompt')) {
    textarea.value = localStorage.getItem('gemini_saved_prompt');
  }
  if (localStorage.getItem('gemini_saved_suffix')) {
    suffixInput.value = localStorage.getItem('gemini_saved_suffix');
  }
  if (localStorage.getItem('gemini_saved_newchat_interval')) {
    const newChatInput = document.getElementById('gemini-newchat-interval');
    if (newChatInput) newChatInput.value = localStorage.getItem('gemini_saved_newchat_interval');
  }
  if (localStorage.getItem('gemini_saved_task_interval')) {
    const taskIntervalInput = document.getElementById('gemini-task-interval');
    if (taskIntervalInput) taskIntervalInput.value = localStorage.getItem('gemini_saved_task_interval');
  }
  if (localStorage.getItem('gemini_saved_task_jitter')) {
    const taskJitterInput = document.getElementById('gemini-task-jitter');
    if (taskJitterInput) taskJitterInput.value = localStorage.getItem('gemini_saved_task_jitter');
  }

  // 监听输入并自动保存
  prefixInput.addEventListener('input', () => {
    localStorage.setItem('gemini_saved_prefix', prefixInput.value);
  });
  const updatePromptCount = () => {
    const text = textarea.value || '';
    const count = text.split('\n').map(l => l.trim()).filter(l => l).length;
    const badge = document.getElementById('gemini-prompt-count');
    if (badge) badge.innerText = count;
  };

  textarea.addEventListener('input', () => {
    localStorage.setItem('gemini_saved_prompt', textarea.value);
    updatePromptCount();
  });
  
  // 初始计数
  updatePromptCount();
  suffixInput.addEventListener('input', () => {
    localStorage.setItem('gemini_saved_suffix', suffixInput.value);
  });
  
  const newChatInput = document.getElementById('gemini-newchat-interval');
  if (newChatInput) {
    newChatInput.addEventListener('input', () => {
      localStorage.setItem('gemini_saved_newchat_interval', newChatInput.value);
    });
  }

  const taskIntervalInput = document.getElementById('gemini-task-interval');
  if (taskIntervalInput) {
    taskIntervalInput.addEventListener('input', () => {
      localStorage.setItem('gemini_saved_task_interval', taskIntervalInput.value);
    });
  }

  const taskJitterInput = document.getElementById('gemini-task-jitter');
  if (taskJitterInput) {
    taskJitterInput.addEventListener('input', () => {
      localStorage.setItem('gemini_saved_task_jitter', taskJitterInput.value);
    });
  }

  // 跟踪当前运行模式
  let _textRunMode = null;

  // 三种互斥状态：idle / running / paused
  function showTextState(state) {
    textStartRow.style.display   = state === 'idle'    ? '' : 'none';
    textPauseBtn.style.display   = state === 'running' ? '' : 'none';
    textPauseActions.style.display = state === 'paused'  ? 'flex' : 'none';
  }

  // 启动作图队列
  btn.onclick = async () => {
    _textRunMode = 'queue';
    textPauseBtn.innerText = '⏸ 暂停队列';
    textPauseBtn.disabled = false;
    showTextState('running');
    textarea.disabled = true;
    resetTimerDisplay();
    await runGeminiQueue();
  };

  // 实验模式
  experimentBtn.onclick = async () => {
    _textRunMode = 'experiment';
    textPauseBtn.innerText = '⏸ 暂停实验';
    textPauseBtn.disabled = false;
    showTextState('running');
    textarea.disabled = true;
    resetTimerDisplay();
    await runExperimentQueue();
  };

  // 暂停按钮（运行中点击）
  textPauseBtn.onclick = () => {
    window._geminiQueuePaused = true;
    window._geminiAddLog('⏸ 已暂停，等待用户操作...', 'warn');
    showTextState('paused');
  };

  // 继续
  textResumeBtn.onclick = () => {
    window._geminiQueuePaused = false;
    window._geminiAddLog('▶ 已继续', 'success');
    textPauseBtn.innerText = _textRunMode === 'experiment' ? '⏸ 暂停实验' : '⏸ 暂停队列';
    showTextState('running');
  };

  // 终止
  textTerminateBtn.onclick = () => {
    window._geminiQueuePaused = false;
    window._geminiQueueAbort = true;
    window._geminiAddLog('🛑 已终止', 'warn');
    textPauseBtn.innerText = '⏳ 正在停止...';
    textPauseBtn.disabled = true;
    showTextState('running');
  };

  // ===== 图片转换：文件选择与拖拽 =====
  window._imageQueueFiles = [];
  const fileInput = document.getElementById('gemini-image-file-input');
  const selectBtn = document.getElementById('gemini-image-select-btn');
  const imageCount = document.getElementById('gemini-image-count');
  const imagePreview = document.getElementById('gemini-image-preview');
  const uploadArea = document.getElementById('gemini-image-upload-area');

  selectBtn.onclick = () => fileInput.click();

  function renderImagePreview() {
    imageCount.textContent = window._imageQueueFiles.length > 0 ? `已选择 ${window._imageQueueFiles.length} 张图片` : '未选择文件';
    imagePreview.innerHTML = '';
    window._imageQueueFiles.forEach((file, idx) => {
      const item = document.createElement('div');
      item.className = 'gemini-image-preview-item';

      const img = document.createElement('img');
      img.src = URL.createObjectURL(file);
      img.title = file.name;

      const name = document.createElement('span');
      name.className = 'gemini-image-name';
      name.textContent = file.name.length > 12 ? file.name.substring(0, 10) + '...' : file.name;

      const delBtn = document.createElement('button');
      delBtn.className = 'gemini-image-del-btn';
      delBtn.textContent = '×';
      delBtn.title = '移除';
      delBtn.onclick = (e) => {
        e.stopPropagation();
        window._imageQueueFiles.splice(idx, 1);
        renderImagePreview();
        
        const dt = new DataTransfer();
        window._imageQueueFiles.forEach(f => dt.items.add(f));
        fileInput.files = dt.files;
      };

      item.appendChild(img);
      item.appendChild(name);
      item.appendChild(delBtn);
      imagePreview.appendChild(item);
    });
  }

  fileInput.onchange = () => {
    const files = Array.from(fileInput.files);
    window._imageQueueFiles = window._imageQueueFiles.concat(files);
    renderImagePreview();
  };

  function scanFiles(entry) {
    return new Promise((resolve) => {
      if (!entry) {
        resolve([]);
        return;
      }
      if (entry.isFile) {
        entry.file(f => resolve([f]));
      } else if (entry.isDirectory) {
        const dirReader = entry.createReader();
        let results = [];
        function readEntries() {
          dirReader.readEntries((res) => {
            if (!res.length) {
              Promise.all(results.map(e => scanFiles(e))).then(filesArrays => {
                resolve(filesArrays.flat());
              });
            } else {
              results = results.concat(Array.from(res));
              readEntries();
            }
          }, () => resolve([]));
        }
        readEntries();
      } else {
         resolve([]);
      }
    });
  }

  if (uploadArea) {
    uploadArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      uploadArea.classList.add('dragover');
    });

    uploadArea.addEventListener('dragleave', (e) => {
      e.preventDefault();
      uploadArea.classList.remove('dragover');
    });

    uploadArea.addEventListener('drop', async (e) => {
      e.preventDefault();
      uploadArea.classList.remove('dragover');
      
      if (!e.dataTransfer || !e.dataTransfer.items) return;
      
      const originalText = imageCount.textContent;
      imageCount.textContent = '正在读取文件...';
      
      let entries = [];
      for (let i = 0; i < e.dataTransfer.items.length; i++) {
        let entry = e.dataTransfer.items[i].webkitGetAsEntry();
        if (entry) entries.push(entry);
      }
      
      let allFiles = [];
      for (let entry of entries) {
        const files = await scanFiles(entry);
        allFiles = allFiles.concat(files);
      }
      
      const imageFiles = allFiles.filter(f => f.type.startsWith('image/') || f.name.match(/\.(png|jpe?g|gif|webp|svg|bmp)$/i));
      
      if (imageFiles.length > 0) {
        window._imageQueueFiles = window._imageQueueFiles.concat(imageFiles);
        renderImagePreview();
        
        const dt = new DataTransfer();
        window._imageQueueFiles.forEach(f => dt.items.add(f));
        fileInput.files = dt.files;
      } else {
        imageCount.textContent = originalText;
      }
    });
  }

  // ===== 图片转换 启动/暂停/继续/终止按钮 =====
  const imageRunBtn = document.getElementById('gemini-image-runner-btn');
  const imagePauseActions = document.getElementById('gemini-image-pause-actions');
  const imageResumeBtn = document.getElementById('gemini-image-resume-btn');
  const imageTerminateBtn = document.getElementById('gemini-image-terminate-btn');

  function showImagePauseUI() {
    imageRunBtn.style.display = 'none';
    imagePauseActions.style.display = 'flex';
  }

  function hideImagePauseUI() {
    imagePauseActions.style.display = 'none';
    imageRunBtn.style.display = '';
  }

  imageRunBtn.onclick = async () => {
    if (window._geminiIsRunning) {
      // 暂停
      window._geminiQueuePaused = true;
      window._geminiAddLog('⏸ 队列已暂停，等待用户操作...', 'warn');
      showImagePauseUI();
    } else {
      imageRunBtn.innerText = '⏸ 暂停队列';
      imageRunBtn.className = 'running';
      resetTimerDisplay();
      await runImageQueue();
    }
  };

  imageResumeBtn.onclick = () => {
    window._geminiQueuePaused = false;
    window._geminiAddLog('▶ 队列已继续', 'success');
    hideImagePauseUI();
    imageRunBtn.innerText = '⏸ 暂停队列';
    imageRunBtn.className = 'running';
    imageRunBtn.style.display = '';
  };

  imageTerminateBtn.onclick = () => {
    window._geminiQueuePaused = false;
    window._geminiQueueAbort = true;
    window._geminiAddLog('🛑 队列已终止', 'warn');
    hideImagePauseUI();
    imageRunBtn.innerText = '⏳ 正在停止...';
    imageRunBtn.disabled = true;
    imageRunBtn.style.display = '';
  };

  // ===== 风格多选下拉框 =====
  const styleSelectBtn = document.getElementById('gemini-style-select-btn');
  const styleDropdown = document.getElementById('gemini-style-dropdown');
  const styleSearch = document.getElementById('gemini-style-search');
  const styleOptions = document.getElementById('gemini-style-options');
  const styleCount = document.getElementById('gemini-style-count');
  const selectedStyles = new Set();

  function renderStyleOptions(filter = '') {
    if (typeof prompts === 'undefined' || !Array.isArray(prompts)) return;
    styleOptions.innerHTML = '';
    const filterLower = filter.toLowerCase();
    prompts.forEach((p, idx) => {
      const cn = STYLE_CN_MAP[p.style] || '';
      const label = cn ? `${p.style} (${cn})` : p.style;
      if (filter && !label.toLowerCase().includes(filterLower) && !p.group.toLowerCase().includes(filterLower)) return;
      const item = document.createElement('label');
      item.className = 'gemini-style-option' + (selectedStyles.has(idx) ? ' selected' : '');
      item.innerHTML = `<input type="checkbox" value="${idx}" ${selectedStyles.has(idx) ? 'checked' : ''} /><span>${label}</span>`;
      item.querySelector('input').onchange = (e) => {
        if (e.target.checked) {
          selectedStyles.add(idx);
          item.classList.add('selected');
        } else {
          selectedStyles.delete(idx);
          item.classList.remove('selected');
        }
        updateStyleCount();
      };
      styleOptions.appendChild(item);
    });
  }

  function updateStyleCount() {
    styleCount.textContent = selectedStyles.size > 0 ? `(${selectedStyles.size})` : '';
  }

  styleSelectBtn.onclick = (e) => {
    e.stopPropagation();
    const isVisible = styleDropdown.style.display !== 'none';
    styleDropdown.style.display = isVisible ? 'none' : 'block';
    if (!isVisible) {
      renderStyleOptions(styleSearch.value);
      styleSearch.focus();
    }
  };

  styleSearch.oninput = () => {
    renderStyleOptions(styleSearch.value);
  };

  styleSearch.onclick = (e) => e.stopPropagation();
  styleOptions.onclick = (e) => e.stopPropagation();
  styleDropdown.onclick = (e) => e.stopPropagation();

  // 点击外部关闭下拉框
  document.addEventListener('click', () => {
    styleDropdown.style.display = 'none';
  });

  // 打乱按钮
  const shuffleBtn = document.getElementById('gemini-shuffle-prompts-btn');
  if (shuffleBtn) {
    shuffleBtn.onclick = () => {
      const lines = textarea.value.split('\n').map(l => l.trim()).filter(l => l);
      if (lines.length === 0) return;
      for (let i = lines.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [lines[i], lines[j]] = [lines[j], lines[i]];
      }
      textarea.value = lines.join('\n');
      updatePromptCount();
      localStorage.setItem('gemini_saved_prompt', textarea.value);
      window._geminiAddLog(`🔀 已打乱 ${lines.length} 条提示词`, 'info');
    };
  }

  // 全都要按钮
  const allPromptsBtn = document.getElementById('gemini-all-prompts-btn');
  if (allPromptsBtn) {
    allPromptsBtn.onclick = () => {
      if (typeof prompts === 'undefined' || !Array.isArray(prompts) || prompts.length === 0) {
        window._geminiAddLog('❌ 未找到预设风格数据', 'error');
        return;
      }
      textarea.value = prompts.map(p => p.prompt).join('\n');
      updatePromptCount();
      localStorage.setItem('gemini_saved_prompt', textarea.value);
      window._geminiAddLog(`🌌 已载入全部 ${prompts.length} 条预设提示词`, 'info');
    };
  }

  // 随机风格按钮
  const randomBtn = document.getElementById('gemini-random-style-btn');
  if (randomBtn) {
    randomBtn.onclick = () => {
      if (typeof prompts === 'undefined' || !Array.isArray(prompts) || prompts.length === 0) {
        window._geminiAddLog('❌ 未找到预设风格数据', 'error');
        return;
      }
      let pool = selectedStyles.size > 0 ? [...selectedStyles].map(idx => prompts[idx]) : [...prompts];
      const count = Math.min(5, pool.length);
      const shuffled = [...pool].sort(() => Math.random() - 0.5);
      const picked = shuffled.slice(0, count);
      textarea.value = picked.map(p => p.prompt).join('\n');
      updatePromptCount();
      localStorage.setItem('gemini_saved_prompt', textarea.value);
      window._geminiAddLog(`🎲 已随机选取 ${picked.length} 个风格`, 'info');
    };
  }

  // 初始日志
  const _currentSite = getSiteConfig();
  window._geminiAddLog(`侧边栏已加载 [${_currentSite.name}]，准备就绪`, 'info');
}

// ========== 延迟注入 ==========
setTimeout(injectControlUI, 3000);

// ========== 监听插件图标点击 ==========
chrome.runtime.onMessage.addListener((message) => {
  if (message.action === 'toggleSidebar') {
    const sidebar = document.getElementById('gemini-auto-sidebar');
    const openBtn = document.getElementById('gemini-open-btn');
    if (!sidebar) return;
    const isHidden = sidebar.style.transform === 'translateX(100%)';
    if (isHidden) {
      sidebar.style.transform = 'translateX(0)';
      document.documentElement.classList.add('gemini-sidebar-open');
      if (openBtn) openBtn.style.display = 'none';
    } else {
      sidebar.style.transform = 'translateX(100%)';
      document.documentElement.classList.remove('gemini-sidebar-open');
      setTimeout(() => { if (openBtn) openBtn.style.display = 'block'; }, 300);
    }
  }
});
