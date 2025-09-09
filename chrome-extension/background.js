// Service Worker for Learning Buddy Chrome Extension

// Extension installation and updates
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('学习搭子插件已安装');
    // Set default settings
    chrome.storage.local.set({
      sidebarEnabled: false,
      sidebarWidth: 20, // Default 20% width
      sitePreferences: {}
    });
  } else if (details.reason === 'update') {
    console.log('学习搭子插件已更新');
  }
});

// Handle extension icon click
chrome.action.onClicked.addListener(async (tab) => {
  try {
    // Get current sidebar state
    const result = await chrome.storage.local.get(['sidebarEnabled']);
    const isEnabled = result.sidebarEnabled || false;
    
    // Toggle sidebar state
    await chrome.storage.local.set({ sidebarEnabled: !isEnabled });
    
    // Send message to content script to toggle sidebar
    chrome.tabs.sendMessage(tab.id, { 
      action: 'toggleSidebar', 
      enabled: !isEnabled 
    }).catch(error => {
      console.log('Content script not ready:', error);
    });
    
    // Update icon badge
    chrome.action.setBadgeText({
      tabId: tab.id,
      text: !isEnabled ? 'ON' : ''
    });
    
    chrome.action.setBadgeBackgroundColor({
      tabId: tab.id,
      color: !isEnabled ? '#4CAF50' : '#FF0000'
    });
    
  } catch (error) {
    console.error('Error toggling sidebar:', error);
  }
});

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.action) {
    case 'getSidebarState':
      chrome.storage.local.get(['sidebarEnabled', 'sidebarWidth']).then(result => {
        sendResponse({
          enabled: result.sidebarEnabled || false,
          width: result.sidebarWidth || 20
        });
      });
      return true; // Keep message channel open for async response
      
    case 'updateSidebarWidth':
      chrome.storage.local.set({ sidebarWidth: message.width }).then(() => {
        sendResponse({ success: true });
      });
      return true;
      
    case 'saveSitePreference':
      chrome.storage.local.get(['sitePreferences']).then(result => {
        const preferences = result.sitePreferences || {};
        preferences[message.hostname] = {
          enabled: message.enabled,
          width: message.width
        };
        chrome.storage.local.set({ sitePreferences: preferences }).then(() => {
          sendResponse({ success: true });
        });
      });
      return true;
      
    default:
      sendResponse({ error: 'Unknown action' });
  }
});

// Update badge when tab changes
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const result = await chrome.storage.local.get(['sidebarEnabled']);
    const isEnabled = result.sidebarEnabled || false;
    
    chrome.action.setBadgeText({
      tabId: activeInfo.tabId,
      text: isEnabled ? 'ON' : ''
    });
  } catch (error) {
    console.error('Error updating badge:', error);
  }
});

// Handle tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    // Reset badge for new page loads
    chrome.storage.local.get(['sidebarEnabled']).then(result => {
      const isEnabled = result.sidebarEnabled || false;
      chrome.action.setBadgeText({
        tabId: tabId,
        text: isEnabled ? 'ON' : ''
      });
    });
  }
});