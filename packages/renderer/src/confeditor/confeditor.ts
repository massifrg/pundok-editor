// main file per Vue
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import { Quasar, Notify } from 'quasar';
import ConfigurationEditorApp from './ConfigurationEditorApp.vue';

// Import icon libraries
import '@quasar/extras/mdi-v6/mdi-v6.css';

// Import Quasar css
import 'quasar/src/css/index.sass';

const app = createApp(ConfigurationEditorApp);
const pinia = createPinia();
app.use(pinia);
app.use(Quasar, {
  plugins: {
    // import Quasar plugins and add here
    Notify,
  },
  config: {
    notify: {},
  },
});
app.mount('#app');
