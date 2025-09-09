// Content script for Learning Buddy Chrome Extension
// Injects sidebar into web pages

class LearningBuddySidebar {
  constructor() {
    this.isActive = false;
    this.currentWidth = 20; // Default 20%
    this.minWidth = 15;     // Minimum 15%
    this.maxWidth = 45;     // Maximum 45%
    this.sidebar = null;
    this.resizeHandle = null;
    this.iframe = null;
    this.isResizing = false;
    
    this.init();
  }

  async init() {
    // Avoid injecting on extension pages and special pages
    if (window.location.protocol === 'chrome-extension:' || 
        window.location.protocol === 'chrome:' ||
        window.location.protocol === 'moz-extension:') {
      return;
    }

    // Get initial state from storage
    try {
      const response = await chrome.runtime.sendMessage({ action: 'getSidebarState' });
      this.isActive = response.enabled;
      this.currentWidth = response.width || 20;
      
      if (this.isActive) {
        this.createSidebar();
      }
    } catch (error) {
      console.error('Failed to get initial sidebar state:', error);
    }

    // Listen for messages from background script
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      switch (message.action) {
        case 'toggleSidebar':
          if (message.enabled) {
            this.showSidebar();
          } else {
            this.hideSidebar();
          }
          sendResponse({ success: true });
          break;
        default:
          sendResponse({ error: 'Unknown action' });
      }
    });
  }

  createSidebar() {
    if (this.sidebar) return; // Already created

    // Create main sidebar container
    this.sidebar = document.createElement('div');
    this.sidebar.id = 'learning-buddy-sidebar';
    this.sidebar.className = 'learning-buddy-sidebar';
    
    // Create resize handle
    this.resizeHandle = document.createElement('div');
    this.resizeHandle.className = 'learning-buddy-resize-handle';
    this.resizeHandle.title = '拖拽调整宽度';
    
    // Create close button
    const closeButton = document.createElement('div');
    closeButton.className = 'learning-buddy-close-btn';
    closeButton.innerHTML = '×';
    closeButton.title = '关闭侧边栏';
    closeButton.addEventListener('click', () => {
      this.hideSidebar();
      // Update background script state
      chrome.runtime.sendMessage({ action: 'toggleSidebar', enabled: false });
    });

    // Create header
    const header = document.createElement('div');
    header.className = 'learning-buddy-header';
    header.innerHTML = `
      <div class="learning-buddy-title">
        <img src="${chrome.runtime.getURL('icons/icon16.png')}" alt="Learning Buddy">
        学习搭子
      </div>
    `;
    header.appendChild(closeButton);

    // Create iframe container
    const iframeContainer = document.createElement('div');
    iframeContainer.className = 'learning-buddy-iframe-container';

    // Create iframe
    this.iframe = document.createElement('iframe');
    this.iframe.src = 'https://your-study-buddy.onrender.com';
    this.iframe.className = 'learning-buddy-iframe';
    this.iframe.title = 'Learning Buddy Application';

    // Handle iframe load errors
    this.iframe.addEventListener('error', () => {
      iframeContainer.innerHTML = `
        <div class="learning-buddy-error">
          <h3>连接失败</h3>
          <p>无法连接到学习搭子服务</p>
          <p>请检查网络连接或稍后再试</p>
          <button onclick="location.reload()">重新加载</button>
        </div>
      `;
    });

    // Assemble sidebar
    iframeContainer.appendChild(this.iframe);
    this.sidebar.appendChild(this.resizeHandle);
    this.sidebar.appendChild(header);
    this.sidebar.appendChild(iframeContainer);

    // Add to page
    document.body.appendChild(this.sidebar);

    // Setup resize functionality
    this.setupResize();
    
    // Apply initial width
    this.updateLayout();
  }

  setupResize() {
    if (!this.resizeHandle) return;

    let startX, startWidth;

    const startResize = (e) => {
      this.isResizing = true;
      startX = e.clientX;
      startWidth = this.currentWidth;
      
      document.addEventListener('mousemove', doResize);
      document.addEventListener('mouseup', stopResize);
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'col-resize';
      
      e.preventDefault();
    };

    const doResize = (e) => {
      if (!this.isResizing) return;
      
      const deltaX = startX - e.clientX;
      const containerWidth = window.innerWidth;
      const deltaPercent = (deltaX / containerWidth) * 100;
      
      let newWidth = startWidth + deltaPercent;
      
      // Constrain width
      newWidth = Math.max(this.minWidth, Math.min(this.maxWidth, newWidth));
      
      this.currentWidth = newWidth;
      this.updateLayout();
    };

    const stopResize = () => {
      this.isResizing = false;
      document.removeEventListener('mousemove', doResize);
      document.removeEventListener('mouseup', stopResize);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';

      // Save width to storage
      chrome.runtime.sendMessage({
        action: 'updateSidebarWidth',
        width: this.currentWidth
      });
    };

    this.resizeHandle.addEventListener('mousedown', startResize);
  }

  updateLayout() {
    if (!this.sidebar) return;

    const widthPercent = this.currentWidth;
    
    // Update sidebar width
    this.sidebar.style.width = `${widthPercent}%`;
    
    // Update body margin to push content left
    document.body.style.marginRight = `${widthPercent}%`;
    document.body.style.transition = this.isResizing ? 'none' : 'margin-right 0.3s ease';
    
    // Add class to body for CSS targeting
    document.body.classList.add('learning-buddy-active');
  }

  showSidebar() {
    if (!this.sidebar) {
      this.createSidebar();
    }
    
    this.isActive = true;
    this.sidebar.classList.add('learning-buddy-visible');
    this.updateLayout();
  }

  hideSidebar() {
    if (!this.sidebar) return;
    
    this.isActive = false;
    this.sidebar.classList.remove('learning-buddy-visible');
    
    // Reset body margin
    document.body.style.marginRight = '0';
    document.body.classList.remove('learning-buddy-active');
    
    // Remove sidebar from DOM after transition
    setTimeout(() => {
      if (this.sidebar && !this.isActive) {
        this.sidebar.remove();
        this.sidebar = null;
        this.resizeHandle = null;
        this.iframe = null;
      }
    }, 300);
  }

  // Handle window resize
  handleWindowResize = () => {
    if (this.isActive && this.sidebar) {
      this.updateLayout();
    }
  };
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new LearningBuddySidebar();
  });
} else {
  new LearningBuddySidebar();
}

// Handle window resize
window.addEventListener('resize', () => {
  if (window.learningBuddySidebar) {
    window.learningBuddySidebar.handleWindowResize();
  }
});

// Prevent multiple instances
if (!window.learningBuddySidebar) {
  window.learningBuddySidebar = new LearningBuddySidebar();
}