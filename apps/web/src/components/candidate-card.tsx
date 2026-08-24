"use client";

import { useState } from "react";
import type { RankedCandidate } from "@repo/contracts";
import { CandidateListItem } from "@repo/ui";
import type { CandidateSummary } from "../domain/corpus/corpus-summary";
import { toProxyUrl } from "../domain/corpus/proxy-url";
import { UI_LABELS, type UiLanguage } from "./ui-language";

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
  const skills = candidate.topSkills.slice(0, 4).map((skill) => ({
    label: skill,
    highlighted: isSkillMatched(skill, activeQuestion),
  }));

  return (
    <CandidateListItem
      href={toProxyUrl(candidate.pdfUrl)}
      fullName={candidate.fullName}
      location={candidate.location}
      yearsOfExperience={formatExperience(candidate.yearsExperience)}
      headline={candidate.headline}
      initials={initialsFor(candidate.fullName)}
      portraitUrl={portraitUrl}
      rank={rank ? `#${String(rank.rank)}` : undefined}
      rankTitle={
        rank ? labels.relevanceScoreTitle(rank.rank, rank.score) : undefined
      }
      rankAriaLabel={rank ? labels.relevanceScoreAria : undefined}
      bestMatchLabel={rank ? labels.bestMatch : undefined}
      bestMatchReason={rank?.reason}
      skills={skills}
      onPortraitError={() => {
        setPortraitFailed(true);
      }}
    />
  );
}
