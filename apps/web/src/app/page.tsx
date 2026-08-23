import { Suspense } from "react";
import type { Metadata } from "next";
import { CorpusView } from "../components/corpus-view";

export const metadata: Metadata = {
  title: "CV Screener",
  description:
    "Search and screen candidates with AI-powered answers grounded in their CVs.",
};

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 p-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-3xl font-semibold tracking-tight">CV Screener</h1>
        <p className="max-w-2xl text-base text-zinc-600 dark:text-zinc-400">
          Search and screen candidates with AI-powered answers grounded in their
          CVs.
        </p>
      </header>

      {/* useSearchParams (via CorpusView) requires a Suspense boundary. */}
      <Suspense fallback={null}>
        <CorpusView />
      </Suspense>
    </main>
  );
}
