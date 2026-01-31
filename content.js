// LaTeX Clipper - Content Script
// 识别并处理 MathJax 和 KaTeX 渲染的公式

const DEBUG = false;
const log = DEBUG ? console.log.bind(console, '[LaTeX Clipper]') : () => {};

class LaTeXCopyHelper {
  constructor() {
    this.currentButton = null;
    this.currentFormula = null;
    this.observer = null;
    this.debounceTimer = null;
    this.init();
  }

  init() {
    log('插件已加载');
    log('当前页面:', window.location.href);
    log('document.readyState:', document.readyState);

    // 延迟执行，等待页面数学公式渲染完成
    setTimeout(() => {
      this.attachListeners();
      this.observeDOM();
    }, 1000);

    // 也在页面完全加载后再次尝试
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => this.attachListeners(), 500);
      });
    }

    // 监听 MathJax 渲染完成
    if (window.MathJax) {
      log('检测到 MathJax');
      window.MathJax.startup.promise.then(() => {
        log('MathJax 渲染完成');
        setTimeout(() => this.attachListeners(), 500);
      }).catch(() => {
        log('MathJax promise failed, trying anyway');
      });
    }
  }

  // 监听 DOM 变化，处理动态加载的公式
  observeDOM() {
    // Debounce: 避免频繁触发
    const callback = () => {
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
      }
      this.debounceTimer = setTimeout(() => {
        this.attachListeners();
      }, 300);
    };

    this.observer = new MutationObserver(callback);

    // 监听整个 body，但使用 debounce 减少触发频率
    this.observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  // 为所有数学公式添加事件监听器
  attachListeners() {
    // 查找所有 MathJax 和 KaTeX 公式
    const formulas = this.findAllFormulas();

    if (formulas.length > 0) {
      log(`找到 ${formulas.length} 个数学公式`);
    }

    formulas.forEach(formula => {
      // 避免重复添加监听器
      if (formula.dataset.latexListenerAttached) return;
      formula.dataset.latexListenerAttached = 'true';

      formula.style.cursor = 'pointer';

      formula.addEventListener('mouseenter', (e) => {
        this.showCopyButton(formula, e);
      });

      formula.addEventListener('mouseleave', (e) => {
        // 检查鼠标是否移动到按钮上
        setTimeout(() => {
          if (!this.isMouseOverButton(e)) {
            this.hideCopyButton();
          }
        }, 100);
      });
    });
  }

  // 查找页面上的所有数学公式
  findAllFormulas() {
    const formulas = [];

    // MathJax 2.x
    formulas.push(...document.querySelectorAll('.MathJax'));
    formulas.push(...document.querySelectorAll('.MathJax_Display'));

    // MathJax 3.x - 查找所有 mjx-container
    const mjxContainers = document.querySelectorAll('mjx-container');
    formulas.push(...mjxContainers);

    // KaTeX
    formulas.push(...document.querySelectorAll('.katex'));
    formulas.push(...document.querySelectorAll('.katex-display'));

    // 调试：打印找到的元素
    if (mjxContainers.length > 0) {
      log(`找到 ${mjxContainers.length} 个 mjx-container`);
      log('第一个 mjx-container:', mjxContainers[0]);
    }

    return formulas;
  }

  // 从公式元素中提取 LaTeX 源码
  extractLaTeX(element) {
    log('尝试提取 LaTeX，元素:', element.tagName, element.className);

    // 尝试从 MathJax 提取
    const mjxData = this.extractFromMathJax(element);
    if (mjxData) {
      log('从 MathJax 提取成功');
      return mjxData;
    }

    // 尝试从 KaTeX 提取
    const katexData = this.extractFromKaTeX(element);
    if (katexData) {
      log('从 KaTeX 提取成功');
      return katexData;
    }

    log('提取失败，元素 HTML:', element.innerHTML.substring(0, 200));
    return null;
  }

  // 从 MathJax 元素提取 LaTeX
  extractFromMathJax(element) {
    // MathJax 2.x - 从 script 标签中提取
    const script = element.querySelector('script[type*="math/tex"]');
    if (script) {
      log('从 script 标签提取');
      return script.textContent;
    }

    // MathJax 3.x - 从 data 属性中提取
    if (element.hasAttribute('data-latex')) {
      log('从 data-latex 属性提取');
      return element.getAttribute('data-latex');
    }

    // 查找 annotation 标签（MathML）- MathJax 3.x 通用方式
    const annotation = element.querySelector('annotation[encoding="application/x-tex"]');
    if (annotation) {
      log('从 annotation 标签提取:', annotation.textContent);
      return annotation.textContent;
    }

    // 尝试在更深层次查找 annotation
    const allAnnotations = element.querySelectorAll('annotation');
    log('找到 annotation 数量:', allAnnotations.length);
    allAnnotations.forEach((ann, i) => {
      log(`annotation[${i}]:`, ann.encoding, ann.textContent?.substring(0, 50));
    });

    // 尝试从 MathJax 内部数据结构提取
    const mjxContainer = element.closest('mjx-container');
    if (mjxContainer) {
      log('找到 mjx-container');

      // 查找相邻的 script 标签
      const prevScript = mjxContainer.previousElementSibling;
      if (prevScript && prevScript.tagName === 'SCRIPT' && prevScript.type && prevScript.type.includes('math/tex')) {
        log('从前一个 script 提取');
        return prevScript.textContent;
      }

      // 或者查找下一个 script 标签
      const nextScript = mjxContainer.nextElementSibling;
      if (nextScript && nextScript.tagName === 'SCRIPT' && nextScript.type && nextScript.type.includes('math/tex')) {
        log('从下一个 script 提取');
        return nextScript.textContent;
      }
    }

    return null;
  }

  // 从 KaTeX 元素提取 LaTeX
  extractFromKaTeX(element) {
    // 首先检查元素本身是否有 data-latex 属性
    if (element.hasAttribute('data-latex')) {
      return element.getAttribute('data-latex');
    }

    // KaTeX 通常在 .katex-html 旁边有一个包含原始 LaTeX 的元素
    const katexElement = element.closest('.katex');
    if (!katexElement) return null;

    // 方法 1: 从 data 属性提取（最优先）
    if (katexElement.hasAttribute('data-latex')) {
      return katexElement.getAttribute('data-latex');
    }

    // 方法 2: 从父元素查找 data-latex
    const parentWithLatex = katexElement.parentElement.closest('[data-latex]');
    if (parentWithLatex) {
      return parentWithLatex.getAttribute('data-latex');
    }

    // 方法 3: 从 annotation 标签提取
    const annotation = katexElement.querySelector('annotation[encoding="application/x-tex"]');
    if (annotation) {
      return annotation.textContent;
    }

    // 方法 4: 从相邻的 script 标签提取
    const script = katexElement.previousElementSibling;
    if (script && script.tagName === 'SCRIPT' && script.type && script.type === 'math/tex') {
      return script.textContent;
    }

    return null;
  }

  // 显示复制按钮
  showCopyButton(formula, event) {
    // 移除现有按钮
    this.hideCopyButton();

    // 提取 LaTeX 源码
    const latex = this.extractLaTeX(formula);
    if (!latex) {
      log('无法提取 LaTeX 源码', formula);
      return;
    }

    log('提取到 LaTeX:', latex);

    // 创建复制按钮
    const button = document.createElement('button');
    button.className = 'latex-copy-button';
    button.textContent = '复制 LaTeX';
    button.title = latex;

    // 定位按钮 - 在公式的右上角
    const rect = formula.getBoundingClientRect();

    button.style.position = 'fixed';
    button.style.right = `${window.innerWidth - rect.right + 10}px`;
    button.style.top = `${rect.top}px`;
    button.style.zIndex = '999999';

    // 点击复制
    button.addEventListener('click', () => {
      this.copyToClipboard(latex);
    });

    // 鼠标离开按钮时隐藏
    button.addEventListener('mouseleave', () => {
      this.hideCopyButton();
    });

    document.body.appendChild(button);
    this.currentButton = button;
    this.currentFormula = formula;
  }

  // 隐藏复制按钮
  hideCopyButton() {
    if (this.currentButton) {
      this.currentButton.remove();
      this.currentButton = null;
      this.currentFormula = null;
    }
  }

  // 检查鼠标是否在按钮上
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

  // 复制到剪贴板
  async copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      this.showNotification('LaTeX 已复制到剪贴板！');
    } catch (err) {
      // 降级方案
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      this.showNotification('LaTeX 已复制到剪贴板！');
    }
  }

  // 显示通知
  showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'latex-copy-notification';
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
      notification.classList.add('fade-out');
      setTimeout(() => notification.remove(), 300);
    }, 2000);
  }
}

// 初始化
new LaTeXCopyHelper();
