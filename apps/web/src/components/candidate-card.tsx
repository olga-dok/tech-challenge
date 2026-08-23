"use client";

import { useState } from "react";
import type { RankedCandidate } from "@repo/contracts";
import { Avatar, Badge, Card } from "@repo/ui";
import type { CandidateSummary } from "../domain/corpus/corpus-summary";
import { toProxyUrl } from "../domain/corpus/proxy-url";
import { UI_LABELS, type UiLanguage } from "./ui-language";

const PORTRAIT_SIZE = 56;

function formatExperience(yearsExperience: number): string {
  return `${String(yearsExperience)} ${yearsExperience === 1 ? "year" : "years"} of experience`;
}

function initialsFor(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";

  return `${first}${last}`.toUpperCase();
}

function normalize(value: string): string {
  return value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

function isSkillMatched(skill: string, question?: string): boolean {
  if (!question) {
    return false;
  }
  const normalizedSkill = normalize(skill);
  const normalizedQuestion = normalize(question);
  return normalizedQuestion.includes(normalizedSkill);
}

/** Portrait, name, headline, location, top skills, years of experience. Opens the PDF. */
export function CandidateCard({
  candidate,
  rank,
  activeQuestion,
  language,
}: {
  candidate: CandidateSummary;
  rank?: RankedCandidate;
  activeQuestion?: string;
  language: UiLanguage;
}) {
  const labels = UI_LABELS[language];
  const [portraitFailed, setPortraitFailed] = useState(false);
  const portraitUrl = portraitFailed ? "" : toProxyUrl(candidate.portraitUrl);

  return (
    <Card className="p-0 transition-colors hover:border-zinc-400 dark:hover:border-zinc-600">
      <a
        href={toProxyUrl(candidate.pdfUrl)}
        target="_blank"
        rel="noreferrer"
        className="flex min-w-0 items-start gap-2.5 p-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100"
      >
        <Avatar
          src={portraitUrl}
          alt=""
          fallback={initialsFor(candidate.fullName)}
          size={PORTRAIT_SIZE}
          className="text-sm"
          onImageError={() => {
            setPortraitFailed(true);
          }}
        />

        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-zinc-500 dark:text-zinc-500">
              <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {candidate.fullName}
              </p>
              <span className="truncate">• {candidate.location}</span>
              <span className="truncate">
                • {formatExperience(candidate.yearsExperience)}
              </span>
            </div>
            {rank ? (
              <span
                className="shrink-0 rounded-full border border-zinc-300 px-2 py-0.5 text-xs font-medium text-zinc-700 dark:border-zinc-700 dark:text-zinc-200"
                title={labels.relevanceScoreTitle(rank.rank, rank.score)}
                aria-label={labels.relevanceScoreAria}
              >
                #{rank.rank}
              </span>
            ) : null}
          </div>
          <p className="truncate text-xs text-zinc-600 dark:text-zinc-400">
            {candidate.headline}
          </p>
          {rank ? (
            <p className="line-clamp-1 text-xs text-zinc-600 dark:text-zinc-300">
              <span className="font-medium">{labels.bestMatch}:</span>{" "}
              {rank.reason}
            </p>
          ) : null}
          <ul className="mt-0.5 flex flex-wrap gap-1">
            {candidate.topSkills.slice(0, 4).map((skill) => (
              <li key={skill}>
                <Badge
                  className={`px-1.5 py-0 text-[11px] ${
                    isSkillMatched(skill, activeQuestion)
                      ? "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200"
                      : ""
                  }`}
                >
                  {skill}
                </Badge>
              </li>
            ))}
          </ul>
        </div>
      </a>
    </Card>
  );
}
