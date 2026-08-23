import type { UiLanguage } from "./ui-language";

export function LanguageSwitcher({
  language,
  onChange,
}: {
  language: UiLanguage;
  onChange: (language: UiLanguage) => void;
}) {
  return (
    <div
      role="group"
      aria-label="UI language"
      className="inline-flex items-center rounded-full border border-zinc-300 bg-white p-0.5 dark:border-zinc-700 dark:bg-zinc-950"
    >
      <button
        type="button"
        onClick={() => {
          onChange("en");
        }}
        aria-pressed={language === "en"}
        className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100 ${
          language === "en"
            ? "bg-zinc-900 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-900"
            : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
        }`}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => {
          onChange("es");
        }}
        aria-pressed={language === "es"}
        className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100 ${
          language === "es"
            ? "bg-zinc-900 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-900"
            : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
        }`}
      >
        ES
      </button>
    </div>
  );
}
