import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from '../locales/en.json';
import tr from '../locales/tr.json';
import es from '../locales/es.json';
import fr from '../locales/fr.json';
import br from '../locales/br.json';
import pt from '../locales/pt.json';
import de from '../locales/de.json';
import ru from '../locales/ru.json';
import ar from '../locales/ar.json';
import hi from '../locales/hi.json';
import ja from '../locales/ja.json';
import zhCn from '../locales/zh-cn.json';
import zhTw from '../locales/zh-tw.json';
import { LANGUAGES } from './languages';

const LANGUAGE_KEY = 'language';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      tr: { translation: tr },
      es: { translation: es },
      fr: { translation: fr },
      br: { translation: br },
      pt: { translation: pt },
      de: { translation: de },
      ru: { translation: ru },
      ar: { translation: ar },
      hi: { translation: hi },
      ja: { translation: ja },
      'zh-CN': { translation: zhCn },
      'zh-TW': { translation: zhTw },
    },
    lng: localStorage.getItem(LANGUAGE_KEY) ?? 'en',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });

// Keep document direction in sync with the active language.
const applyDir = (lng: string) => {
  const lang = LANGUAGES.find((l) => l.code === lng);
  document.documentElement.dir = lang?.dir ?? 'ltr';
};

applyDir(i18n.language);
i18n.on('languageChanged', applyDir);

export default i18n;
