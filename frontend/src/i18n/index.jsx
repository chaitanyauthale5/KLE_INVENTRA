// Simple i18n provider for the app (JSX)
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

const fallbackLang = 'en';
const STORAGE_KEY = 'ayursutra_lang';

// Minimal translations. Extend as needed across the app.
const translations = {
  en: {
    settings_title: 'Settings',
    settings_subtitle: 'Manage your account and system preferences',
    regional_settings: 'Regional Settings',
    language: 'Language',
    timezone: 'Timezone',
    date_format: 'Date Format',
    time_format: 'Time Format',
    patients_12m: 'Patients (12 months)',
    aggregated_across: 'Aggregated across clinics',
    therapy_distribution: 'Therapy Distribution',
    most_in_demand: 'Most in-demand therapies',
  },
  hi: {
    settings_title: 'सेटिंग्स',
    settings_subtitle: 'अपने खाते और सिस्टम वरीयताओं का प्रबंधन करें',
    regional_settings: 'क्षेत्रीय सेटिंग्स',
    language: 'भाषा',
    timezone: 'समय क्षेत्र',
    date_format: 'तिथि प्रारूप',
    time_format: 'समय प्रारूप',
    patients_12m: 'रोगी (12 महीने)',
    aggregated_across: 'क्लिनिकों में समेकित',
    therapy_distribution: 'थेरेपी वितरण',
    most_in_demand: 'सबसे अधिक मांग वाली थेरेपी',
  },
  mr: {
    settings_title: 'सेटिंग्ज',
    settings_subtitle: 'तुमचे खाते आणि प्रणाली प्राधान्ये व्यवस्थापित करा',
    regional_settings: 'प्रादेशिक सेटिंग्ज',
    language: 'भाषा',
    timezone: 'वेळ क्षेत्र',
    date_format: 'दिनांक स्वरूप',
    time_format: 'वेळ स्वरूप',
    patients_12m: 'रुग्ण (12 महिने)',
    aggregated_across: 'क्लिनिक्समध्ये एकत्रित',
    therapy_distribution: 'थेरपी वितरण',
    most_in_demand: 'सर्वाधिक मागणीतील थेरपी',
  },
  ta: {
    settings_title: 'அமைப்புகள்',
    settings_subtitle: 'உங்கள் கணக்கு மற்றும் கணினி விருப்பங்களை நிர்வகிக்கவும்',
    regional_settings: 'பிராந்திய அமைப்புகள்',
    language: 'மொழி',
    timezone: 'நேர மண்டலம்',
    date_format: 'தேதி வடிவம்',
    time_format: 'நேர வடிவம்',
    patients_12m: 'நோயாளிகள் (12 மாதங்கள்)',
    aggregated_across: 'கிளினிக்குகளில் ஒருங்கிணைக்கப்பட்டது',
    therapy_distribution: 'சிகிச்சை விநியோகம்',
    most_in_demand: 'அதிக கோரிக்கையுள்ள சிகிச்சைகள்',
  },
};

const I18nCtx = createContext({
  lang: fallbackLang,
  t: (k, dflt) => dflt ?? k,
  setLanguage: () => {},
});

export function I18nProvider({ children }) {
  const [lang, setLang] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY) || fallbackLang; } catch { return fallbackLang; }
  });

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, lang); } catch {}
    try { document.documentElement.lang = lang; } catch {}
  }, [lang]);

  const dict = translations[lang] || translations[fallbackLang] || {};
  const value = useMemo(() => ({
    lang,
    t: (k, dflt) => (dict[k] ?? translations[fallbackLang]?.[k] ?? dflt ?? k),
    setLanguage: setLang,
  }), [lang]);

  return <I18nCtx.Provider value={value}>{children}</I18nCtx.Provider>;
}

export function useI18n() {
  return useContext(I18nCtx);
}

export function t(key, dflt) {
  // convenience for non-react contexts (rare)
  try {
    const lang = localStorage.getItem(STORAGE_KEY) || fallbackLang;
    const dict = translations[lang] || translations[fallbackLang] || {};
    return dict[key] ?? translations[fallbackLang]?.[key] ?? dflt ?? key;
  } catch {
    return dflt ?? key;
  }
}
