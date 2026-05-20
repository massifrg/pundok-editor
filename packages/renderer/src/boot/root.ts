import { defineBoot } from '#q-app/wrappers'
import PundokApp from '../PundokApp.vue'
import { createPinia } from 'pinia' // if used
import router from '../router'

// "async" is optional;
// more info on params: https://v2.quasar.dev/quasar-cli-vite/boot-files
export default defineBoot(async ({ app }) => {
  app.component('App', PundokApp)
  app.use(createPinia())
  app.use(router)
})
