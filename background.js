/**
 * background.js — Service Worker
 * 负责：监听扩展图标点击，通知 content script 切换侧边栏或跳转到 Gemini 页面
 */

chrome.action.onClicked.addListener((tab) => {
  if (tab.id) {
    if (tab.url && tab.url.includes("gemini.google.com")) {
      chrome.tabs.sendMessage(tab.id, { action: 'toggleSidebar' });
    } else {
      chrome.tabs.create({ url: "https://gemini.google.com/app" });
    }
  }
});
