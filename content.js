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

    // 监听窗口大小变化，更新按钮位置
    window.addEventListener('resize', () => {
      if (this.currentButton && this.currentFormula) {
        this.updateButtonPosition(this.currentFormula);
      }
    });
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
        // 延迟隐藏，给用户时间移动到按钮上
        setTimeout(() => {
          if (!this.isMouseOverButton(e)) {
            this.hideCopyButton();
          }
        }, 500);
      });

      // 双击直接复制
      formula.addEventListener('dblclick', (e) => {
        e.preventDefault();
        const latex = this.extractLaTeX(formula);
        if (latex) {
          this.copyToClipboard(latex);
        }
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
    button.title = latex.substring(0, 100) + (latex.length > 100 ? '...' : '');

    button.style.position = 'fixed';
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

    // 设置按钮位置（包含边界检测）
    this.updateButtonPosition(formula);
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

  // 更新按钮位置（支持窗口 resize）
  updateButtonPosition(formula) {
    if (!this.currentButton) return;

    const rect = formula.getBoundingClientRect();
    const buttonRect = this.currentButton.getBoundingClientRect();

    // 估算按钮尺寸
    const buttonWidth = buttonRect.width > 0 ? buttonRect.width : 120;
    const buttonHeight = buttonRect.height > 0 ? buttonRect.height : 40;

    // 按钮放在公式框外上方，水平居中
    let left = rect.left + (rect.width - buttonWidth) / 2;
    let top = rect.top - buttonHeight - 8; // 公式上方 8px

    // 确保不超出视口
    left = Math.max(10, Math.min(left, window.innerWidth - buttonWidth - 10));

    // 如果上方空间不足，改放在公式下方
    if (top < 10) {
      top = rect.bottom + 8;
    }

    this.currentButton.style.left = `${left}px`;
    this.currentButton.style.top = `${top}px`;

    // 第一次渲染后，用实际尺寸重新定位一次
    if (buttonRect.width === 0) {
      requestAnimationFrame(() => {
        if (this.currentButton) {
          this.updateButtonPosition(formula);
        }
      });
    }
  }

  // 复制到剪贴板
  async copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      this.showNotification('LaTeX 已复制到剪贴板！', text);
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
      this.showNotification('LaTeX 已复制到剪贴板！', text);
    }
  }

  // 显示通知（支持预览）
  showNotification(message, latexText = null) {
    const notification = document.createElement('div');
    notification.className = 'latex-copy-notification';

    // 主消息
    const messageDiv = document.createElement('div');
    messageDiv.className = 'latex-copy-notification-message';
    messageDiv.textContent = message;
    notification.appendChild(messageDiv);

    // 如果有 LaTeX，显示预览
    if (latexText) {
      const preview = document.createElement('div');
      preview.className = 'latex-copy-notification-preview';
      const previewText = latexText.length > 60
        ? latexText.substring(0, 60) + '...'
        : latexText;
      preview.textContent = previewText;
      preview.title = latexText; // 鼠标悬停显示完整内容
      notification.appendChild(preview);

      // 点击通知可查看完整内容（通过 alert）
      notification.style.cursor = 'pointer';
      notification.addEventListener('click', () => {
        // 使用 prompt 方便用户复制
        prompt('完整的 LaTeX 代码（可以复制）:', latexText);
      });
    }

    document.body.appendChild(notification);

    // 自动淡出
    setTimeout(() => {
      notification.classList.add('fade-out');
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }
}

// 初始化
new LaTeXCopyHelper();
