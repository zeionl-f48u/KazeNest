import { createApp } from 'vue'
import App from './App.vue'

import './styles/tailwind.css'

import PrimeVue from 'primevue/config'
import Aura from '@primevue/themes/aura'

// 正确注册 PrimeVue 到 Vue 实例上（之前误把 Tauri 的 app 当成 Vue app）
const vueApp = createApp(App)
vueApp.use(PrimeVue, {
  theme: {
    preset: Aura,
    options: {
      darkModeSelector: '.dark',
      cssLayer: false,
    },
  },
})
vueApp.mount('#app')
