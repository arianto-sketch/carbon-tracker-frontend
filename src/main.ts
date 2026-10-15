import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import vuetify from './plugins/vuetify'
import VueApexCharts from './plugins/apexcharts'
import { initSentry } from './plugins/sentry'

const app = createApp(App)
  .use(createPinia())
  .use(router)
  .use(vuetify)
  .component('apexchart', VueApexCharts)

// Tidak ditunggu: aplikasi tetap tampil walau SDK Sentry gagal dimuat (mis. diblokir ad blocker)
initSentry(app).catch((e) => console.warn('Sentry tidak aktif:', e))

app.mount('#app')
