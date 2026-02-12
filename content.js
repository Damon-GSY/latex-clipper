// LaTeX Clipper - Content Script
// 识别并处理 MathJax 和 KaTeX 渲染的公式

// ==================== 配置 ====================
const CONFIG = {
  // 选择器 - 合并为一个数组
  formulaSelectors: [
    '.MathJax', '.MathJax_Display', 'mjx-container',
    '.katex', '.katex-display'
  ],

  // 提取选择器
  extractionSelectors: {
    mathjaxScript: 'script[type*="math/tex"]',
    texAnnotation: 'annotation[encoding="application/x-tex"]',
    annotation: 'annotation'
  },

  // 时序配置 (毫秒)
  initDelay: 500,
  debounceDelay: 300,
  hideButtonDelay: 500,
  notificationDuration: 3000,

  // UI 配置
  buttonOffset: 8,
  viewportPadding: 10,

  // 文本截断长度
  tooltipMaxLength: 100,
  previewMaxLength: 60
};

// ==================== 工具函数 ====================
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

const DEBUG = false;
const log = DEBUG ? console.log.bind(console, '[LaTeX Clipper]') : () => {};

// ==================== 主类 ====================
class LaTeXCopyHelper {
  constructor() {
    this.currentButton = null;
    this.currentFormula = null;
    this.observer = null;
    this.debounceTimer = null;
    this.initialized = false;
    this.init();
  }

  // ==================== 初始化 ====================
  async init() {
    log('插件已加载');

    // 等待 DOM 就绪
    await this.waitForReady();

    // 绑定事件和观察者
    this.attachListeners();
    this.observeDOM();

    // 监听窗口大小变化
    window.addEventListener('resize', () => {
      if (this.currentButton && this.currentFormula) {
        this.updateButtonPosition(this.currentFormula);
      }
    });

    this.initialized = true;
    log('初始化完成');
  }

  // 统一的就绪等待
  async waitForReady() {
    const { initDelay } = CONFIG;

    // 基础延迟，等待公式渲染
    const baseDelay = delay(initDelay);

    // DOM 就绪
    const domReady = document.readyState === 'loading'
      ? new Promise(resolve => document.addEventListener('DOMContentLoaded', resolve))
      : Promise.resolve();

    // MathJax 就绪（如果存在）
    const mathjaxReady = window.MathJax?.startup?.promise
      ?.catch(() => log('MathJax promise failed, continuing anyway'))
      || Promise.resolve();

    // 等待所有条件
    await Promise.all([baseDelay, domReady, mathjaxReady]);

    // 最后再等一小段时间确保渲染完成
    await delay(initDelay);
  }

  // ==================== DOM 观察 ====================
  observeDOM() {
    const { debounceDelay } = CONFIG;

    const callback = () => {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(() => this.attachListeners(), debounceDelay);
    };

    this.observer = new MutationObserver(callback);
    this.observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  // ==================== 事件绑定 ====================
  attachListeners() {
    const formulas = this.findAllFormulas();

    if (formulas.length > 0) {
      log(`找到 ${formulas.length} 个数学公式`);
    }

    formulas.forEach(formula => {
      if (formula.dataset.latexListenerAttached) return;
      formula.dataset.latexListenerAttached = 'true';

      formula.addEventListener('mouseenter', e => this.showCopyButton(formula, e));
      formula.addEventListener('mouseleave', e => this.handleMouseLeave(e));
      formula.addEventListener('dblclick', e => this.handleDoubleClick(e, formula));
    });
  }

  handleMouseLeave(e) {
    const { hideButtonDelay } = CONFIG;
    setTimeout(() => {
      if (!this.isMouseOverButton(e)) {
        this.hideCopyButton();
      }
    }, hideButtonDelay);
  }

  handleDoubleClick(e, formula) {
    e.preventDefault();
    const latex = this.extractLaTeX(formula);
    if (latex) {
      this.copyToClipboard(latex);
    }
  }

  // ==================== 公式查找 ====================
  findAllFormulas() {
    const { formulaSelectors } = CONFIG;
    const formulas = [];

    // 扁平化所有选择器并查询
    formulaSelectors.forEach(selector => {
      formulas.push(...document.querySelectorAll(selector));
    });

    return formulas;
  }

  // ==================== LaTeX 提取 ====================
  extractLaTeX(element) {
    log('尝试提取 LaTeX，元素:', element.tagName, element.className);

    // 优先级：通用属性 > MathJax > KaTeX
    return this.tryExtractCommon(element)
        || this.tryExtractMathJax(element)
        || this.tryExtractKaTeX(element)
        || this.fallbackExtract(element);
  }

  // 通用提取：data-latex 属性
  tryExtractCommon(element) {
    return element.getAttribute('data-latex');
  }

  // MathJax 提取策略
  tryExtractMathJax(element) {
    const strategies = [
      // MathJax 2.x: script 标签
      () => element.querySelector('script[type*="math/tex"]')?.textContent,

      // MathJax 3.x: annotation 标签
      () => element.querySelector('annotation[encoding="application/x-tex"]')?.textContent,

      // mjx-container 相邻的 script
      () => {
        const container = element.closest?.('mjx-container');
        if (!container) return null;

        const prev = container.previousElementSibling;
        if (prev?.tagName === 'SCRIPT' && prev.type?.includes('math/tex')) {
          return prev.textContent;
        }

        const next = container.nextElementSibling;
        if (next?.tagName === 'SCRIPT' && next.type?.includes('math/tex')) {
          return next.textContent;
        }
        return null;
      }
    ];

    for (const strategy of strategies) {
      const result = strategy();
      if (result) {
        log('从 MathJax 提取成功');
        return result;
      }
    }
    return null;
  }

  // KaTeX 提取策略
  tryExtractKaTeX(element) {
    const katexEl = element.closest?.('.katex');
    if (!katexEl) return null;

    const strategies = [
      // 自身 data-latex
      () => katexEl.getAttribute('data-latex'),

      // 父元素 data-latex
      () => katexEl.parentElement?.closest?.('[data-latex]')?.getAttribute('data-latex'),

      // annotation 标签
      () => katexEl.querySelector('annotation[encoding="application/x-tex"]')?.textContent,

      // 相邻 script
      () => {
        const prev = katexEl.previousElementSibling;
        return (prev?.tagName === 'SCRIPT' && prev.type === 'math/tex')
          ? prev.textContent
          : null;
      }
    ];

    for (const strategy of strategies) {
      const result = strategy();
      if (result) {
        log('从 KaTeX 提取成功');
        return result;
      }
    }
    return null;
  }

  // 降级提取：搜索所有 annotation
  fallbackExtract(element) {
    const annotation = element.querySelector('annotation');
    if (annotation) {
      log('使用降级提取');
      return annotation.textContent;
    }

    log('提取失败');
    return null;
  }

  // ==================== 复制按钮 ====================
  showCopyButton(formula, event) {
    this.hideCopyButton();

    const latex = this.extractLaTeX(formula);
    if (!latex) {
      log('无法提取 LaTeX 源码');
      return;
    }

    log('提取到 LaTeX:', latex);

    const button = document.createElement('button');
    button.className = 'latex-copy-button';
    button.textContent = '复制 LaTeX';
    button.title = latex.length > CONFIG.tooltipMaxLength ? latex.substring(0, CONFIG.tooltipMaxLength) + '...' : latex;

    button.addEventListener('click', () => this.copyToClipboard(latex));
    button.addEventListener('mouseleave', () => this.hideCopyButton());

    document.body.appendChild(button);
    this.currentButton = button;
    this.currentFormula = formula;

    this.updateButtonPosition(formula);
  }

  hideCopyButton() {
    this.currentButton?.remove();
    this.currentButton = null;
    this.currentFormula = null;
  }

  isMouseOverButton(event) {
    if (!this.currentButton) return false;
    const rect = this.currentButton.getBoundingClientRect();
    return (
      event.clientX >= rect.left &&
      event.clientX <= rect.right &&
      event.clientY >= rect.top &&
      event.clientY <= rect.bottom
    );
  }

  updateButtonPosition(formula) {
    if (!this.currentButton) return;

    const { buttonOffset, viewportPadding } = CONFIG;
    const rect = formula.getBoundingClientRect();
    const buttonRect = this.currentButton.getBoundingClientRect();

    const buttonWidth = buttonRect.width || 120;
    const buttonHeight = buttonRect.height || 40;

    let left = rect.left + (rect.width - buttonWidth) / 2;
    let top = rect.top - buttonHeight - buttonOffset;

    // 边界检测
    left = Math.max(viewportPadding, Math.min(left, window.innerWidth - buttonWidth - viewportPadding));

    if (top < viewportPadding) {
      top = rect.bottom + buttonOffset;
    }

    this.currentButton.style.left = `${left}px`;
    this.currentButton.style.top = `${top}px`;

    // 首次渲染后重新定位
    if (buttonRect.width === 0) {
      requestAnimationFrame(() => this.currentButton && this.updateButtonPosition(formula));
    }
  }

  // ==================== 剪贴板 ====================
  async copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      this.showNotification('LaTeX 已复制到剪贴板！', text);
    } catch {
      // 降级方案
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.cssText = 'position:fixed;opacity:0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      textarea.remove();
      this.showNotification('LaTeX 已复制到剪贴板！', text);
    }
  }

  // ==================== 通知 ====================
  showNotification(message, latexText = null) {
    const { notificationDuration } = CONFIG;

    const notification = document.createElement('div');
    notification.className = 'latex-copy-notification';

    const messageDiv = document.createElement('div');
    messageDiv.className = 'latex-copy-notification-message';
    messageDiv.textContent = message;
    notification.appendChild(messageDiv);

    if (latexText) {
      const preview = document.createElement('div');
      preview.className = 'latex-copy-notification-preview';
      preview.textContent = latexText.length > CONFIG.previewMaxLength ? latexText.substring(0, CONFIG.previewMaxLength) + '...' : latexText;
      preview.title = latexText;
      notification.appendChild(preview);

      notification.style.cursor = 'pointer';
      notification.addEventListener('click', () => prompt('完整的 LaTeX 代码:', latexText));
    }

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.classList.add('fade-out');
      setTimeout(() => notification.remove(), 300);
    }, notificationDuration);
  }
}

// ==================== 启动 ====================
new LaTeXCopyHelper();
