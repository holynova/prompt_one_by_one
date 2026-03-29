/**
 * background.js — Service Worker
 * 负责：监听扩展图标点击，通知 content script 切换侧边栏或跳转到 Gemini 页面
 */

importScripts('jszip.min.js');

chrome.action.onClicked.addListener((tab) => {
  if (tab.id) {
    if (tab.url && tab.url.includes("gemini.google.com")) {
      chrome.tabs.sendMessage(tab.id, { action: 'toggleSidebar' });
    } else {
      chrome.tabs.create({ url: "https://gemini.google.com/app?gemini_sidebar_open=1" });
    }
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'DOWNLOAD_IMAGES') {
    (async () => {
      try {
        const folder = request.folderName || 'gemini_images';
        const zip = new JSZip();
        
        for (let i = 0; i < request.urls.length; i++) {
          const url = request.urls[i];
          const response = await fetch(url);
          const blob = await response.blob();
          zip.file(`image_${Date.now()}_${i}.jpg`, blob);
        }
        
        const base64Content = await zip.generateAsync({type: "base64"});
        chrome.downloads.download({
          url: "data:application/zip;base64," + base64Content,
          filename: `${folder}.zip`,
          saveAs: false
        });
        sendResponse({ status: "done" });
      } catch (err) {
        console.error("ZIP packaging error:", err);
        sendResponse({ status: "error", message: err.toString() });
      }
    })();
    return true;
  }

  if (request.action === 'FETCH_IMAGE_B64') {
    (async () => {
      try {
        const res = await fetch(request.url);
        if (!res.ok) throw new Error("HTTP error: " + res.status);
        const blob = await res.blob();
        
        const reader = new FileReader();
        reader.onloadend = () => {
          const b64 = reader.result.split(',')[1];
          sendResponse({ success: true, data: b64 });
        };
        reader.onerror = () => {
          sendResponse({ success: false, error: 'FileReader error' });
        };
        reader.readAsDataURL(blob);
      } catch (err) {
        sendResponse({ success: false, error: err.toString() });
      }
    })();
    return true;
  }
});
