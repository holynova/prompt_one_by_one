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

  <div class="gemini-label">前缀（自动添加到每条提示词前）</div>
  <input type="text" id="gemini-prefix-input" class="gemini-input-field" placeholder="例如：请帮我生成一张" />

  <div class="gemini-label" style="display:flex;justify-content:space-between;align-items:center;">提示词列表（一行一个）<div style="display:flex;align-items:center;gap:4px;"><div id="gemini-style-select-wrapper" class="gemini-style-select-wrapper"><button id="gemini-style-select-btn" class="gemini-link-btn" title="选择风格范围">🏷️ 选择风格 <span id="gemini-style-count"></span></button><div id="gemini-style-dropdown" class="gemini-style-dropdown" style="display:none;"><input type="text" id="gemini-style-search" class="gemini-style-search" placeholder="搜索风格..." /><div id="gemini-style-options" class="gemini-style-options"></div></div></div><button id="gemini-random-style-btn" class="gemini-link-btn" title="从预设风格中随机选取5个">🎲 随机风格</button></div></div>
  <textarea id="gemini-prompt-input" placeholder="在此粘贴提示词，一行一个...&#10;例如：&#10;下雨天的东方明珠, 浮世绘风格&#10;下雨天的东方明珠, 印象主义风格">下雨天的东方明珠, 浮世绘风格
下雨天的东方明珠, 点彩派绘画风格
下雨天的东方明珠, 印象主义风格</textarea>

  <div class="gemini-label">后缀（自动添加到每条提示词后）</div>
  <input type="text" id="gemini-suffix-input" class="gemini-input-field" placeholder="例如：高清, 8K" />

  <div class="gemini-progress-container">
    <div class="gemini-progress-bg">
      <div id="gemini-progress-fill"></div>
    </div>
    <div class="gemini-progress-info">
      <span id="gemini-progress-text">准备就绪: 0 / 0</span>
      <div class="gemini-timer-group">
        <span id="gemini-timer-display" title="当前图片耗时">🖼 00:00</span>
        <span id="gemini-total-timer-display" title="总任务耗时">⏱ 00:00</span>
      </div>
    </div>
  </div>

  <button id="gemini-auto-runner-btn">▶ 启动作图队列</button>

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
  const display = document.getElementById('gemini-timer-display');
  const totalDisplay = document.getElementById('gemini-total-timer-display');
  if (_timerInterval) clearInterval(_timerInterval);
  _timerInterval = setInterval(() => {
    if (_timerStartTime) {
      display.textContent = `🖼 ${_formatTime(Date.now() - _timerStartTime)}`;
    }
    if (_totalTimerStartTime) {
      totalDisplay.textContent = `⏱ ${_formatTime(Date.now() - _totalTimerStartTime)}`;
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
  const display = document.getElementById('gemini-timer-display');
  const totalDisplay = document.getElementById('gemini-total-timer-display');
  if (display) display.textContent = '🖼 00:00';
  if (totalDisplay) totalDisplay.textContent = '⏱ 00:00';
  _timerStartTime = null;
  _totalTimerStartTime = null;
}

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
  // 更新按钮状态
  const btn = document.getElementById('gemini-auto-runner-btn');
  const textarea = document.getElementById('gemini-prompt-input');
  const progressBar = document.getElementById('gemini-progress-fill');
  const progressText = document.getElementById('gemini-progress-text');
  if (btn) {
    if (!window._geminiQueueAbort) {
      btn.innerText = '✅ 队列完成';
      btn.className = 'completed';
      // 3秒后恢复初始状态
      setTimeout(() => {
        btn.innerText = '▶ 启动作图队列';
        btn.className = '';
        resetTimerDisplay();
        if (progressBar) progressBar.style.width = '0%';
        if (progressText) progressText.innerText = '准备就绪: 0 / 0';
      }, 3000);
    } else {
      btn.innerText = '▶ 启动作图队列';
      btn.className = '';
      resetTimerDisplay();
      if (progressBar) progressBar.style.width = '0%';
      if (progressText) progressText.innerText = '准备就绪: 0 / 0';
    }
    btn.disabled = false;
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

  // 创建展开按钮
  const openBtn = document.createElement('button');
  openBtn.id = 'gemini-open-btn';
  openBtn.innerText = '◀ 展开';
  document.body.appendChild(openBtn);

  // ===== 绑定事件 =====

  // 收起/展开
  const collapseBtn = document.getElementById('gemini-collapse-btn');
  collapseBtn.onclick = () => {
    sidebar.style.transform = 'translateX(100%)';
    setTimeout(() => { openBtn.style.display = 'block'; }, 300);
  };
  openBtn.onclick = () => {
    openBtn.style.display = 'none';
    sidebar.style.transform = 'translateX(0)';
  };

  // 启动/停止按钮
  const btn = document.getElementById('gemini-auto-runner-btn');
  const textarea = document.getElementById('gemini-prompt-input');

  btn.onclick = async () => {
    if (window._geminiIsRunning) {
      // ===== 停止队列 =====
      window._geminiQueueAbort = true;
      btn.innerText = '⏳ 正在停止...';
      btn.disabled = true;
      window._geminiAddLog('⏹ 用户请求停止队列...', 'warn');
    } else {
      // ===== 启动队列 =====
      btn.innerText = '⏹ 停止队列';
      btn.className = 'running';
      textarea.disabled = true;
      resetTimerDisplay();

      await runGeminiQueue();
    }
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

  // 随机风格按钮
  const randomBtn = document.getElementById('gemini-random-style-btn');
  randomBtn.onclick = () => {
    if (typeof prompts === 'undefined' || !Array.isArray(prompts) || prompts.length === 0) {
      window._geminiAddLog('❌ 未找到预设风格数据', 'error');
      return;
    }
    // 使用选中的风格，未选则使用全部
    let pool;
    if (selectedStyles.size > 0) {
      pool = [...selectedStyles].map(idx => prompts[idx]);
    } else {
      pool = [...prompts];
    }
    // Fisher-Yates 随机取 5 个（或 pool 长度）
    const count = Math.min(5, pool.length);
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    const picked = shuffled.slice(0, count);
    textarea.value = picked.map(p => p.prompt).join('\n\n');
    window._geminiAddLog(`🎲 已随机选取 ${picked.length} 个风格: ${picked.map(p => p.style).join(', ')}`, 'info');
  };

  // 初始日志
  window._geminiAddLog('侧边栏已加载，准备就绪', 'info');
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
      if (openBtn) openBtn.style.display = 'none';
    } else {
      sidebar.style.transform = 'translateX(100%)';
      setTimeout(() => { if (openBtn) openBtn.style.display = 'block'; }, 300);
    }
  }
});
