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

// Tidak ditunggu: aplikasi tetap tampil walau SDK Sentry gagal dimuat
initSentry(app).catch(() => undefined)

app.mount('#app')
