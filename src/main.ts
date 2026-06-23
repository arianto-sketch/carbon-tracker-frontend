import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import vuetify from './plugins/vuetify'
import VueApexCharts from './plugins/apexcharts'

createApp(App)
  .use(createPinia())
  .use(router)
  .use(vuetify)
  .component('apexchart', VueApexCharts)
  .mount('#app')
