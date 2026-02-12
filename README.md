# LaTeX Clipper

> "Talk is cheap. Show me the code." — LaTeX Clipper shows you the LaTeX.

A browser extension that identifies and copies LaTeX source code from mathematical formulas on any webpage. One hover, one click, done.

## What it does

MathJax and KaTeX render beautiful formulas, but getting the source code back is a pain. LaTeX Clipper solves this:

- **Hover** over any MathJax or KaTeX formula → Copy button appears
- **Click** the button → LaTeX source copied to clipboard
- **Done**

## Features

| Library | Support |
|---------|---------|
| MathJax 2.x | ✅ |
| MathJax 3.x | ✅ |
| KaTeX | ✅ |

- Automatic formula detection
- One-click copy to clipboard
- Works with dynamically loaded content
- No configuration needed

## Installation

### Chrome/Edge/Brave

1. Download this repository
2. Open `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked"
5. Select the `latex-clipper` folder

### Firefox

1. Download this repository
2. Open `about:debugging#/runtime/this-firefox`
3. Click "Load Temporary Add-on"
4. Select `manifest.json`

## How it works

```
┌─────────────────────────────────────────────────────┐
│  Page: x² + y² = r² (rendered by MathJax/KaTeX)     │
├─────────────────────────────────────────────────────┤
│                                                     │
│  [Hover] → [Copy LaTeX] button appears             │
│            ┌─────────────┐                          │
│            │ Copy LaTeX  │ ← Click                  │
│            └─────────────┘                          │
│                                                     │
│  Result: x^2 + y^2 = r^2 (copied to clipboard)     │
└─────────────────────────────────────────────────────┘
```

### Extraction methods

| Renderer | Extraction method |
|----------|-------------------|
| MathJax 2.x | `<script type="math/tex">` tag |
| MathJax 3.x | `<annotation encoding="application/x-tex">` tag |
| KaTeX | `<annotation>` tag or `data-latex` attribute |

## Contributing

Pull requests welcome. Keep it simple, keep it working.

## License

MIT
