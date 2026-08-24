export type SourceListItem = {
  key: string;
  href: string;
  label: string;
  title?: string;
};

export function SourceList({
  heading,
  items,
}: {
  heading: string;
  items: readonly SourceListItem[];
}) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{heading}</p>
      {items.map((item) => (
        <a
          key={item.key}
          href={item.href}
          target="_blank"
          rel="noreferrer"
          className="rounded-full border border-zinc-300 px-2 py-1 text-xs text-zinc-700 transition-colors hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800 dark:focus-visible:ring-zinc-100"
          title={item.title}
        >
          {item.label}
        </a>
      ))}
    </div>
  );
}
