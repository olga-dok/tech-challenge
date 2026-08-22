import type { CandidateProfile } from '@repo/contracts';
import { sampleProfile } from '@repo/cv-templates';
import { normaliseProfile } from '../../../../../src/Cv/Infrastructure/Drafter/normaliseProfile';

type Experience = CandidateProfile['experience'][number];

const job = (
  company: string,
  startDate: string,
  endDate: string | null,
): Experience => ({
  company,
  role: 'Engineer',
  startDate,
  endDate,
  location: 'Barcelona, Spain',
  bullets: ['Did the work.'],
});

const profileWith = (experience: Experience[]): CandidateProfile => ({
  ...sampleProfile(),
  experience,
});

const companies = (profile: CandidateProfile): string[] =>
  profile.experience.map((entry) => entry.company);

describe('normaliseProfile', () => {
  it('puts the most recent role first when the model listed them oldest-first', () => {
    const normalised = normaliseProfile(
      profileWith([
        job('Oldest', '2008-03', '2011-08'),
        job('Middle', '2011-09', '2015-05'),
        job('Newest', '2016-09', '2020-12'),
      ]),
    );

    expect(companies(normalised)).toEqual(['Newest', 'Middle', 'Oldest']);
  });

  it('leaves a correctly ordered history alone', () => {
    const alreadyRight = profileWith([
      job('Current', '2021-01', null),
      job('Previous', '2016-09', '2020-12'),
    ]);

    expect(companies(normaliseProfile(alreadyRight))).toEqual([
      'Current',
      'Previous',
    ]);
  });

  it('ranks the current role above every finished one', () => {
    const normalised = normaliseProfile(
      profileWith([
        job('Ended recently', '2019-01', '2024-06'),
        job('Current', '2018-01', null),
      ]),
    );

    expect(companies(normalised)[0]).toBe('Current');
  });

  it('orders two current roles by when they began', () => {
    const normalised = normaliseProfile(
      profileWith([
        job('Older side role', '2019-01', null),
        job('New main role', '2024-02', null),
      ]),
    );

    expect(companies(normalised)).toEqual(['New main role', 'Older side role']);
  });

  it('keeps an internal promotion in order when two roles end together', () => {
    const normalised = normaliseProfile(
      profileWith([
        job('Junior stint', '2013-11', '2019-01'),
        job('Senior stint', '2016-04', '2019-01'),
      ]),
    );

    expect(companies(normalised)).toEqual(['Senior stint', 'Junior stint']);
  });

  it('sorts education newest first', () => {
    const normalised = normaliseProfile({
      ...sampleProfile(),
      education: [
        {
          institution: 'Older',
          degree: 'BSc',
          field: 'Statistics',
          graduationYear: 2008,
          location: 'Barcelona, Spain',
        },
        {
          institution: 'Newer',
          degree: 'MSc',
          field: 'Data',
          graduationYear: 2010,
          location: 'Barcelona, Spain',
        },
      ],
    });

    expect(normalised.education.map((entry) => entry.institution)).toEqual([
      'Newer',
      'Older',
    ]);
  });

  it('changes nothing but the order', () => {
    const profile = sampleProfile();
    const normalised = normaliseProfile(profile);

    expect(normalised.fullName).toBe(profile.fullName);
    expect(normalised.summary).toBe(profile.summary);
    expect(normalised.skills).toEqual(profile.skills);
    expect(normalised.experience).toHaveLength(profile.experience.length);
    expect(profile.experience.map((entry) => entry.company).sort()).toEqual(
      companies(normalised).sort(),
    );
  });

  it('does not mutate the profile it was given', () => {
    const profile = profileWith([
      job('Oldest', '2008-03', '2011-08'),
      job('Newest', '2016-09', null),
    ]);

    normaliseProfile(profile);

    expect(companies(profile)).toEqual(['Oldest', 'Newest']);
  });
});
