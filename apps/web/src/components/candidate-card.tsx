"use client";

import Image from "next/image";
import { useState } from "react";
import type { CandidateSummary } from "../domain/corpus/corpus-summary";
import { toProxyUrl } from "../domain/corpus/proxy-url";

const PORTRAIT_SIZE = 96;

function initialsFor(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";

  return `${first}${last}`.toUpperCase();
}

/** Portrait, name, headline, location, top skills, years of experience. Opens the PDF. */
export function CandidateCard({ candidate }: { candidate: CandidateSummary }) {
  const [portraitFailed, setPortraitFailed] = useState(false);

  return (
    <a
      href={toProxyUrl(candidate.pdfUrl)}
      target="_blank"
      rel="noreferrer"
      className="flex gap-4 rounded-lg border border-zinc-200 p-4 transition-colors hover:border-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 dark:border-zinc-800 dark:hover:border-zinc-600 dark:focus-visible:ring-zinc-100"
    >
      {portraitFailed ? (
        <div
          aria-hidden="true"
          className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-lg font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
        >
          {initialsFor(candidate.fullName)}
        </div>
      ) : (
        <Image
          src={toProxyUrl(candidate.portraitUrl)}
          alt=""
          width={PORTRAIT_SIZE}
          height={PORTRAIT_SIZE}
          className="h-24 w-24 shrink-0 rounded-full bg-zinc-100 object-cover dark:bg-zinc-800"
          onError={() => {
            setPortraitFailed(true);
          }}
        />
      )}

      <div className="flex min-w-0 flex-col gap-1">
        <p className="truncate font-medium text-zinc-900 dark:text-zinc-100">
          {candidate.fullName}
        </p>
        <p className="truncate text-sm text-zinc-600 dark:text-zinc-400">
          {candidate.headline}
        </p>
        <p className="text-sm text-zinc-500 dark:text-zinc-500">
          {candidate.location} · {candidate.yearsExperience} yrs
        </p>
        <ul className="mt-1 flex flex-wrap gap-1">
          {candidate.topSkills.slice(0, 3).map((skill) => (
            <li
              key={skill}
              className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
            >
              {skill}
            </li>
          ))}
        </ul>
      </div>
    </a>
  );
}
