import type {
  CandidateProfile,
  CvTemplateId,
  RoleFamily,
  Seniority,
} from '@repo/contracts';
import type { Persona } from './Persona';
import { personaChecksum } from './personaChecksum';
import type { Slug } from './Slug';

export interface CandidateFiles {
  /** Both paths are relative to the storage directory, so a corpus stays portable. */
  readonly pdfPath: string;
  readonly portraitPath: string;
}

export interface CandidateAttributes {
  readonly id: string | null;
  readonly slug: Slug;
  readonly profile: CandidateProfile;
  readonly persona: PersonaFacts;
  readonly files: CandidateFiles;
  readonly templateId: CvTemplateId;
  readonly sourceChecksum: string;
  readonly createdAt: Date | null;
  readonly ingestedAt: Date | null;
}

/**
 * The persona attributes worth querying on. They are denormalised out of
 * `profileJson` onto columns because the gallery filters and sorts by them, and
 * a JSON path predicate cannot use an index the way a column can.
 */
export interface PersonaFacts {
  readonly country: string;
  readonly roleFamily: RoleFamily;
  readonly seniority: Seniority;
  readonly yearsExperience: number;
}

/**
 * A generated candidate: their CV content, the files it produced, and enough
 * denormalised facts to browse by.
 *
 * `profile` is kept verbatim rather than shredded into columns because it is the
 * corpus ground truth — the evaluation harness derives its golden cases from it,
 * so "who mentions Kubernetes?" has a knowable right answer.
 */
export class Candidate {
  private constructor(private readonly attributes: CandidateAttributes) {}

  static fromAttributes(attributes: CandidateAttributes): Candidate {
    return new Candidate(attributes);
  }

  /** A freshly generated candidate, not yet persisted and not yet indexed. */
  static generated(input: {
    slug: Slug;
    persona: Persona;
    profile: CandidateProfile;
    files: CandidateFiles;
    templateId: CvTemplateId;
  }): Candidate {
    return new Candidate({
      id: null,
      slug: input.slug,
      profile: input.profile,
      persona: {
        country: input.persona.country,
        roleFamily: input.persona.roleFamily,
        seniority: input.persona.seniority,
        yearsExperience: input.persona.yearsExperience,
      },
      files: input.files,
      templateId: input.templateId,
      sourceChecksum: personaChecksum(input.persona),
      createdAt: null,
      ingestedAt: null,
    });
  }

  get id(): string | null {
    return this.attributes.id;
  }

  get slug(): Slug {
    return this.attributes.slug;
  }

  get fullName(): string {
    return this.attributes.profile.fullName;
  }

  get headline(): string {
    return this.attributes.profile.headline;
  }

  get location(): string {
    return this.attributes.profile.contact.location;
  }

  get profile(): CandidateProfile {
    return this.attributes.profile;
  }

  get persona(): PersonaFacts {
    return this.attributes.persona;
  }

  get files(): CandidateFiles {
    return this.attributes.files;
  }

  get templateId(): CvTemplateId {
    return this.attributes.templateId;
  }

  get sourceChecksum(): string {
    return this.attributes.sourceChecksum;
  }

  get ingestedAt(): Date | null {
    return this.attributes.ingestedAt;
  }

  /** The skills a card shows. Order is the model's — most relevant first. */
  topSkills(count = 3): string[] {
    return this.attributes.profile.skills.slice(0, count);
  }

  languages(): string[] {
    return this.attributes.profile.languages.map((entry) => entry.language);
  }

  isIngested(): boolean {
    return this.attributes.ingestedAt !== null;
  }

  mentionsSkill(skill: string): boolean {
    const needle = skill.toLowerCase();

    return this.attributes.profile.skills.some(
      (candidateSkill) => candidateSkill.toLowerCase() === needle,
    );
  }
}
