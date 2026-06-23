import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { aliases, mdi } from 'vuetify/iconsets/mdi'
import 'vuetify/styles'
import '@mdi/font/css/materialdesignicons.css'

export default createVuetify({
  components,
  directives,
  icons: {
    defaultSet: 'mdi',
    aliases,
    sets: { mdi },
  },
  theme: {
    defaultTheme: 'light',
    themes: {
      light: {
        colors: {
          primary: '#2E7D32',
          secondary: '#66BB6A',
          accent: '#A5D6A7',
          error: '#D32F2F',
          warning: '#F57C00',
          info: '#0288D1',
          surface: '#FFFFFF',
          background: '#F5F5F5',
        },
      },
    },
  },
})
