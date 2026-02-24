# Gemini 批量生图插件 / Gemini Batch Image Generator

一个 Chrome 插件，可以在 [Gemini](https://gemini.google.com) 网页上自动批量执行作图提示词。

A Chrome extension that automatically runs batch image generation prompts on [Gemini](https://gemini.google.com).

## ✨ 功能 / Features

- **批量队列** — 一行一个提示词，自动逐条发送  
  *Batch queue — one prompt per line, sent automatically one by one*

- **前缀 / 后缀** — 统一添加到每条提示词，避免重复输入  
  *Prefix / Suffix — automatically prepended & appended to every prompt*

- **停止队列** — 运行中可随时点击停止  
  *Stop queue — click to stop anytime while running*

- **实时计时** — 每条提示词从发送到图片生成的耗时统计  
  *Live timer — tracks elapsed time per prompt until image appears*

- **滚动日志** — 生成过程的关键事件和时间日志  
  *Scrolling log — timestamped events for each generation step*

- **进度条** — 直观显示队列完成进度  
  *Progress bar — visual progress of the queue*

- **Gemini 快捷链接** — 一键打开新的 Gemini 页面  
  *Quick link — open a new Gemini page in one click*

## 📦 安装 / Install

1. 下载 [最新 Release](https://github.com/holynova/prompt_one_by_one/releases/latest) 并解压  
   *Download the [latest Release](https://github.com/holynova/prompt_one_by_one/releases/latest) and unzip*

2. 打开 `chrome://extensions/`，开启「开发者模式」  
   *Open `chrome://extensions/` and enable "Developer mode"*

3. 点击「加载已解压的扩展程序」，选择解压后的文件夹  
   *Click "Load unpacked" and select the unzipped folder*

4. 打开 [gemini.google.com](https://gemini.google.com)，右侧侧边栏会自动出现  
   *Open [gemini.google.com](https://gemini.google.com), the sidebar will appear on the right*

## 📄 License

MIT
