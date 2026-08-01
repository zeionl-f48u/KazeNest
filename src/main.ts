import { createApp } from "vue";
import App from "./App.vue";


// 1. 导入 Tailwind + PrimeUI 样式（必须先于 PrimeVue 的样式？但顺序通常无关紧要）
import './styles/tailwind.css'

// 2. 导入 PrimeVue 的默认样式（如果使用预设主题，需要引入）
import PrimeVue from 'primevue/config'
import Aura from '@primevue/themes/aura'


import { app } from "@tauri-apps/api";


createApp(App).mount("#app");

// 注册 PrimeVue（使用预设样式）
app.use(PrimeVue, {
  theme: {
    preset: Aura,
    options: {
      darkModeSelector: '.dark', // 深色模式切换
      cssLayer: false,
    },
  },
})

app.mount('#app')