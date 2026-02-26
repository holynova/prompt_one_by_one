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

  <div class="gemini-tabs">
    <button class="gemini-tab active" data-tab="text">📝 文本生图</button>
    <button class="gemini-tab" data-tab="image">🖼 图片转换</button>
  </div>

  <!-- ===== Tab 1: 文本生图 ===== -->
  <div class="gemini-tab-content active" id="gemini-tab-text">
    <div class="gemini-label">前缀（自动添加到每条提示词前）</div>
    <input type="text" id="gemini-prefix-input" class="gemini-input-field" placeholder="例如：请帮我生成一张" value="生成图片" />

    <div class="gemini-label" style="display:flex;justify-content:space-between;align-items:center;">提示词列表（一行一个）<div style="display:flex;align-items:center;gap:4px;"><div id="gemini-style-select-wrapper" class="gemini-style-select-wrapper"><button id="gemini-style-select-btn" class="gemini-link-btn" title="选择风格范围">🏷️ 选择风格 <span id="gemini-style-count"></span></button><div id="gemini-style-dropdown" class="gemini-style-dropdown" style="display:none;"><input type="text" id="gemini-style-search" class="gemini-style-search" placeholder="搜索风格..." /><div id="gemini-style-options" class="gemini-style-options"></div></div></div><button id="gemini-random-style-btn" class="gemini-link-btn" title="从预设风格中随机选取5个">🎲 随机风格</button></div></div>
    <textarea id="gemini-prompt-input" placeholder="在此粘贴提示词，一行一个...&#10;例如：&#10;下雨天的东方明珠, 浮世绘风格&#10;下雨天的东方明珠, 印象主义风格">下雨天的东方明珠, 浮世绘风格
下雨天的东方明珠, 点彩派绘画风格
下雨天的东方明珠, 印象主义风格</textarea>

    <div class="gemini-label">后缀（自动添加到每条提示词后）</div>
    <input type="text" id="gemini-suffix-input" class="gemini-input-field" placeholder="例如：高清, 8K" value="4K高清, 比例1:1" />

    <button id="gemini-auto-runner-btn">▶ 启动作图队列</button>
  </div>

  <!-- ===== Tab 2: 图片转换 ===== -->
  <div class="gemini-tab-content" id="gemini-tab-image">
    <div class="gemini-label">选择图片（支持多选）</div>
    <div class="gemini-image-upload-area" id="gemini-image-upload-area">
      <input type="file" id="gemini-image-file-input" multiple accept="image/*" style="display:none;" />
      <button id="gemini-image-select-btn" class="gemini-image-select-btn">📂 选择图片文件</button>
      <span id="gemini-image-count" class="gemini-image-count">未选择文件</span>
    </div>

    <div id="gemini-image-preview" class="gemini-image-preview"></div>

    <div class="gemini-label">转换提示词（所有图片共用）</div>
    <textarea id="gemini-image-prompt" class="gemini-image-prompt-textarea" placeholder="例如：将这张图片转换为吉卜力风格">将上面这一张图转成真人照片风格, 照相机拍出来的风格
1. 保持原图的构图, 布局, 尺寸
2. 保持原图中人物的发型, 衣着风格
3. 图中全部人物都要转换
4. 不是绘画风格, 不是动漫风格</textarea>

    <button id="gemini-image-runner-btn">▶ 启动图片转换队列</button>
  </div>

  <div id="gemini-dashboard" class="gemini-dashboard" style="display:none;">
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
    <div class="gemini-progress-bg">
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
  if (currentDisplay) currentDisplay.textContent = '00:00';
  if (totalDisplay) totalDisplay.textContent = '00:00';
  if (progressDisplay) progressDisplay.textContent = '0 / 0';
  _timerStartTime = null;
  _totalTimerStartTime = null;
}

// 更新看板进度
window._updateDashboardProgress = function(current, total) {
  const el = document.getElementById('gemini-dash-progress');
  if (el) el.textContent = `${current} / ${total}`;
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
  const btn = document.getElementById('gemini-auto-runner-btn');
  const imageBtn = document.getElementById('gemini-image-runner-btn');
  const textarea = document.getElementById('gemini-prompt-input');
  const progressBar = document.getElementById('gemini-progress-fill');
  const progressText = document.getElementById('gemini-progress-text');

  const resetAll = () => {
    resetTimerDisplay();
    if (progressBar) progressBar.style.width = '0%';
    if (progressText) progressText.innerText = '准备就绪: 0 / 0';
  };

  // 重置文本队列按钮
  if (btn) {
    if (!window._geminiQueueAbort) {
      btn.innerText = '✅ 队列完成';
      btn.className = 'completed';
      setTimeout(() => {
        btn.innerText = '▶ 启动作图队列';
        btn.className = '';
        btn.style.background = '';
        resetAll();
      }, 3000);
    } else {
      btn.innerText = '▶ 启动作图队列';
      btn.className = '';
      btn.style.background = '';
      resetAll();
    }
    btn.disabled = false;
  }

  // 重置图片队列按钮
  if (imageBtn) {
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
  document.documentElement.classList.add('gemini-sidebar-open');

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

  // ===== 文本生图 启动/停止按钮 =====
  const btn = document.getElementById('gemini-auto-runner-btn');
  const textarea = document.getElementById('gemini-prompt-input');

  btn.onclick = async () => {
    if (window._geminiIsRunning) {
      window._geminiQueueAbort = true;
      btn.innerText = '⏳ 正在停止...';
      btn.disabled = true;
      window._geminiAddLog('⏹ 用户请求停止队列...', 'warn');
    } else {
      btn.innerText = '⏹ 停止队列';
      btn.className = 'running';
      textarea.disabled = true;
      resetTimerDisplay();
      await runGeminiQueue();
    }
  };

  // ===== 图片转换：文件选择 =====
  window._imageQueueFiles = [];
  const fileInput = document.getElementById('gemini-image-file-input');
  const selectBtn = document.getElementById('gemini-image-select-btn');
  const imageCount = document.getElementById('gemini-image-count');
  const imagePreview = document.getElementById('gemini-image-preview');

  selectBtn.onclick = () => fileInput.click();

  fileInput.onchange = () => {
    const files = Array.from(fileInput.files);
    window._imageQueueFiles = files;
    imageCount.textContent = files.length > 0 ? `已选择 ${files.length} 张图片` : '未选择文件';

    // 渲染预览
    imagePreview.innerHTML = '';
    files.forEach((file, idx) => {
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
        // 重新触发渲染
        const dt = new DataTransfer();
        window._imageQueueFiles.forEach(f => dt.items.add(f));
        fileInput.files = dt.files;
        fileInput.dispatchEvent(new Event('change'));
      };

      item.appendChild(img);
      item.appendChild(name);
      item.appendChild(delBtn);
      imagePreview.appendChild(item);
    });
  };

  // ===== 图片转换 启动/停止按钮 =====
  const imageRunBtn = document.getElementById('gemini-image-runner-btn');

  imageRunBtn.onclick = async () => {
    if (window._geminiIsRunning) {
      window._geminiQueueAbort = true;
      imageRunBtn.innerText = '⏳ 正在停止...';
      imageRunBtn.disabled = true;
      window._geminiAddLog('⏹ 用户请求停止队列...', 'warn');
    } else {
      imageRunBtn.innerText = '⏹ 停止队列';
      imageRunBtn.className = 'running';
      resetTimerDisplay();
      await runImageQueue();
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
      document.body.classList.add('gemini-sidebar-open');
      if (openBtn) openBtn.style.display = 'none';
    } else {
      sidebar.style.transform = 'translateX(100%)';
      document.body.classList.remove('gemini-sidebar-open');
      setTimeout(() => { if (openBtn) openBtn.style.display = 'block'; }, 300);
    }
  }
});
