import enUS from '../locales/en.json';
import it from '../locales/it.json';
import { Lang } from 'quasar';
import { createI18n } from 'vue-i18n';

const messages = {
  'en-US': enUS,
  it,
};

const locale = Lang.getLocale()
export const i18n = createI18n({
  locale: locale || 'en-US',
  legacy: false,
  messages,
});

export const t = i18n.global.t

export default messages
