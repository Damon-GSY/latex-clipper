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
  copySuccessHideDelay: 800,  // 复制成功后按钮自动隐藏延迟

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

// 尝试多个提取策略，返回第一个成功的结果
const tryStrategies = (strategies, successLog) => {
  for (const strategy of strategies) {
    const result = strategy();
    if (result) {
      if (successLog) log(successLog);
      return result;
    }
  }
  return null;
};

// ==================== 主类 ====================
class LaTeXCopyHelper {
  constructor() {
    this.currentButton = null;
    this.currentFormula = null;
    this.observer = null;
    this.debounceTimer = null;
    this.copySuccessTimer = null;  // 复制成功后的自动隐藏计时器
    this.hideTimer = null;  // 鼠标离开后的隐藏计时器
    this.initialized = false;
    this.init();
  }

  // ==================== 初始化 ====================
  async init() {
    console.log('[LaTeX Clipper] v1.5.0 已加载 - 复制后自动隐藏功能已启用');
    log('插件已加载');

    // 等待 DOM 就绪
    await this.waitForReady();

    // 绑定事件和观察者
    this.attachListeners();
    this.observeDOM();

    // 监听窗口大小变化
    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (this.currentButton && this.currentFormula) {
          this.updateButtonPosition(this.currentFormula);
        }
      }, CONFIG.debounceDelay);
    });

    this.initialized = true;
    log('初始化完成');
  }

  // 统一的就绪等待
  async waitForReady() {
    // DOM 就绪
    if (document.readyState === 'loading') {
      await new Promise(resolve => document.addEventListener('DOMContentLoaded', resolve));
    }

    // MathJax 就绪（如果存在），带超时保护
    if (window.MathJax?.startup?.promise) {
      const timeout = new Promise(resolve => setTimeout(resolve, 2000));
      await Promise.race([window.MathJax.startup.promise, timeout]).catch(() => {});
    }

    // 等待渲染完成
    await delay(CONFIG.initDelay);
  }

  // ==================== DOM 观察 ====================
  observeDOM() {
    this.observer = new MutationObserver(() => {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(() => {
        // Always check for new formulas (attachListeners handles dedup via latexListenerAttached)
        this.attachListeners();
      }, CONFIG.debounceDelay);
    });

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

      formula.addEventListener('mouseenter', () => {
        this.handleMouseEnter();
        this.showCopyButton(formula);
      });
      formula.addEventListener('mouseleave', () => this.handleMouseLeave());
      formula.addEventListener('dblclick', e => this.handleDoubleClick(e, formula));
    });
  }

  handleMouseLeave() {
    const { hideButtonDelay } = CONFIG;

    // 清除之前的隐藏计时器
    if (this.hideTimer) {
      clearTimeout(this.hideTimer);
    }

    // 鼠标离开时延迟隐藏
    this.hideTimer = setTimeout(() => {
      this.hideCopyButton();
    }, hideButtonDelay);
  }

  handleMouseEnter() {
    // 鼠标进入时清除隐藏计时器
    if (this.hideTimer) {
      clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }
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
    return [...document.querySelectorAll(CONFIG.formulaSelectors.join(','))];
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

  // 通用提取：data-latex 或 data-math 属性
  tryExtractCommon(element) {
    return element.getAttribute('data-latex')
        || element.getAttribute('data-math');
  }

  // MathJax 提取策略
  tryExtractMathJax(element) {
    return tryStrategies([
      // MathJax 2.x: script 标签
      () => element.querySelector(CONFIG.extractionSelectors.mathjaxScript)?.textContent,

      // MathJax 3.x: annotation 标签
      () => element.querySelector(CONFIG.extractionSelectors.texAnnotation)?.textContent,

      // mjx-container 相邻的 script
      () => {
        const container = element.closest?.('mjx-container');
        if (!container) return null;

        const siblings = [container.previousElementSibling, container.nextElementSibling];
        for (const sibling of siblings) {
          if (sibling?.tagName === 'SCRIPT' && sibling.type?.includes('math/tex')) {
            return sibling.textContent;
          }
        }
        return null;
      }
    ], '从 MathJax 提取成功');
  }

  // KaTeX 提取策略
  tryExtractKaTeX(element) {
    // 支持 .katex-display 和 .katex 两种情况
    const katexEl = element.closest?.('.katex') || element.querySelector?.('.katex') || element;
    const isKaTeX = katexEl.classList?.contains('katex') ||
                    katexEl.classList?.contains('katex-display') ||
                    element.closest?.('.katex-display');

    if (!isKaTeX && !element.classList?.contains('katex')) return null;

    // 收集可能的候选元素（自身及祖先）
    const candidates = [katexEl, element];
    let current = katexEl.parentElement;
    while (current) {
      candidates.push(current);
      if (current.classList?.contains('math-block')) break;
      current = current.parentElement;
    }

    // 尝试从候选元素获取 data-math 或 data-latex
    for (const el of candidates) {
      const latex = el?.getAttribute?.('data-math') || el?.getAttribute?.('data-latex');
      if (latex) {
        log('从 KaTeX data 属性提取成功');
        return latex;
      }
    }

    // annotation 标签
    const annotation = katexEl.querySelector?.(CONFIG.extractionSelectors.texAnnotation)?.textContent;
    if (annotation) {
      log('从 KaTeX annotation 提取成功');
      return annotation;
    }

    // 相邻 script
    const prev = katexEl.previousElementSibling;
    if (prev?.tagName === 'SCRIPT' && prev.type === 'math/tex') {
      log('从 KaTeX 相邻 script 提取成功');
      return prev.textContent;
    }

    return null;
  }

  // 降级提取：搜索所有 annotation
  fallbackExtract(element) {
    const annotation = element.querySelector(CONFIG.extractionSelectors.annotation);
    if (annotation) {
      log('使用降级提取');
      return annotation.textContent;
    }

    log('提取失败');
    return null;
  }

  // ==================== 复制按钮 ====================
  showCopyButton(formula) {
    // 如果复制成功计时器正在运行，不重新创建按钮
    if (this.copySuccessTimer) {
      return;
    }

    this.hideCopyButton();

    const latex = this.extractLaTeX(formula);
    if (!latex) {
      log('无法提取 LaTeX 源码');
      return;
    }

    log('提取到 LaTeX:', latex);

    const button = document.createElement('button');
    button.className = 'latex-copy-button';
    // Set fixed dimensions to avoid reflow
    button.style.minWidth = '120px';
    button.style.minHeight = '40px';
    button.textContent = '复制 LaTeX';
    button.title = latex.length > CONFIG.tooltipMaxLength ? latex.substring(0, CONFIG.tooltipMaxLength) + '...' : latex;

    button.addEventListener('click', () => this.copyToClipboard(latex));
    button.addEventListener('mouseenter', () => this.handleMouseEnter());
    button.addEventListener('mouseleave', () => this.handleMouseLeave());

    document.body.appendChild(button);
    this.currentButton = button;
    this.currentFormula = formula;

    this.updateButtonPosition(formula);
  }

  hideCopyButton() {
    // 清除所有计时器
    if (this.copySuccessTimer) {
      clearTimeout(this.copySuccessTimer);
      this.copySuccessTimer = null;
    }
    if (this.hideTimer) {
      clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }
    this.currentButton?.remove();
    this.currentButton = null;
    this.currentFormula = null;
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
  }

  // ==================== 剪贴板 ====================
  async copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      this.showNotification('LaTeX 已复制到剪贴板！', text);
      this.scheduleButtonHide();
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
      this.scheduleButtonHide();
    }
  }

  // 复制成功后安排按钮自动隐藏
  scheduleButtonHide() {
    const { copySuccessHideDelay } = CONFIG;

    // 清除之前的计时器
    if (this.copySuccessTimer) {
      clearTimeout(this.copySuccessTimer);
    }
    if (this.hideTimer) {
      clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }

    // 更新按钮文字，给用户视觉反馈
    if (this.currentButton) {
      this.currentButton.textContent = '已复制 ✓';
      this.currentButton.style.background = '#10b981';
    }

    // 设置新的自动隐藏计时器
    this.copySuccessTimer = setTimeout(() => {
      this.hideCopyButton();
    }, copySuccessHideDelay);
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
      preview.textContent = latexText.length > CONFIG.previewMaxLength
        ? latexText.substring(0, CONFIG.previewMaxLength) + '...'
        : latexText;
      preview.title = latexText;
      notification.appendChild(preview);
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
