/**
 * background.js — Service Worker
 * 负责：监听扩展图标点击，通知 content script 切换侧边栏
 */

chrome.action.onClicked.addListener((tab) => {
  if (tab.id) {
    chrome.tabs.sendMessage(tab.id, { action: 'toggleSidebar' });
  }
});
