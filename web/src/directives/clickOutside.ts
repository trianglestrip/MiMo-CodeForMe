import type { App, Directive } from 'vue'

type ElWithHandler = HTMLElement & { _clickOutside?: (e: Event) => void }

export const vClickOutside: Directive = {
  mounted(el, binding) {
    const handler = (e: Event) => {
      if (!el.contains(e.target as Node)) binding.value(e)
    }
    ;(el as ElWithHandler)._clickOutside = handler
    document.addEventListener('click', handler)
  },
  unmounted(el) {
    const handler = (el as ElWithHandler)._clickOutside
    if (handler) document.removeEventListener('click', handler)
  },
}

export function registerClickOutside(app: App) {
  app.directive('click-outside', vClickOutside)
}
