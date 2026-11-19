import React, { useState } from "react";
import {
  I18nLoader,
  useRgxTranslateService,
  useTranslate,
} from "../../src/lib";
import { BackButton } from "./BackButton";
import { Logo } from "./Logo";

export interface HeaderProps {
  titleKey: string;
  showBackButton?: boolean;
}

export function Header({ titleKey, showBackButton = false }: HeaderProps) {
  const translate = useTranslate();
  const translateService = useRgxTranslateService();
  const [dark, setDark] = useState(false);
  const [busy, setBusy] = useState(false);

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dcf-palette-dark", next);
    document.documentElement.classList.toggle("has-dark-mode", next);
  };

  const changeLanguage = async (lang: string) => {
    if (lang === translateService.getCurrentLang()) return;
    setBusy(true);
    try {
      const cached = translateService.getOnCache(lang);
      if (!cached || Object.keys(cached).length === 0) {
        const loader = new I18nLoader([
          { prefix: "/i18n/", suffix: ".json" },
        ]);
        const translations = await loader.getTranslation(lang);
        translateService.setCache(lang, translations);
      }
      translateService.use(lang);
    } finally {
      setBusy(false);
    }
  };

  const currentLang = translateService.getCurrentLang();

  return (
    <header className="app-header">
      <div className="app-header-brand">
        <Logo width={120} />
        {showBackButton && <BackButton />}
      </div>
      <h1 className="app-header-title">{translate(titleKey)}</h1>
      <div className="app-header-actions">
        <label className="app-visually-hidden" htmlFor="language-select">
          {translate("common.language")}
        </label>
        <select
          id="language-select"
          className="app-language-select"
          value={currentLang}
          disabled={busy}
          onChange={(event) => void changeLanguage(event.target.value)}
        >
          <option value="en">EN</option>
          <option value="pt">PT</option>
        </select>
        <button
          type="button"
          className="app-theme-toggle"
          onClick={toggleTheme}
          aria-pressed={dark}
          aria-label={translate("common.toggle_theme")}
          title={translate("common.toggle_theme")}
        >
          {dark ? translate("common.light") : translate("common.dark")}
        </button>
      </div>
    </header>
  );
}
