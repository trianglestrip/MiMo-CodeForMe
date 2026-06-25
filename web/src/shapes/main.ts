import { createApp } from 'vue'
import '@/app.css'
import ShapeGallery from './ShapeGallery.vue'

const theme = localStorage.getItem('theme') || 'light'
document.documentElement.setAttribute('data-theme', theme)

createApp(ShapeGallery).mount('#shapes-app')
