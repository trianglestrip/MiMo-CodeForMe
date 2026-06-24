import { marked } from 'marked'
import hljs from 'highlight.js/lib/core'
import '@/styles/hljs-theme.css'
import bash from 'highlight.js/lib/languages/bash'
import c from 'highlight.js/lib/languages/c'
import cpp from 'highlight.js/lib/languages/cpp'
import css from 'highlight.js/lib/languages/css'
import go from 'highlight.js/lib/languages/go'
import java from 'highlight.js/lib/languages/java'
import javascript from 'highlight.js/lib/languages/javascript'
import json from 'highlight.js/lib/languages/json'
import markdown from 'highlight.js/lib/languages/markdown'
import python from 'highlight.js/lib/languages/python'
import rust from 'highlight.js/lib/languages/rust'
import sql from 'highlight.js/lib/languages/sql'
import typescript from 'highlight.js/lib/languages/typescript'
import xml from 'highlight.js/lib/languages/xml'
import yaml from 'highlight.js/lib/languages/yaml'

hljs.registerLanguage('bash', bash)
hljs.registerLanguage('c', c)
hljs.registerLanguage('cpp', cpp)
hljs.registerLanguage('css', css)
hljs.registerLanguage('go', go)
hljs.registerLanguage('java', java)
hljs.registerLanguage('javascript', javascript)
hljs.registerLanguage('json', json)
hljs.registerLanguage('markdown', markdown)
hljs.registerLanguage('python', python)
hljs.registerLanguage('rust', rust)
hljs.registerLanguage('sql', sql)
hljs.registerLanguage('typescript', typescript)
hljs.registerLanguage('xml', xml)
hljs.registerLanguage('yaml', yaml)

const LANG_ALIASES: Record<string, string> = {
  sh: 'bash',
  shell: 'bash',
  zsh: 'bash',
  'c++': 'cpp',
  h: 'c',
  hpp: 'cpp',
  js: 'javascript',
  jsx: 'javascript',
  ts: 'typescript',
  tsx: 'typescript',
  py: 'python',
  rs: 'rust',
  md: 'markdown',
  html: 'xml',
  vue: 'xml',
  yml: 'yaml',
  golang: 'go',
}

function resolveLanguage(lang: string): string | null {
  const key = lang.toLowerCase()
  const resolved = LANG_ALIASES[key] ?? key
  return hljs.getLanguage(resolved) ? resolved : null
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

marked.setOptions({ breaks: true })

marked.use({
  renderer: {
    code({ text, lang }) {
      const raw = (lang || '').trim()
      const language = raw ? resolveLanguage(raw) : null
      const highlighted = language
        ? hljs.highlight(text, { language }).value
        : hljs.highlightAuto(text).value
      const label = raw || language || 'text'

      return [
        '<div class="code-block">',
        `<div class="code-lang">${escapeHtml(label)}</div>`,
        `<pre><code class="hljs language-${escapeHtml(language || 'plaintext')}">${highlighted}</code></pre>`,
        '</div>',
      ].join('')
    },
  },
})

export function renderMarkdown(content: string): string {
  return marked.parse(content, { async: false }) as string
}

export function highlightCodeBlocks(root: HTMLElement) {
  root.querySelectorAll('pre code').forEach((el) => {
    const block = el as HTMLElement
    if (block.dataset.hljsApplied === '1') return
    if (block.querySelector('span[class*="hljs-"]')) {
      block.dataset.hljsApplied = '1'
      return
    }
    hljs.highlightElement(block)
    block.dataset.hljsApplied = '1'
  })
}
