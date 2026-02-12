# LaTeX Clipper Code Optimization Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Refactor the LaTeX Clipper extension for cleaner code, better performance, and eliminated redundancy.

**Architecture:** Simplify data structures, abstract strategy patterns, reduce DOM observation overhead, and separate notification concerns.

**Tech Stack:** Vanilla JavaScript, CSS, Chrome Extension Manifest V3

---

## Overview

This plan addresses the following issues:
1. DOM observation is too aggressive (observes entire body)
2. Strategy extraction pattern is duplicated
3. Button position calculation has recursive hack
4. Notification system has mixed responsibilities
5. CONFIG nesting is too deep
6. resize event has no debounce
7. Magic numbers scattered in code

---

### Task 1: Flatten CONFIG Structure

**Files:**
- Modify: `content.js:5-34`

**Step 1: Refactor CONFIG to flat structure**

Current nested structure is unnecessary. Flatten to single-level groups:

```javascript
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
```

**Step 2: Update all CONFIG references in the file**

Search and replace all `CONFIG.timing.xxx` and `CONFIG.ui.xxx` references to use flat `CONFIG.xxx`.

**Step 3: Manual test**

Load extension in browser, hover over a formula, verify button appears.

**Step 4: Commit**

```bash
git add content.js
git commit -m "refactor: flatten CONFIG structure"
```

---

### Task 2: Abstract Strategy Pattern

**Files:**
- Modify: `content.js:36-41` (add utility function)
- Modify: `content.js:179-260` (refactor extraction methods)

**Step 1: Add tryStrategies utility function**

Add after the `log` function definition:

```javascript
// 尝试多个提取策略，返回第一个成功的结果
const tryStrategies = (strategies) => {
  for (const strategy of strategies) {
    const result = strategy();
    if (result) return result;
  }
  return null;
};
```

**Step 2: Refactor tryExtractMathJax**

```javascript
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
  ]);
}
```

**Step 3: Refactor tryExtractKaTeX**

```javascript
// KaTeX 提取策略
tryExtractKaTeX(element) {
  const katexEl = element.closest?.('.katex');
  if (!katexEl) return null;

  return tryStrategies([
    // 自身 data-latex
    () => katexEl.getAttribute('data-latex'),

    // 父元素 data-latex
    () => katexEl.parentElement?.closest?.('[data-latex]')?.getAttribute('data-latex'),

    // annotation 标签
    () => katexEl.querySelector(CONFIG.extractionSelectors.texAnnotation)?.textContent,

    // 相邻 script
    () => {
      const prev = katexEl.previousElementSibling;
      return (prev?.tagName === 'SCRIPT' && prev.type === 'math/tex')
        ? prev.textContent
        : null;
    }
  ]);
}
```

**Step 4: Refactor fallbackExtract**

```javascript
// 降级提取
fallbackExtract(element) {
  const annotation = element.querySelector(CONFIG.extractionSelectors.annotation);
  if (annotation) {
    log('使用降级提取');
    return annotation.textContent;
  }
  log('提取失败');
  return null;
}
```

**Step 5: Manual test**

Test formula extraction on MathJax 2.x, 3.x, and KaTeX pages.

**Step 6: Commit**

```bash
git add content.js
git commit -m "refactor: abstract strategy pattern with tryStrategies"
```

---

### Task 3: Optimize DOM Observation

**Files:**
- Modify: `content.js:99-113`

**Step 1: Add formula count tracking**

Add property to constructor:

```javascript
constructor() {
  this.currentButton = null;
  this.currentFormula = null;
  this.observer = null;
  this.debounceTimer = null;
  this.initialized = false;
  this.formulaCount = 0;  // Track formula count for smart observation
  this.init();
}
```

**Step 2: Refactor observeDOM with smart rebind check**

```javascript
// ==================== DOM 观察 ====================
observeDOM() {
  this.observer = new MutationObserver(() => {
    clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      // Only rebind if new formulas detected
      const currentCount = document.querySelectorAll(CONFIG.formulaSelectors.join(',')).length;
      if (currentCount !== this.formulaCount) {
        this.formulaCount = currentCount;
        this.attachListeners();
      }
    }, CONFIG.debounceDelay);
  });

  this.observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}
```

**Step 3: Update findAllFormulas to use flattened selectors**

```javascript
// ==================== 公式查找 ====================
findAllFormulas() {
  return [...document.querySelectorAll(CONFIG.formulaSelectors.join(','))];
}
```

**Step 4: Update attachListeners to update count**

```javascript
attachListeners() {
  const formulas = this.findAllFormulas();
  this.formulaCount = formulas.length;

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
```

**Step 5: Manual test on dynamic page**

Test on a page that loads formulas dynamically (e.g., scroll to load more).

**Step 6: Commit**

```bash
git add content.js
git commit -m "perf: optimize DOM observation with smart rebind check"
```

---

### Task 4: Fix Button Position Calculation

**Files:**
- Modify: `content.js:262-287`
- Modify: `content.js:306-333`

**Step 1: Set button dimensions at creation time**

In `showCopyButton`, add explicit dimensions:

```javascript
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
  button.title = latex.length > CONFIG.tooltipMaxLength
    ? latex.substring(0, CONFIG.tooltipMaxLength) + '...'
    : latex;

  // Set fixed dimensions to avoid reflow
  button.style.minWidth = '120px';
  button.style.minHeight = '40px';

  button.addEventListener('click', () => this.copyToClipboard(latex));
  button.addEventListener('mouseleave', () => this.hideCopyButton());

  document.body.appendChild(button);
  this.currentButton = button;
  this.currentFormula = formula;

  this.updateButtonPosition(formula);
}
```

**Step 2: Simplify updateButtonPosition**

Remove recursive call:

```javascript
updateButtonPosition(formula) {
  if (!this.currentButton) return;

  const rect = formula.getBoundingClientRect();
  const buttonRect = this.currentButton.getBoundingClientRect();

  const buttonWidth = buttonRect.width || 120;
  const buttonHeight = buttonRect.height || 40;

  let left = rect.left + (rect.width - buttonWidth) / 2;
  let top = rect.top - buttonHeight - CONFIG.buttonOffset;

  // 边界检测
  left = Math.max(CONFIG.viewportPadding,
    Math.min(left, window.innerWidth - buttonWidth - CONFIG.viewportPadding));

  if (top < CONFIG.viewportPadding) {
    top = rect.bottom + CONFIG.buttonOffset;
  }

  this.currentButton.style.left = `${left}px`;
  this.currentButton.style.top = `${top}px`;
}
```

**Step 3: Manual test near viewport edges**

Test with formulas at top of page, bottom, left edge, right edge.

**Step 4: Commit**

```bash
git add content.js
git commit -m "fix: remove recursive button position calculation"
```

---

### Task 5: Add Resize Debounce

**Files:**
- Modify: `content.js:64-69`

**Step 1: Add resize debounce**

```javascript
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
```

**Step 2: Manual test**

Resize browser window while hovering over a formula.

**Step 3: Commit**

```bash
git add content.js
git commit -m "perf: add debounce to resize event"
```

---

### Task 6: Simplify Notification System

**Files:**
- Modify: `content.js:353-382`

**Step 1: Remove click-to-view-full-code from notification**

The notification should only show success message. Remove the prompt interaction:

```javascript
// ==================== 通知 ====================
showNotification(message, latexText = null) {
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
  }, CONFIG.notificationDuration);
}
```

**Step 2: Manual test**

Copy a formula, verify notification shows without click interaction.

**Step 3: Commit**

```bash
git add content.js
git commit -m "refactor: simplify notification, remove mixed responsibility"
```

---

### Task 7: Clean Up waitForReady

**Files:**
- Modify: `content.js:75-97`

**Step 1: Simplify waitForReady logic**

```javascript
// 统一的就绪等待
async waitForReady() {
  // DOM 就绪
  if (document.readyState === 'loading') {
    await new Promise(resolve => document.addEventListener('DOMContentLoaded', resolve));
  }

  // MathJax 就绪（如果存在）
  if (window.MathJax?.startup?.promise) {
    await window.MathJax.startup.promise.catch(() => {});
  }

  // 等待渲染完成
  await delay(CONFIG.initDelay);
}
```

**Step 2: Manual test on MathJax-heavy page**

Test on arXiv or similar MathJax page.

**Step 3: Commit**

```bash
git add content.js
git commit -m "refactor: simplify waitForReady logic"
```

---

### Task 8: Final Review and Polish

**Files:**
- Review: `content.js` (full file)
- Review: `content.css` (full file)

**Step 1: Read full content.js and verify consistency**

Ensure all CONFIG references use flat structure.

**Step 2: Run quick sanity check**

```bash
# Check for any remaining CONFIG.timing or CONFIG.ui references
grep -n "CONFIG\.\(timing\|ui\)" content.js
# Should return nothing
```

**Step 3: Test on multiple sites**

Test on:
- MathJax 2.x site
- MathJax 3.x site
- KaTeX site
- StackExchange/Math.StackExchange

**Step 4: Final commit**

```bash
git add content.js
git commit -m "chore: final cleanup and consistency check"
```

---

## Summary

| Task | Description | Impact |
|------|-------------|--------|
| 1 | Flatten CONFIG | Readability |
| 2 | Abstract strategy pattern | DRY |
| 3 | Optimize DOM observation | Performance |
| 4 | Fix button position | Bug prevention |
| 5 | Add resize debounce | Performance |
| 6 | Simplify notification | SRP |
| 7 | Clean up waitForReady | Readability |
| 8 | Final review | Quality assurance |

**Estimated commits:** 8
**Risk level:** Low (no API changes, internal refactoring only)
