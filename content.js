/**
 * 核心内容脚本 (Content Script)
 * 注入到 Gemini 网页中运行
 */

async function runGeminiAutomationTest() {
    console.log("%c[Gemini 自动化测试]%c 脚本开始启动...", "color: #4CAF50; font-weight: bold;", "");

    // --- 配置区域 ---
    // 【修改点 1】：动态获取页面上输入框中的提示词，按行分割并过滤空行
    const rawPrompts = document.getElementById('gemini-prompt-input').value;
    const prompts = rawPrompts.split('\n').map(p => p.trim()).filter(p => p !== '');
    
    if (prompts.length === 0) {
        alert("请先在面板中输入至少一个提示词！");
        return;
    }

    // 获取进度条 DOM
    const progressBar = document.getElementById('gemini-progress-fill');
    const progressText = document.getElementById('gemini-progress-text');
    
    progressBar.style.width = '0%';
    progressText.innerText = `准备就绪: 0 / ${prompts.length}`;

    const minDelay = 5000;
    const maxDelay = 15000;
    const timeoutMs = 60000;
    
    const inputSelector = 'div[contenteditable="true"], textarea';
    const sendButtonSelector = 'button[aria-label*="发送"], button[aria-label*="Send"], .send-button-class'; 
    // --- 结束配置 ---

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

    async function executeInput(promptText) {
        console.log("[步骤 1] 正在寻找输入框...");
        let inputBox = document.querySelector(inputSelector);
        
        if (!inputBox) {
            console.error("❌ 未找到输入框！请检查 inputSelector 是否准确匹配了当前页面的元素。");
            return false;
        }
        
        console.log("✅ 找到输入框:", inputBox);
        console.log(`[步骤 2] 准备填入 Prompt: "${promptText}"`);
        
        simulateInput(inputBox, promptText);
        await sleep(500);

        console.log("[步骤 3] 寻找发送按钮...");
        let sendBtn = document.querySelector(sendButtonSelector);
        
        if (sendBtn) {
            console.log("✅ 找到发送按钮，模拟点击。");
            sendBtn.click();
        } else {
            console.warn("⚠️ 未找到明确的发送按钮，尝试在输入框中模拟按下回车键发送...");
            const enterEvent = new KeyboardEvent('keydown', {
                key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true, cancelable: true
            });
            inputBox.dispatchEvent(enterEvent);
        }
        return true;
    }

    function startObserver() {
        return new Promise((resolve) => {
            console.log(`[步骤 4] 开启 MutationObserver，等待生成结果 (超时时间: ${timeoutMs / 1000}秒)...`);
            
            const targetNode = document.body;
            const config = { childList: true, subtree: true, characterData: true };

            let isGenerating = true; 
            let checkTimeout;

            const callback = function(mutationsList, observer) {
                if (!isGenerating) return;

                for (let mutation of mutationsList) {
                    if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                        mutation.addedNodes.forEach(node => {
                            if (node.nodeType === Node.ELEMENT_NODE) {
                                const images = node.querySelectorAll ? node.querySelectorAll('img') : [];
                                const generatedImages = Array.from(images).filter(img => img.src && !img.src.includes('avatar'));

                                if (generatedImages.length > 0) {
                                    console.log("%c🎉 [检测结果] 疑似检测到图片生成成功！", "color: #00BCD4; font-weight: bold; font-size: 14px;");
                                    isGenerating = false;
                                    observer.disconnect();
                                    clearTimeout(checkTimeout);
                                    resolve('success');
                                    return;
                                }
                                
                                const textContent = node.textContent || "";
                                if (textContent.includes("无法生成") || textContent.includes("请重试") || textContent.includes("安全限制")) {
                                    console.log("%c❌ [检测结果] 疑似检测到生成失败或被拦截。", "color: #F44336; font-weight: bold; font-size: 14px;");
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
                    console.log(`%c⏳ [检测结果] 监听超时 (${timeoutMs / 1000}秒)，未检测到明确结果。`, "color: #FF9800; font-weight: bold; font-size: 14px;");
                    isGenerating = false;
                    observer.disconnect();
                    resolve('timeout');
                }
            }, timeoutMs);
        });
    }

    console.log(`%c[任务队列] 共发现 ${prompts.length} 个作图任务。`, "color: #9C27B0; font-weight: bold;");
    
    for (let i = 0; i < prompts.length; i++) {
        const currentPrompt = prompts[i];
        console.log(`\n%c>>> 开始执行第 ${i + 1}/${prompts.length} 个任务 <<<`, "color: #2196F3; font-weight: bold; font-size: 14px;");
        
        // 更新进度条
        progressBar.style.width = `${(i / prompts.length) * 100}%`;
        progressText.innerText = `正在执行: ${i + 1} / ${prompts.length}`;

        const inputSuccess = await executeInput(currentPrompt);
        
        if (inputSuccess) {
            await sleep(1000); 
            const result = await startObserver(); 
            console.log(`任务 ${i + 1} 结束，状态: ${result}`);
        } else {
            console.log(`第 ${i + 1} 个任务输入失败，跳过。`);
        }

        if (i < prompts.length - 1) {
            const delay = Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;
            console.log(`%c[队列等待] 休息一下，随机延迟 ${(delay / 1000).toFixed(1)} 秒后执行下一个任务...`, "color: #E91E63; font-weight: bold;");
            
            // 等待时更新进度条提示
            progressText.innerText = `冷却中... ${i + 1} / ${prompts.length} (等待 ${(delay / 1000).toFixed(1)}s)`;
            
            await sleep(delay);
        }
    }
    
    // 完成时满进度
    progressBar.style.width = '100%';
    progressText.innerText = `队列完成: ${prompts.length} / ${prompts.length}`;

    console.log("%c🎉 [自动化测试结束] 所有任务已执行完毕！", "color: #4CAF50; font-weight: bold; font-size: 16px;");
}

// === 插件特有逻辑：注入控制面板 ===
// 【修改点】：将原先的悬浮小面板改为右侧侧边栏，并增加进度条 UI 和收起功能
function injectControlUI() {
    // 检查是否已经注入过，防止重复注入
    if (document.getElementById('gemini-auto-sidebar')) return;

    // 1. 创建侧边栏外层容器
    const sidebar = document.createElement('div');
    sidebar.id = 'gemini-auto-sidebar';
    sidebar.style.cssText = `
        position: fixed;
        top: 0;
        right: 0;
        height: 100vh;
        width: 320px;
        background-color: #ffffff;
        border-left: 1px solid #ddd;
        box-shadow: -4px 0 15px rgba(0,0,0,0.1);
        z-index: 999999;
        display: flex;
        flex-direction: column;
        padding: 20px;
        box-sizing: border-box;
        font-family: sans-serif;
        transition: transform 0.3s ease;
        transform: translateX(0); /* 默认展开状态 */
    `;

    // 2. 创建标题和收起按钮
    const header = document.createElement('div');
    header.style.cssText = "display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;";
    
    const title = document.createElement('div');
    title.innerText = "🛠️ 批量作图队列";
    title.style.cssText = "font-weight: bold; font-size: 18px; color: #333;";
    
    const closeBtn = document.createElement('button');
    closeBtn.innerText = "▶ 收起";
    closeBtn.style.cssText = "border: none; background: none; cursor: pointer; color: #666; font-size: 14px; padding: 5px;";
    
    header.appendChild(title);
    header.appendChild(closeBtn);
    sidebar.appendChild(header);

    // 3. 创建多行文本输入框 (利用换行切分 prompt)
    const textarea = document.createElement('textarea');
    textarea.id = 'gemini-prompt-input';
    textarea.placeholder = "在此处粘贴提示词，一行一个...\n例如：\n第一张图的提示词\n第二张图的提示词";
    textarea.style.cssText = `
        width: 100%;
        flex-grow: 1; /* 自动占据中间的剩余高度 */
        min-height: 200px;
        padding: 10px;
        border: 1px solid #ccc;
        border-radius: 6px;
        resize: none;
        box-sizing: border-box;
        font-size: 14px;
        line-height: 1.5;
        margin-bottom: 15px;
    `;
    textarea.value = "下雨天的东方明珠, 浮世绘风格\n下雨天的东方明珠, 点彩派绘画风格\n下雨天的东方明珠, 印象主义风格";
    sidebar.appendChild(textarea);

    // 4. 创建进度条区域
    const progressContainer = document.createElement('div');
    progressContainer.style.cssText = "margin-bottom: 15px;";
    
    const progressBg = document.createElement('div');
    progressBg.style.cssText = "width: 100%; height: 12px; background-color: #e0e0e0; border-radius: 6px; overflow: hidden;";
    
    const progressFill = document.createElement('div');
    progressFill.id = 'gemini-progress-fill';
    progressFill.style.cssText = "width: 0%; height: 100%; background-color: #4CAF50; transition: width 0.3s ease;";
    
    const progressText = document.createElement('div');
    progressText.id = 'gemini-progress-text';
    progressText.innerText = "准备就绪: 0 / 0";
    progressText.style.cssText = "text-align: center; font-size: 12px; color: #666; margin-top: 6px;";

    progressBg.appendChild(progressFill);
    progressContainer.appendChild(progressBg);
    progressContainer.appendChild(progressText);
    sidebar.appendChild(progressContainer);

    // 5. 创建启动按钮
    const btn = document.createElement('button');
    btn.id = 'gemini-auto-runner-btn';
    btn.innerText = "▶ 启动作图队列";
    
    btn.style.cssText = `
        width: 100%;
        padding: 14px 0;
        background-color: #4CAF50;
        color: white;
        border: none;
        border-radius: 6px;
        font-size: 16px;
        font-weight: bold;
        cursor: pointer;
        transition: all 0.3s ease;
        flex-shrink: 0;
    `;

    btn.onmouseover = () => { if (!btn.disabled) btn.style.backgroundColor = '#45a049'; };
    btn.onmouseout = () => { if (!btn.disabled) btn.style.backgroundColor = '#4CAF50'; };

    // 点击事件：触发核心逻辑，并锁定面板防止重复点击
    btn.onclick = async () => {
        btn.innerText = "⏳ 队列执行中...";
        btn.style.backgroundColor = '#FF9800'; // 变橙色
        btn.disabled = true;
        btn.style.cursor = 'not-allowed';
        textarea.disabled = true; // 运行时禁止修改提示词

        await runGeminiAutomationTest(); // 执行你的原版代码

        btn.innerText = "✅ 队列完成 (请刷新页面重试)";
        btn.style.backgroundColor = '#9E9E9E'; // 变灰色
    };

    sidebar.appendChild(btn);
    document.body.appendChild(sidebar);

    // 6. 创建“展开”按钮 (当侧边栏收起时显示在右侧)
    const openBtn = document.createElement('button');
    openBtn.innerText = "◀ 展开自动作图";
    openBtn.style.cssText = `
        position: fixed;
        top: 50%;
        right: 0;
        transform: translateY(-50%);
        padding: 12px 16px;
        background-color: #4CAF50;
        color: white;
        border: none;
        border-radius: 8px 0 0 8px;
        cursor: pointer;
        z-index: 999998;
        font-weight: bold;
        font-size: 14px;
        box-shadow: -2px 0 8px rgba(0,0,0,0.15);
        display: none; /* 默认隐藏，收起侧边栏时才显示 */
        transition: background-color 0.3s;
    `;
    openBtn.onmouseover = () => openBtn.style.backgroundColor = '#45a049';
    openBtn.onmouseout = () => openBtn.style.backgroundColor = '#4CAF50';
    document.body.appendChild(openBtn);

    // 绑定收起/展开的点击动画逻辑
    closeBtn.onclick = () => {
        sidebar.style.transform = 'translateX(100%)'; // 滑出屏幕
        setTimeout(() => { openBtn.style.display = 'block'; }, 300); // 动画结束后显示展开按钮
    };
    
    openBtn.onclick = () => {
        openBtn.style.display = 'none'; // 隐藏展开按钮
        sidebar.style.transform = 'translateX(0)'; // 滑入屏幕
    };
}

// 页面加载完成后，稍微延迟 3 秒再注入按钮，确保 Gemini 的 DOM 已经加载得差不多了
setTimeout(injectControlUI, 3000);
