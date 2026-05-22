import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LANGUAGES } from '../lib/languages';
import { api } from '../lib/tauri';

interface Props {
  onComplete: () => void;
}

const ONBOARDING_KEY = 'onboarding_complete';

export default function OnboardingScreen({ onComplete }: Props) {
  const { t, i18n } = useTranslation();
  const [selected, setSelected] = useState(i18n.language ?? 'en');
  const [loading, setLoading] = useState(false);

  const handleSelect = (code: string) => {
    setSelected(code);
    i18n.changeLanguage(code);
  };

  const handleStart = async () => {
    setLoading(true);
    try {
      localStorage.setItem('language', selected);
      const names = t('categoryDefaults', { returnObjects: true }) as string[];
      await api.renameDefaultCategories(names);
      localStorage.setItem(ONBOARDING_KEY, '1');
      onComplete();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-slate-50">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-10 w-full max-w-sm text-center">
        <div className="text-4xl mb-3">💰</div>
        <h1 className="text-2xl font-bold text-slate-800 mb-1">Croft</h1>
        <p className="text-slate-400 text-sm mb-8">{t('onboarding.tagline')}</p>

        <p className="text-sm font-medium text-slate-600 mb-3">{t('onboarding.chooseLanguage')}</p>
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => handleSelect(lang.code)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                selected === lang.code
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'border-slate-300 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {lang.flag && (
                <img src={lang.flag} alt={lang.label} className="w-6 h-auto rounded-sm shrink-0" />
              )}
              <span>{lang.label}</span>
            </button>
          ))}
        </div>

        <button
          onClick={handleStart}
          disabled={loading}
          className="w-full bg-indigo-600 text-white py-2.5 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          {loading ? '…' : t('onboarding.getStarted')}
        </button>
      </div>
    </div>
  );
}

export { ONBOARDING_KEY };
