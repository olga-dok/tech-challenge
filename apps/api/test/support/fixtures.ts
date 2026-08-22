import type { CandidateProfile } from '@repo/contracts';
import { Persona, type PersonaAttributes } from '../../src/Cv/Domain/Persona';

export const personaFixture = (
  overrides: Partial<PersonaAttributes> = {},
): Persona =>
  Persona.from({
    givenName: 'Ana',
    familyName: 'Ruiz',
    roleFamily: 'BACKEND',
    role: 'Senior Backend Engineer',
    seniority: 'SENIOR',
    industry: 'fintech',
    city: 'Barcelona',
    country: 'Spain',
    primaryLanguage: 'Spanish',
    cvLanguage: 'es',
    university: 'Universitat Politècnica de Catalunya (UPC)',
    yearsExperience: 11,
    distinctiveTraits: [
      'maintains a small open-source library used by other teams',
      'mentors regularly at a local coding bootcamp',
    ],
    ...overrides,
  });

export const profileFixture = (): CandidateProfile => ({
  fullName: 'Ana Ruiz',
  headline: 'Senior Backend Engineer',
  contact: {
    email: 'ana.ruiz@example.test',
    phone: '+34 600 111 222',
    location: 'Barcelona, Spain',
    linkedin: null,
  },
  summary:
    'Ingeniera de backend con once años construyendo servicios de pagos en Python y Go.',
  experience: [
    {
      company: 'Nimbus Pagos',
      role: 'Senior Backend Engineer',
      startDate: '2021-03',
      endDate: null,
      location: 'Barcelona, Spain',
      bullets: ['Migró el servicio de libro mayor a Kubernetes.'],
    },
  ],
  education: [
    {
      institution: 'Universitat Politècnica de Catalunya (UPC)',
      degree: 'Grado',
      field: 'Ingeniería Informática',
      graduationYear: 2014,
      location: 'Barcelona, Spain',
    },
  ],
  skills: ['Python', 'Go', 'Kubernetes'],
  languages: [{ language: 'Español', level: 'NATIVE' }],
  certifications: [],
});
