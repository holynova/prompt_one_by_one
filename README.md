<p align="right"><a href="README.en.md">English</a></p>

<p align="center">
  <img src="./assets/readme/hero.svg" width="100%" alt="批量生图插件 Prompt One by One — Gemini / ChatGPT / Grok 批量作图；右侧是侧边栏队列示意：三条提示词（已完成、生成中、排队中）与三分之二的进度条">
</p>

<p align="center">
  <a href="https://xiaosang.cc/prompt-one-by-one/">▶ 项目主页</a>
  ·
  <a href="https://github.com/holynova/prompt_one_by_one/releases/latest">⬇ 最新 Release</a>
  ·
  <a href="https://github.com/holynova/prompt_one_by_one">GitHub 仓库</a>
</p>

Prompt One by One 是一个 Chrome 扩展（Manifest V3）：在 Gemini、ChatGPT、Grok 网页右侧注入一个 340px 侧边栏，把提示词一行一条排成队列，逐条自动发送、等待出图、记录耗时，跑完一整批不用守在电脑前。内置 64 个预设风格，生完的图可一键打包成 ZIP 下载。

> 截图暂无：侧边栏只在 Gemini / ChatGPT / Grok 的线上页面内渲染，无法在离线环境实拍；仓库内也无界面截图。hero 右侧的队列卡为界面示意。

## 功能

- **批量队列**：一行一个提示词，逐条自动发送；支持前缀 / 后缀（自动拼到每条提示词前后）、打乱顺序。
- **暂停 / 继续 / 终止**：运行中随时暂停或终止，暂停后可从断点继续。
- **发送间隔**：可设固定间隔与随机波动（分钟级），以及每隔若干条自动新开对话。
- **实时计时与仪表盘**：每条提示词从发送到出图的耗时，当前 / 总数 / 平均耗时与进度条一目了然。
- **滚动日志**：队列开始、每条发送、出图、暂停、完成等关键事件都带时间戳记录。
- **64 个预设风格**：15 个分组（动画与插画、科幻与奇幻、传统与文化、历史与艺术运动等），多选下拉框按风格筛选，一键载入全部或随机选 5 个。
- **参考图上传**：可上传图片作为参考，配合提示词做图生图。
- **原图归档**：一键提取本页全部原图（去重、取最高分辨率），本地打包成 ZIP 下载，最大 5 并发。
- **防休眠**：运行期间持有唤醒锁，避免电脑休眠打断长队列。
- **三站通用**：Gemini、ChatGPT（含旧域名）、Grok 各有独立的页面适配（输入框、发送按钮、出图检测）。

## 安装

扩展未上架 Chrome 应用店，需手动加载：

1. 下载 [最新 Release](https://github.com/holynova/prompt_one_by_one/releases/latest) 的 zip 并解压
2. 打开 `chrome://extensions/`，开启右上角「开发者模式」
3. 点击「加载已解压的扩展程序」，选择解压后的文件夹
4. 打开 [gemini.google.com](https://gemini.google.com)（或 ChatGPT / Grok），右侧侧边栏会自动出现
5. 点工具栏的扩展图标可切换侧边栏显示 / 隐藏；在其他页面点图标会新开一个 Gemini 页面

打 Release：推送 `v*` 标签后，GitHub Actions 自动打包 zip 并创建 Release（见 `.github/workflows/release.yml`）。

## 隐私

- 不收集、不上传任何个人信息与提示词：提示词由浏览器直接交给当前登录的第三方网站（Gemini / ChatGPT / Grok），不经过开发者服务器。
- 设置与提示词只保存在浏览器本地；无账号系统、无分析 / 广告 SDK、无遥测。
- 权限：`downloads`（保存 ZIP）与主机权限 `*.google.com` / `*.googleusercontent.com`（读取 Gemini 图片资源）；内容脚本仅在 gemini.google.com、chatgpt.com、chat.openai.com、grok.com 注入。
- 完整说明见 `PRIVACY.md`。

## 技术

- Manifest V3：Service Worker（`background.js`）+ 内容脚本（`jszip.min.js`、`prompts.js`、`automation.js`、`sidebar.js` + `sidebar.css`）。
- `sidebar.js` 在页面加载 3 秒后注入侧边栏（340px 宽，可折叠、可拖拽调宽）；`automation.js` 按站点配置（`SITE_CONFIGS`）模拟输入、监听新图、执行队列；`background.js` 负责 ZIP 打包下载与图片 base64 拉取。
- 零构建、零依赖（除打包用的 JSZip 单文件）。

```
manifest.json           MV3 清单：权限、主机权限、四站内容脚本匹配
background.js           Service Worker：图标点击、ZIP 打包下载、图片拉取
sidebar.js              侧边栏界面：队列、仪表盘、日志、风格选择、上传、下载
sidebar.css             侧边栏样式（340px）
automation.js           队列执行：模拟输入、出图监听、间隔、新开对话、唤醒锁
prompts.js              64 条预设风格提示词（15 分组）
jszip.min.js            ZIP 打包（单文件引入）
icon128.png             扩展图标
PRIVACY.md              隐私政策
.github/workflows/      打 tag 自动发 Release
```
