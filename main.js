// One Click Lock Plugin for Obsidian
// Lock notes in one click to prevent accidental edits

const { Plugin, Notice } = require('obsidian');

module.exports = class LockPropertiesPlugin extends Plugin {

  async onload() {
    console.log('One Click Lock plugin loaded');

    // Add ribbon icon (true One Click)
    this.addRibbonIcon('lock', 'Toggle Lock Note', () => {
      const file = this.app.workspace.getActiveFile();
      if (file) {
        this.toggleLock(file);
      }
    });

    // 监听文件打开
    this.registerEvent(
      this.app.workspace.on('file-open', (file) => {
        if (file) {
          this.checkAndLock();
        }
      })
    );

    // Listen for layout changes (tab switch etc.)
    this.registerEvent(
      this.app.workspace.on('layout-change', () => {
        this.checkAndLock();
      })
    );

    // 监听元数据变化
    this.registerEvent(
      this.app.metadataCache.on('changed', (file) => {
        const activeFile = this.app.workspace.getActiveFile();
        if (activeFile && file.path === activeFile.path) {
          // Delay to wait for DOM update
          setTimeout(() => this.checkAndLock(), 100);
        }
        // Update explorer lock icons for any file change
        setTimeout(() => this.updateExplorerLockIcons(), 150);
      })
    );

    // 注册文件菜单（右上角三点菜单）
    this.registerEvent(
      this.app.workspace.on('file-menu', (menu, file) => {
        if (!file || file.extension !== 'md') return;

        const isLocked = this.isFileLocked(file);

        menu.addItem((item) => {
          item
            .setTitle(isLocked ? 'Unlock Note' : 'Lock Note')
            .setIcon(isLocked ? 'unlock' : 'lock')
            .onClick(() => this.toggleLock(file));
        });
      })
    );

    // 注册命令面板命令
    this.addCommand({
      id: 'toggle-lock',
      name: 'Toggle Lock Note',
      icon: 'lock',
      callback: () => {
        const file = this.app.workspace.getActiveFile();
        if (file) {
          this.toggleLock(file);
        }
      }
    });

    // 初始检查
    setTimeout(() => this.checkAndLock(), 500);

    // 初始化导航栏锁图标（多次延迟检查以确保移动端加载）
    setTimeout(() => this.updateExplorerLockIcons(), 600);
    setTimeout(() => this.updateExplorerLockIcons(), 1500);
    setTimeout(() => this.updateExplorerLockIcons(), 3000);
    setTimeout(() => this.updateExplorerLockIcons(), 5000);
    setTimeout(() => this.updateExplorerLockIcons(), 8000);

    // 监听 workspace ready 事件（移动端可能需要更长时间）
    this.app.workspace.onLayoutReady(() => {
      setTimeout(() => this.updateExplorerLockIcons(), 500);
      setTimeout(() => this.updateExplorerLockIcons(), 2000);
    });

    // 监听 active-leaf-change 事件
    this.registerEvent(
      this.app.workspace.on('active-leaf-change', () => {
        setTimeout(() => this.updateExplorerLockIcons(), 300);
      })
    );

    // Setup MutationObserver to monitor Properties area changes
    this.setupMutationObserver();
  }

  onunload() {
    console.log('One Click Lock plugin unloaded');
    if (this.observer) {
      this.observer.disconnect();
    }
    // Clean up all explorer lock icons
    this.removeAllExplorerLockIcons();
  }

  // Remove all explorer lock icons
  removeAllExplorerLockIcons() {
    const icons = document.querySelectorAll('.explorer-lock-icon');
    icons.forEach(icon => icon.remove());
  }

  // 检查文件是否已锁定
  isFileLocked(file) {
    if (!file) return false;
    const cache = this.app.metadataCache.getFileCache(file);
    return cache?.frontmatter?.locked === true;
  }

  // 切换锁定状态
  async toggleLock(file) {
    if (!file) return;

    const wasLocked = this.isFileLocked(file);

    await this.app.fileManager.processFrontMatter(file, (fm) => {
      if (fm.locked === true) {
        // Unlock: remove locked field
        delete fm.locked;
      } else {
        // Lock: add locked: true
        fm.locked = true;
      }
    });

    // 显示提示（带图标）
    const fragment = document.createDocumentFragment();
    const icon = document.createElement('span');
    icon.style.marginRight = '6px';
    icon.style.display = 'inline-flex';
    icon.style.verticalAlign = 'middle';

    if (wasLocked) {
      // 解锁图标
      icon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 9.9-1"></path></svg>`;
      fragment.appendChild(icon);
      fragment.appendChild(document.createTextNode('Note unlocked'));
    } else {
      // 锁定图标
      icon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>`;
      fragment.appendChild(icon);
      fragment.appendChild(document.createTextNode('Note locked'));
    }

    const notice = new Notice(fragment);

    // Delay check, wait for frontmatter update
    setTimeout(() => this.checkAndLock(), 200);

    // Update explorer lock icons
    setTimeout(() => this.updateExplorerLockIcons(), 300);
  }

  // 检查当前文件是否需要锁定
  checkAndLock() {
    const activeFile = this.app.workspace.getActiveFile();
    if (!activeFile) return;

    const cache = this.app.metadataCache.getFileCache(activeFile);
    const frontmatter = cache?.frontmatter;

    // Check locked: true
    const isLocked = frontmatter?.locked === true;

    // Check if frontmatter only has "locked" property (no other user properties)
    // frontmatter contains 'position' (internal) and user properties
    const userProperties = frontmatter ? Object.keys(frontmatter).filter(k => k !== 'position' && k !== 'locked') : [];
    const hasOnlyLocked = isLocked && userProperties.length === 0;

    if (isLocked) {
      this.lockProperties();
      this.lockTitle();

      // Hide Properties container only if no other properties exist
      if (hasOnlyLocked) {
        this.hideEmptyPropertiesContainer();
      } else {
        // Has other properties, make sure container is visible
        this.showPropertiesContainer();
      }
    } else {
      this.unlockProperties();
      this.unlockTitle();
      this.showPropertiesContainer();
    }
  }

  // Hide Properties container when only locked property exists
  hideEmptyPropertiesContainer() {
    const containers = document.querySelectorAll('.metadata-container');
    containers.forEach(container => {
      container.setAttribute('data-hide-empty', 'true');
    });
  }

  // Show Properties container
  showPropertiesContainer() {
    const containers = document.querySelectorAll('.metadata-container[data-hide-empty="true"]');
    containers.forEach(container => {
      container.removeAttribute('data-hide-empty');
    });
  }

  // Lock Properties area
  lockProperties() {
    const containers = document.querySelectorAll('.metadata-container');

    containers.forEach(container => {
      // 标记为已锁定
      container.setAttribute('data-locked', 'true');

      // 禁用所有输入元素
      this.disableInputs(container);

      // 阻止键盘事件
      if (!container.hasAttribute('data-keydown-blocked')) {
        container.setAttribute('data-keydown-blocked', 'true');
        container.addEventListener('keydown', this.blockKeydown, true);
        container.addEventListener('keypress', this.blockKeydown, true);
        container.addEventListener('beforeinput', this.blockBeforeInput, true);
      }

      // 阻止焦点
      if (!container.hasAttribute('data-focus-blocked')) {
        container.setAttribute('data-focus-blocked', 'true');
        container.addEventListener('focusin', this.handleFocusIn, true);
      }

      // 阻止点击事件
      if (!container.hasAttribute('data-click-blocked')) {
        container.setAttribute('data-click-blocked', 'true');
        container.addEventListener('click', this.blockClick, true);
        container.addEventListener('mousedown', this.blockClick, true);
        container.addEventListener('pointerdown', this.blockClick, true);
      }
    });

    // 全局隐藏建议弹窗
    this.hideSuggestions();
  }

  // Unlock Properties area
  unlockProperties() {
    const containers = document.querySelectorAll('.metadata-container[data-locked="true"]');

    containers.forEach(container => {
      container.removeAttribute('data-locked');

      // 恢复所有输入元素
      this.enableInputs(container);

      // 移除键盘事件监听
      if (container.hasAttribute('data-keydown-blocked')) {
        container.removeAttribute('data-keydown-blocked');
        container.removeEventListener('keydown', this.blockKeydown, true);
        container.removeEventListener('keypress', this.blockKeydown, true);
        container.removeEventListener('beforeinput', this.blockBeforeInput, true);
      }

      // 移除焦点监听
      if (container.hasAttribute('data-focus-blocked')) {
        container.removeAttribute('data-focus-blocked');
        container.removeEventListener('focusin', this.handleFocusIn, true);
      }

      // 移除点击监听
      if (container.hasAttribute('data-click-blocked')) {
        container.removeAttribute('data-click-blocked');
        container.removeEventListener('click', this.blockClick, true);
        container.removeEventListener('mousedown', this.blockClick, true);
        container.removeEventListener('pointerdown', this.blockClick, true);
      }
    });
  }

  // 禁用容器内的所有输入元素
  disableInputs(container) {
    // 禁用所有输入框
    const inputs = container.querySelectorAll('input, textarea, [contenteditable="true"]');
    inputs.forEach(input => {
      if (input.tagName === 'INPUT' || input.tagName === 'TEXTAREA') {
        input.setAttribute('readonly', 'true');
        input.setAttribute('data-lock-readonly', 'true');
        input.style.pointerEvents = 'none';
        input.style.userSelect = 'none';
      } else if (input.getAttribute('contenteditable') === 'true') {
        input.setAttribute('contenteditable', 'false');
        input.setAttribute('data-lock-contenteditable', 'true');
      }
      input.setAttribute('tabindex', '-1');
    });

    // 禁用所有可点击元素（更全面的选择器）
    const clickables = container.querySelectorAll([
      'button',
      '.clickable-icon',
      '.multi-select-pill-remove-button',
      '.metadata-add-button',
      '.multi-select-pill-content',
      '.multi-select-input',
      '.metadata-property-value',
      '.metadata-property-key',
      '.metadata-property',
      '[data-property-key]',
      '.suggestion-container',
      '.metadata-input-longtext',
    ].join(', '));

    clickables.forEach(el => {
      el.style.pointerEvents = 'none';
      el.setAttribute('data-lock-disabled', 'true');
    });

    // 特别处理：隐藏所有删除按钮和添加按钮
    const removeButtons = container.querySelectorAll('.multi-select-pill-remove-button, .metadata-add-button');
    removeButtons.forEach(btn => {
      btn.style.display = 'none';
      btn.setAttribute('data-lock-hidden', 'true');
    });
  }

  // 恢复容器内的所有输入元素
  enableInputs(container) {
    const inputs = container.querySelectorAll('[data-lock-readonly="true"]');
    inputs.forEach(input => {
      input.removeAttribute('readonly');
      input.removeAttribute('data-lock-readonly');
      input.style.pointerEvents = '';
      input.style.userSelect = '';
      input.removeAttribute('tabindex');
    });

    const contentEditables = container.querySelectorAll('[data-lock-contenteditable="true"]');
    contentEditables.forEach(el => {
      el.setAttribute('contenteditable', 'true');
      el.removeAttribute('data-lock-contenteditable');
      el.removeAttribute('tabindex');
    });

    const disabledElements = container.querySelectorAll('[data-lock-disabled="true"]');
    disabledElements.forEach(el => {
      el.style.pointerEvents = '';
      el.removeAttribute('data-lock-disabled');
    });

    // 恢复隐藏的按钮
    const hiddenElements = container.querySelectorAll('[data-lock-hidden="true"]');
    hiddenElements.forEach(el => {
      el.style.display = '';
      el.removeAttribute('data-lock-hidden');
    });
  }

  // 阻止键盘输入
  blockKeydown = (e) => {
    // Allow Tab key
    if (e.key === 'Tab') return;
    // Allow Escape
    if (e.key === 'Escape') return;

    // 阻止其他所有输入
    e.preventDefault();
    e.stopPropagation();
  }

  // Block beforeinput event
  blockBeforeInput = (e) => {
    e.preventDefault();
    e.stopPropagation();
  }

  // 阻止点击事件
  blockClick = (e) => {
    // Allow clicking links (e.g. Tag links)
    const target = e.target;

    // 如果点击的是删除按钮、输入框等，阻止
    if (target.closest('.multi-select-pill-remove-button') ||
      target.closest('.metadata-add-button') ||
      target.closest('input') ||
      target.closest('textarea') ||
      target.closest('.multi-select-input') ||
      target.closest('.metadata-input-longtext')) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    // 如果点击的是属性值区域，也阻止（防止进入编辑模式）
    if (target.closest('.metadata-property-value')) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
  }

  // 隐藏建议弹窗
  hideSuggestions() {
    const suggestions = document.querySelectorAll('.suggestion-container');
    suggestions.forEach(el => {
      el.style.display = 'none';
    });
  }

  // 锁定标题
  lockTitle() {
    const titles = document.querySelectorAll('.inline-title');
    titles.forEach(title => {
      if (title.getAttribute('contenteditable') === 'true') {
        title.setAttribute('contenteditable', 'false');
        title.setAttribute('data-lock-title', 'true');
        title.style.pointerEvents = 'none';
        title.style.userSelect = 'none';
      }

      // 添加锁图标到标题后
      if (!title.querySelector('.title-lock-icon')) {
        const lockIcon = document.createElement('span');
        lockIcon.className = 'title-lock-icon';
        lockIcon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>`;
        title.appendChild(lockIcon);
      }
    });
  }

  // 解锁标题
  unlockTitle() {
    const titles = document.querySelectorAll('[data-lock-title="true"]');
    titles.forEach(title => {
      title.setAttribute('contenteditable', 'true');
      title.removeAttribute('data-lock-title');
      title.style.pointerEvents = '';
      title.style.userSelect = '';

      // 移除锁图标
      const lockIcon = title.querySelector('.title-lock-icon');
      if (lockIcon) {
        lockIcon.remove();
      }
    });
  }

  // 处理焦点进入
  handleFocusIn = (e) => {
    // 立即移除焦点
    if (e.target && typeof e.target.blur === 'function') {
      e.target.blur();
    }
  }

  // Setup MutationObserver to monitor dynamically added elements
  setupMutationObserver() {
    this.observer = new MutationObserver((mutations) => {
      let shouldCheck = false;
      let shouldUpdateExplorer = false;

      for (const mutation of mutations) {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          // Check if input or metadata related elements are added
          for (const node of mutation.addedNodes) {
            if (node.nodeType === Node.ELEMENT_NODE) {
              if (node.matches?.('input, textarea, .metadata-property, .metadata-container') ||
                node.querySelector?.('input, textarea')) {
                shouldCheck = true;
              }
              // Check if file explorer items are added
              if (node.matches?.('[data-path], .nav-file, .nav-file-title, .tree-item') ||
                node.querySelector?.('[data-path]')) {
                shouldUpdateExplorer = true;
              }
            }
          }
        }
      }

      if (shouldCheck) {
        // 重新检查锁定状态
        setTimeout(() => this.checkAndLock(), 50);
      }

      if (shouldUpdateExplorer) {
        // 更新文件导航栏锁图标
        setTimeout(() => this.updateExplorerLockIcons(), 100);
      }
    });

    // 观察整个文档
    this.observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  // 更新文件导航栏的锁图标
  updateExplorerLockIcons() {
    // 获取所有带有 data-path 属性的文件导航项（通用选择器，支持桌面端和移动端）
    // 包括: .nav-file-title, .tree-item-self, 以及任何带 data-path 的元素
    const fileItems = document.querySelectorAll('[data-path$=".md"]');

    fileItems.forEach(item => {
      const filePath = item.getAttribute('data-path');
      if (!filePath) return;

      // 获取文件
      const file = this.app.vault.getAbstractFileByPath(filePath);
      if (!file) return;

      // 检查是否锁定
      const cache = this.app.metadataCache.getFileCache(file);
      const isLocked = cache?.frontmatter?.locked === true;

      // 获取或创建锁图标
      let lockIcon = item.querySelector('.explorer-lock-icon');

      if (isLocked) {
        if (!lockIcon) {
          // 创建锁图标
          lockIcon = document.createElement('span');
          lockIcon.className = 'explorer-lock-icon';
          lockIcon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>`;
          item.appendChild(lockIcon);
        }
      } else {
        // 移除锁图标
        if (lockIcon) {
          lockIcon.remove();
        }
      }
    });
  }
};
