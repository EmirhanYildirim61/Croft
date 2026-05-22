export interface Language {
  code: string;
  label: string;
  /** Path to a flag image served from public/flags/, e.g. '/flags/en.svg' */
  flag?: string;
  /** Text direction — defaults to ltr */
  dir?: 'ltr' | 'rtl';
}

export const LANGUAGES: Language[] = [
  { code: 'en', label: 'English', flag: '/flags/en.svg' },
  { code: 'tr', label: 'Türkçe', flag: '/flags/tr.svg' },
  { code: 'es', label: 'Español', flag: '/flags/es.svg' },
  { code: 'fr', label: 'Français', flag: '/flags/fr.svg' },
  { code: 'br', label: 'Português (BR)', flag: '/flags/br.svg' },
  { code: 'pt', label: 'Português (PT)', flag: '/flags/pt.svg' },
  { code: 'de', label: 'Deutsch', flag: '/flags/de.svg' },
  { code: 'ru', label: 'Русский', flag: '/flags/ru.svg' },
  { code: 'ar', label: 'العربية', flag: '/flags/ar.svg', dir: 'rtl' },
  { code: 'hi', label: 'हिन्दी', flag: '/flags/hi.svg' },
  { code: 'ja', label: '日本語', flag: '/flags/ja.svg' },
  { code: 'zh-CN', label: '中文(简体)', flag: '/flags/zh-cn.svg' },
  { code: 'zh-TW', label: '中文(繁體)', flag: '/flags/zh-tw.svg' },
];
