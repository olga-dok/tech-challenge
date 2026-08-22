export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-3 p-16 text-center">
      <h1 className="text-3xl font-semibold tracking-tight">CV Screener</h1>
      <p className="max-w-md text-base text-zinc-600 dark:text-zinc-400">
        Generate a corpus of CVs, browse the candidates, and ask questions the
        gallery answers back.
      </p>
    </main>
  );
}
