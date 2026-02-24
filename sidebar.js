/**
 * sidebar.js — 侧边栏 UI 注入与事件处理
 * 负责：注入侧边栏 HTML、绑定按钮事件、日志面板、计时器
 */

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

  <div class="gemini-label" style="display:flex;justify-content:space-between;align-items:center;">提示词列表（一行一个）<button id="gemini-random-style-btn" class="gemini-link-btn" title="从预设风格中随机选取5个">🎲 随机风格</button></div>
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
      <span id="gemini-timer-display">00:00</span>
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
let _timerStartTime = null;

function startTimer() {
  _timerStartTime = Date.now();
  const display = document.getElementById('gemini-timer-display');
  if (_timerInterval) clearInterval(_timerInterval);
  _timerInterval = setInterval(() => {
    if (!_timerStartTime) return;
    const elapsed = Date.now() - _timerStartTime;
    const totalSec = Math.floor(elapsed / 1000);
    const min = String(Math.floor(totalSec / 60)).padStart(2, '0');
    const sec = String(totalSec % 60).padStart(2, '0');
    display.textContent = `${min}:${sec}`;
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
  if (display) display.textContent = '00:00';
  _timerStartTime = null;
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
  if (btn) {
    if (!window._geminiQueueAbort) {
      btn.innerText = '✅ 队列完成';
      btn.className = 'completed';
    } else {
      btn.innerText = '▶ 启动作图队列';
      btn.className = '';
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

  // 随机风格按钮
  const randomBtn = document.getElementById('gemini-random-style-btn');
  randomBtn.onclick = () => {
    if (typeof prompts === 'undefined' || !Array.isArray(prompts) || prompts.length === 0) {
      window._geminiAddLog('❌ 未找到预设风格数据', 'error');
      return;
    }
    // Fisher-Yates 随机取 5 个
    const shuffled = [...prompts].sort(() => Math.random() - 0.5);
    const picked = shuffled.slice(0, 5);
    textarea.value = picked.map(p => p.prompt).join('\n');
    window._geminiAddLog(`🎲 已随机选取 ${picked.length} 个风格: ${picked.map(p => p.style).join(', ')}`, 'info');
  };

  // 初始日志
  window._geminiAddLog('侧边栏已加载，准备就绪', 'info');
}

// ========== 延迟注入 ==========
setTimeout(injectControlUI, 3000);
