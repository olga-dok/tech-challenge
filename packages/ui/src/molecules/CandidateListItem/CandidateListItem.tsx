import { Avatar } from "../Avatar";
import { Badge } from "../../atoms/Badge";
import { Card } from "../Card";

type SkillBadge = {
  label: string;
  highlighted?: boolean;
};

export function CandidateListItem({
  href,
  fullName,
  location,
  yearsOfExperience,
  headline,
  initials,
  portraitUrl,
  rank,
  rankTitle,
  rankAriaLabel,
  bestMatchLabel,
  bestMatchReason,
  skills,
  onPortraitError,
}: {
  href: string;
  fullName: string;
  location: string;
  yearsOfExperience: string;
  headline: string;
  initials: string;
  portraitUrl: string;
  rank?: string;
  rankTitle?: string;
  rankAriaLabel?: string;
  bestMatchLabel?: string;
  bestMatchReason?: string;
  skills: readonly SkillBadge[];
  onPortraitError?: () => void;
}) {
  return (
    <Card className="p-0 transition-colors hover:border-zinc-400 dark:hover:border-zinc-600">
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="flex min-w-0 items-start gap-2.5 p-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100"
      >
        <Avatar
          src={portraitUrl}
          alt=""
          fallback={initials}
          size={56}
          className="text-sm"
          onImageError={onPortraitError}
        />

        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-zinc-500 dark:text-zinc-500">
              <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {fullName}
              </p>
              <span className="truncate">• {location}</span>
              <span className="truncate">• {yearsOfExperience}</span>
            </div>
            {rank ? (
              <span
                className="shrink-0 rounded-full border border-zinc-300 px-2 py-0.5 text-xs font-medium text-zinc-700 dark:border-zinc-700 dark:text-zinc-200"
                title={rankTitle}
                aria-label={rankAriaLabel}
              >
                {rank}
              </span>
            ) : null}
          </div>
          <p className="truncate text-xs text-zinc-600 dark:text-zinc-400">{headline}</p>
          {bestMatchReason && bestMatchLabel ? (
            <p className="line-clamp-1 text-xs text-zinc-600 dark:text-zinc-300">
              <span className="font-medium">{bestMatchLabel}:</span> {bestMatchReason}
            </p>
          ) : null}
          <ul className="mt-0.5 flex flex-wrap gap-1">
            {skills.map((skill) => (
              <li key={skill.label}>
                <Badge
                  className={`px-1.5 py-0 text-[11px] ${
                    skill.highlighted
                      ? "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200"
                      : ""
                  }`}
                >
                  {skill.label}
                </Badge>
              </li>
            ))}
          </ul>
        </div>
      </a>
    </Card>
  );
}
