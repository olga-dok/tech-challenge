import {
  AskQuestionRequestSchema,
  CandidatePageSchema,
  CandidateProfileSchema,
  CandidateSummarySchema,
  GenerateCorpusRequestSchema,
  GenerationStreamEventSchema,
  ScreeningStreamEventSchema,
} from './index';

const PROFILE = {
  fullName: 'Ana Ruiz',
  headline: 'Senior Backend Engineer',
  contact: {
    email: 'ana.ruiz@example.com',
    phone: '+34 600 000 000',
    location: 'Barcelona, Spain',
    linkedin: null,
  },
  summary:
    'Backend engineer with seven years building payment services in Python and Go.',
  experience: [
    {
      company: 'Nimbus Pay',
      role: 'Senior Backend Engineer',
      startDate: '2021-03',
      endDate: null,
      location: 'Barcelona, Spain',
      bullets: ['Led the migration of the ledger service to Kubernetes.'],
    },
  ],
  education: [
    {
      institution: 'Universitat Politècnica de Catalunya',
      degree: 'BSc',
      field: 'Computer Science',
      graduationYear: 2016,
      location: 'Barcelona, Spain',
    },
  ],
  skills: ['Python', 'Go', 'Kubernetes'],
  languages: [{ language: 'Spanish', level: 'NATIVE' }],
  certifications: [],
};

const SUMMARY_DTO = {
  id: '3f1a7d4e-6f2b-4c1a-9f3d-8b7c6d5e4f3a',
  slug: 'ana-ruiz',
  fullName: 'Ana Ruiz',
  headline: 'Senior Backend Engineer',
  location: 'Barcelona, Spain',
  topSkills: ['Python', 'Go', 'Kubernetes'],
  yearsExperience: 7,
  seniority: 'SENIOR',
  portraitUrl: '/cvs/ana-ruiz/portrait',
  pdfUrl: '/cvs/ana-ruiz/pdf',
};

describe('CandidateProfileSchema', () => {
  it('round-trips a complete profile', () => {
    expect(CandidateProfileSchema.parse(PROFILE)).toEqual(PROFILE);
  });

  it('drops keys the model invented rather than failing the whole draft', () => {
    const parsed = CandidateProfileSchema.parse({
      ...PROFILE,
      hobbies: ['climbing'],
    });

    expect(parsed).not.toHaveProperty('hobbies');
  });

  it('rejects a month the PDF template could not render', () => {
    const result = CandidateProfileSchema.safeParse({
      ...PROFILE,
      experience: [{ ...PROFILE.experience[0], startDate: 'March 2021' }],
    });

    expect(result.success).toBe(false);
  });

  it('requires an explicit null for a missing linkedin, not an absent key', () => {
    const contactWithoutLinkedin = {
      email: PROFILE.contact.email,
      phone: PROFILE.contact.phone,
      location: PROFILE.contact.location,
    };

    expect(
      CandidateProfileSchema.safeParse({
        ...PROFILE,
        contact: contactWithoutLinkedin,
      }).success,
    ).toBe(false);
  });
});

describe('request schemas', () => {
  it('defaults a corpus request to 25 unforced CVs', () => {
    expect(GenerateCorpusRequestSchema.parse({})).toEqual({
      size: 25,
      force: false,
    });
  });

  it('caps the corpus at what a free tier can survive', () => {
    expect(GenerateCorpusRequestSchema.safeParse({ size: 41 }).success).toBe(
      false,
    );
  });

  it('defaults a question to grounded mode and trims it', () => {
    expect(
      AskQuestionRequestSchema.parse({ question: '  Who knows Python?  ' }),
    ).toEqual({ question: 'Who knows Python?', mode: 'grounded' });
  });

  it('rejects an empty question and a pasted job description', () => {
    expect(
      AskQuestionRequestSchema.safeParse({ question: '   ' }).success,
    ).toBe(false);
    expect(
      AskQuestionRequestSchema.safeParse({ question: 'x'.repeat(501) }).success,
    ).toBe(false);
  });
});

describe('CandidatePageSchema', () => {
  it('round-trips a page of summaries', () => {
    const page = {
      items: [SUMMARY_DTO],
      page: 1,
      pageSize: 12,
      total: 30,
      totalPages: 3,
    };

    expect(CandidatePageSchema.parse(page)).toEqual(page);
  });

  it('rejects a slug that could walk out of the storage directory', () => {
    expect(
      CandidateSummarySchema.safeParse({ ...SUMMARY_DTO, slug: '../../etc' })
        .success,
    ).toBe(false);
  });
});

describe('stream protocols', () => {
  it('discriminates every generation event on type', () => {
    const events = [
      { type: 'plan', total: 30, batches: 6, batchSize: 5 },
      { type: 'batch_started', batch: 1, of: 6, size: 5 },
      {
        type: 'cv_started',
        index: 0,
        personaLabel: 'Senior backend · Barcelona',
      },
      { type: 'cv_completed', index: 0, candidate: SUMMARY_DTO },
      { type: 'cv_failed', index: 1, reason: 'drafting failed' },
      {
        type: 'batch_completed',
        batch: 1,
        of: 6,
        generated: 4,
        failed: 1,
        skipped: 0,
        nextDelayMs: 1500,
      },
      { type: 'throttled', batch: 2, delayMs: 3000 },
      { type: 'ingest_started' },
      { type: 'ingest_progress', done: 12, total: 30 },
      {
        type: 'done',
        summary: {
          generated: 29,
          failed: 1,
          skipped: 0,
          chunks: 351,
          durationMs: 240_000,
        },
      },
      { type: 'error', message: 'the corpus is already generating' },
    ];

    for (const event of events) {
      expect(GenerationStreamEventSchema.parse(event)).toEqual(event);
    }
  });

  it('carries the gallery ranking on the retrieval event, before any token', () => {
    const retrieval = {
      type: 'retrieval',
      citations: [
        {
          candidateId: SUMMARY_DTO.id,
          candidateName: 'Ana Ruiz',
          slug: 'ana-ruiz',
          section: 'EXPERIENCE',
          ordinal: 3,
          snippet: 'Led the migration of the ledger service to Kubernetes.',
          score: 0.82,
        },
      ],
      ranking: [
        {
          slug: 'ana-ruiz',
          rank: 1,
          score: 0.82,
          reason: 'EXPERIENCE — Kubernetes migration',
        },
      ],
    };

    expect(ScreeningStreamEventSchema.parse(retrieval)).toEqual(retrieval);
  });

  it('discriminates the remaining screening events', () => {
    const events = [
      { type: 'status', stage: 'retrieving' },
      { type: 'token', data: 'Ana' },
      { type: 'tool_start', toolName: 'search_cvs' },
      { type: 'tool_result', toolName: 'search_cvs', summary: '8 chunks' },
      { type: 'answer_ended' },
      { type: 'done' },
      { type: 'error', message: 'the corpus is not ingested yet' },
    ];

    for (const event of events) {
      expect(ScreeningStreamEventSchema.parse(event)).toEqual(event);
    }
  });

  it('rejects an event type neither side declared', () => {
    expect(
      ScreeningStreamEventSchema.safeParse({ type: 'thinking' }).success,
    ).toBe(false);
  });
});
