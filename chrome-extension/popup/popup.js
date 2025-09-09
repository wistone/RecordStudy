// Popup script for Learning Buddy Chrome Extension

class PopupController {
  constructor() {
    this.isEnabled = false;
    this.currentWidth = 20;
    this.currentTab = null;
    
    this.init();
  }

  async init() {
    try {
      // Get current tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      this.currentTab = tab;

      // Get current state
      await this.loadState();
      
      // Setup event listeners
      this.setupEventListeners();
      
      // Show controls
      document.getElementById('loading').style.display = 'none';
      document.getElementById('controls').style.display = 'block';
      
    } catch (error) {
      this.showError('初始化失败: ' + error.message);
    }
  }

  async loadState() {
    try {
      // Get state from background script
      const response = await chrome.runtime.sendMessage({ action: 'getSidebarState' });
      
      this.isEnabled = response.enabled || false;
      this.currentWidth = response.width || 20;
      
      // Update UI
      this.updateToggleButton();
      this.updateWidthSlider();
      
    } catch (error) {
      console.error('Failed to load state:', error);
      this.showError('无法加载当前状态');
    }
  }

  setupEventListeners() {
    // Toggle button
    const toggleButton = document.getElementById('toggleButton');
    toggleButton.addEventListener('click', () => this.toggleSidebar());

    // Width slider
    const widthSlider = document.getElementById('widthSlider');
    widthSlider.addEventListener('input', (e) => this.updateWidth(parseInt(e.target.value)));
    
    // Help link
    const helpLink = document.getElementById('helpLink');
    helpLink.addEventListener('click', (e) => {
      e.preventDefault();
      this.showHelp();
    });
  }

  async toggleSidebar() {
    try {
      const newState = !this.isEnabled;
      
      // Update background script state
      await chrome.storage.local.set({ sidebarEnabled: newState });
      
      // Send message to content script
      if (this.currentTab) {
        try {
          await chrome.tabs.sendMessage(this.currentTab.id, { 
            action: 'toggleSidebar', 
            enabled: newState 
          });
        } catch (error) {
          // Content script might not be ready, that's ok
          console.log('Content script not ready:', error);
        }

        // Update extension badge
        chrome.action.setBadgeText({
          tabId: this.currentTab.id,
          text: newState ? 'ON' : ''
        });
        
        chrome.action.setBadgeBackgroundColor({
          tabId: this.currentTab.id,
          color: newState ? '#4CAF50' : '#FF0000'
        });
      }
      
      this.isEnabled = newState;
      this.updateToggleButton();
      
      // Show success message
      this.showTempMessage(newState ? '侧边栏已开启' : '侧边栏已关闭', 'success');
      
    } catch (error) {
      console.error('Toggle failed:', error);
      this.showError('切换失败: ' + error.message);
    }
  }

  async updateWidth(newWidth) {
    try {
      this.currentWidth = newWidth;
      
      // Update storage
      await chrome.runtime.sendMessage({
        action: 'updateSidebarWidth',
        width: newWidth
      });
      
      // Update UI
      this.updateWidthSlider();
      
      // If sidebar is enabled, update content script
      if (this.isEnabled && this.currentTab) {
        try {
          await chrome.tabs.sendMessage(this.currentTab.id, {
            action: 'updateWidth',
            width: newWidth
          });
        } catch (error) {
          console.log('Content script not ready for width update:', error);
        }
      }
      
    } catch (error) {
      console.error('Width update failed:', error);
      this.showError('宽度更新失败');
    }
  }

  updateToggleButton() {
    const button = document.getElementById('toggleButton');
    const icon = document.getElementById('toggleIcon');
    const text = document.getElementById('toggleText');
    const status = document.getElementById('status');
    
    if (this.isEnabled) {
      button.classList.add('active');
      icon.textContent = '⏸';
      text.textContent = '关闭侧边栏';
      status.textContent = '侧边栏已开启';
      status.className = 'status enabled';
    } else {
      button.classList.remove('active');
      icon.textContent = '▶';
      text.textContent = '开启侧边栏';
      status.textContent = '侧边栏已关闭';
      status.className = 'status disabled';
    }
  }

  updateWidthSlider() {
    const slider = document.getElementById('widthSlider');
    const valueDisplay = document.getElementById('widthValue');
    
    slider.value = this.currentWidth;
    valueDisplay.textContent = this.currentWidth + '%';
  }

  showError(message) {
    const errorDiv = document.getElementById('error');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    
    // Hide after 5 seconds
    setTimeout(() => {
      errorDiv.style.display = 'none';
    }, 5000);
  }

  showTempMessage(message, type = 'info') {
    const status = document.getElementById('status');
    const originalText = status.textContent;
    const originalClass = status.className;
    
    status.textContent = message;
    status.className = `status ${type === 'success' ? 'enabled' : 'disabled'}`;
    
    // Restore after 2 seconds
    setTimeout(() => {
      status.textContent = originalText;
      status.className = originalClass;
    }, 2000);
  }

  showHelp() {
    alert(`学习搭子 Chrome 扩展使用说明:

🔧 基本功能:
• 点击扩展图标或使用此面板开启/关闭侧边栏
• 拖拽侧边栏左边缘可调整宽度 (15%-45%)
• 侧边栏会自动适配当前网站内容

⚙️ 使用技巧:
• 侧边栏在所有网站上都能正常工作
• 支持深色模式和高对比度显示
• 宽度设置会自动保存
• 点击侧边栏右上角 × 可快速关闭

🌐 更多功能:
• 访问完整版网站获得更多功能
• 支持学习记录、进度追踪、数据分析等

❓ 问题反馈:
如有问题，请访问项目主页或联系开发者`);
  }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new PopupController();
});