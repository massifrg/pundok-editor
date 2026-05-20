// main file per Vue
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import { createI18n } from 'vue-i18n';
import { Quasar, Dialog, Notify, QuasarPluginOptions } from 'quasar';
import App from './PundokApp.vue';
import { Lang } from 'quasar'
import messages from './i18n';

// TODO: remove the next one to reduce the bundle size
// import '@quasar/extras/mdi-v7/mdi-v7.css';

// Import Quasar css
import 'quasar/src/css/index.sass';
import { SK } from './common';

const app = createApp(App);
const pinia = createPinia();
app.provide("SK", SK)
app.use(pinia);

type MessageLanguages = keyof typeof messages;
type MessageSchema = typeof messages['en-US'];
/* eslint-disable @typescript-eslint/no-empty-object-type */
declare module 'vue-i18n' {
  // define the locale messages schema
  export interface DefineLocaleMessage extends MessageSchema { }

  // define the datetime format schema
  export interface DefineDateTimeFormat { }

  // define the number format schema
  export interface DefineNumberFormat { }
}
const locale = Lang.getLocale()
console.log(locale)
const i18n = createI18n<{ message: MessageSchema }, MessageLanguages>({
  locale: locale || 'en-US',
  legacy: false,
  messages,
});
// Set i18n instance on app
app.use(i18n);
app.use(Quasar, {
  plugins: {
    // import Quasar plugins and add here
    Dialog,
    Notify,
  },
  config: {
    notify: {},

  }
} as QuasarPluginOptions);
app.mount('#app');
