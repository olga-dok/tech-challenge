"use client";

import { useState } from "react";
import { CorpusView } from "./corpus-view";
import { UI_LABELS, type UiLanguage } from "./ui-language";

export function HomeView() {
  const [language, setLanguage] = useState<UiLanguage>("en");
  const labels = UI_LABELS[language];

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 p-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-3xl font-semibold tracking-tight">CV Screener</h1>
        <p className="max-w-2xl text-base text-zinc-600 dark:text-zinc-400">
          {labels.appDescription}
        </p>
      </header>

      <CorpusView
        language={language}
        onLanguageChange={(nextLanguage) => {
          setLanguage(nextLanguage);
        }}
      />
    </main>
  );
}
