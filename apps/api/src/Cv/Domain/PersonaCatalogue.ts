import type { CvLanguage, RoleFamily, Seniority } from '@repo/contracts';
import type { PersonaGender } from './Persona';

/**
 * The raw material the planner deals from. Pure data, deliberately hand-written
 * rather than generated: the corpus has to read like thirty different people
 * wrote it, and the LLM cannot supply that variety when it is asked thirty times
 * in a row with the same prompt. This is where the variety actually comes from.
 *
 * Sizes are chosen, not incidental — see `CyclicDeck` for why the name decks are
 * 9/10 and 11/12 rather than round numbers.
 */

export interface RoleFamilyProfile {
  readonly roles: readonly string[];
  /**
   * Titles only a senior can hold. Kept apart so the planner cannot deal a
   * three-year "Design Lead" — a CV nobody would believe, which is worse than a
   * boring one.
   */
  readonly seniorOnlyRoles: readonly string[];
  readonly industries: readonly string[];
}

export interface CityProfile {
  readonly city: string;
  readonly country: string;
  readonly primaryLanguage: string;
  readonly universities: readonly string[];
}

export interface SeniorityTier {
  readonly seniority: Seniority;
  readonly minYears: number;
  readonly maxYears: number;
}

export const ROLE_FAMILY_PROFILES: Record<RoleFamily, RoleFamilyProfile> = {
  BACKEND: {
    roles: ['Backend Engineer', 'Platform Engineer', 'API Engineer'],
    seniorOnlyRoles: ['Staff Backend Engineer', 'Principal Engineer'],
    industries: ['fintech', 'logistics', 'e-commerce'],
  },
  FRONTEND: {
    roles: ['Frontend Engineer', 'Web Engineer', 'Design Systems Engineer'],
    seniorOnlyRoles: ['Staff Frontend Engineer', 'Frontend Tech Lead'],
    industries: ['digital media', 'travel', 'B2B SaaS'],
  },
  DATA: {
    roles: ['Data Engineer', 'Analytics Engineer', 'Data Analyst'],
    seniorOnlyRoles: ['Principal Data Engineer', 'Data Platform Lead'],
    industries: ['grocery retail', 'renewable energy', 'public sector'],
  },
  MACHINE_LEARNING: {
    roles: ['Machine Learning Engineer', 'NLP Engineer', 'Research Engineer'],
    seniorOnlyRoles: [
      'Principal Machine Learning Engineer',
      'Machine Learning Tech Lead',
    ],
    industries: ['health tech', 'ad tech', 'industrial robotics'],
  },
  DEVOPS: {
    roles: [
      'Site Reliability Engineer',
      'DevOps Engineer',
      'Cloud Infrastructure Engineer',
    ],
    seniorOnlyRoles: ['Principal SRE', 'Platform Team Lead'],
    industries: ['retail banking', 'online gaming', 'telecoms'],
  },
  DESIGN: {
    roles: ['Product Designer', 'UX Designer', 'UX Researcher'],
    seniorOnlyRoles: ['Design Lead', 'Principal Product Designer'],
    industries: ['urban mobility', 'education', 'marketplaces'],
  },
  PRODUCT: {
    roles: ['Product Manager', 'Technical Product Manager', 'Product Owner'],
    seniorOnlyRoles: ['Group Product Manager', 'Head of Product'],
    industries: ['insurance', 'HR tech', 'developer tooling'],
  },
};

export const ROLE_FAMILY_ORDER: readonly RoleFamily[] = [
  'BACKEND',
  'FRONTEND',
  'DATA',
  'MACHINE_LEARNING',
  'DEVOPS',
  'DESIGN',
  'PRODUCT',
];

export const SENIORITY_TIERS: readonly SeniorityTier[] = [
  { seniority: 'JUNIOR', minYears: 1, maxYears: 3 },
  { seniority: 'MID', minYears: 4, maxYears: 8 },
  { seniority: 'SENIOR', minYears: 9, maxYears: 16 },
];

/**
 * Universitat Politècnica de Catalunya is here because the brief's own sample
 * questions ask who studied at UPC — a question with no answer in the corpus
 * tests nothing.
 */
export const SPANISH_SPEAKING_CITIES: readonly CityProfile[] = [
  {
    city: 'Barcelona',
    country: 'Spain',
    primaryLanguage: 'Spanish',
    universities: [
      'Universitat Politècnica de Catalunya (UPC)',
      'Universitat de Barcelona',
    ],
  },
  {
    city: 'Madrid',
    country: 'Spain',
    primaryLanguage: 'Spanish',
    universities: [
      'Universidad Politécnica de Madrid',
      'Universidad Complutense de Madrid',
    ],
  },
  {
    city: 'Valencia',
    country: 'Spain',
    primaryLanguage: 'Spanish',
    universities: ['Universitat Politècnica de València'],
  },
  {
    city: 'Ciudad de México',
    country: 'Mexico',
    primaryLanguage: 'Spanish',
    universities: [
      'Universidad Nacional Autónoma de México',
      'Tecnológico de Monterrey',
    ],
  },
  {
    city: 'Buenos Aires',
    country: 'Argentina',
    primaryLanguage: 'Spanish',
    universities: ['Universidad de Buenos Aires'],
  },
  {
    city: 'Bogotá',
    country: 'Colombia',
    primaryLanguage: 'Spanish',
    universities: ['Universidad de los Andes'],
  },
];

export const OTHER_CITIES: readonly CityProfile[] = [
  {
    city: 'Berlin',
    country: 'Germany',
    primaryLanguage: 'German',
    universities: ['Technische Universität Berlin'],
  },
  {
    city: 'Amsterdam',
    country: 'Netherlands',
    primaryLanguage: 'Dutch',
    universities: ['University of Amsterdam', 'Delft University of Technology'],
  },
  {
    city: 'Dublin',
    country: 'Ireland',
    primaryLanguage: 'English',
    universities: ['Trinity College Dublin'],
  },
  {
    city: 'Lisbon',
    country: 'Portugal',
    primaryLanguage: 'Portuguese',
    universities: ['Instituto Superior Técnico'],
  },
  {
    city: 'London',
    country: 'United Kingdom',
    primaryLanguage: 'English',
    universities: ['University College London', 'Imperial College London'],
  },
  {
    city: 'Warsaw',
    country: 'Poland',
    primaryLanguage: 'Polish',
    universities: ['Warsaw University of Technology'],
  },
  {
    city: 'Stockholm',
    country: 'Sweden',
    primaryLanguage: 'Swedish',
    universities: ['KTH Royal Institute of Technology'],
  },
  {
    city: 'Toronto',
    country: 'Canada',
    primaryLanguage: 'English',
    universities: ['University of Toronto'],
  },
  {
    city: 'Milan',
    country: 'Italy',
    primaryLanguage: 'Italian',
    universities: ['Politecnico di Milano'],
  },
];

/**
 * Two of every five CVs are written in Spanish. A ring of five rather than three
 * keeps the language from lining up with the seniority cycle, which has period
 * three — otherwise every Spanish CV in the corpus would belong to a senior.
 */
export const CV_LANGUAGE_RING: readonly CvLanguage[] = [
  'en',
  'es',
  'en',
  'en',
  'es',
];

export interface GivenName {
  readonly name: string;
  readonly gender: PersonaGender;
}

/**
 * Names carry the gender they were chosen with, rather than anything downstream
 * guessing it.
 *
 * A guess is both unreliable — plenty of names are used for anyone — and
 * consequential here: the portrait painter needs it to produce a photo that
 * matches the CV, and Spanish job titles are gendered, so "Ingeniera" or
 * "Ingeniero" depends on it. Deciding it in the plan makes it a fact about an
 * invented person instead of an inference about a real one.
 *
 * 'Ana' is absent on purpose: the planted namesake pair owns that name.
 */
export const SPANISH_GIVEN_NAMES: readonly GivenName[] = [
  { name: 'Lucía', gender: 'female' },
  { name: 'Mateo', gender: 'male' },
  { name: 'Javier', gender: 'male' },
  { name: 'Carmen', gender: 'female' },
  { name: 'Diego', gender: 'male' },
  { name: 'Elena', gender: 'female' },
  { name: 'Pablo', gender: 'male' },
  { name: 'Rocío', gender: 'female' },
  { name: 'Álvaro', gender: 'male' },
];

export const SPANISH_FAMILY_NAMES: readonly string[] = [
  'Ruiz',
  'Moreno',
  'Delgado',
  'Iglesias',
  'Vidal',
  'Serrano',
  'Navarro',
  'Castaño',
  'Bermúdez',
  'Fuentes',
];

export const INTERNATIONAL_GIVEN_NAMES: readonly GivenName[] = [
  { name: 'Noor', gender: 'female' },
  { name: 'Ingrid', gender: 'female' },
  { name: 'Tomasz', gender: 'male' },
  { name: 'Kwame', gender: 'male' },
  { name: 'Marta', gender: 'female' },
  { name: 'Sanne', gender: 'female' },
  { name: 'Aoife', gender: 'female' },
  { name: 'Luca', gender: 'male' },
  { name: 'Nadia', gender: 'female' },
  { name: 'Hugo', gender: 'male' },
  { name: 'Emeka', gender: 'male' },
];

export const INTERNATIONAL_FAMILY_NAMES: readonly string[] = [
  'Okafor',
  'Lindqvist',
  'Novák',
  'Bauer',
  'Kowalski',
  'Hendriks',
  'Byrne',
  'Rossi',
  'Haddad',
  'Mercer',
  'Adeyemi',
  'Vasseur',
];

/**
 * The cure for thirty CVs that all say "passionate about clean code". Each trait
 * is a concrete biographical fact the drafter has to write around, so the
 * summaries diverge because the lives do.
 */
export const DISTINCTIVE_TRAITS: readonly string[] = [
  'switched careers from teaching secondary-school mathematics',
  'spent eight years at a single company, growing through three roles',
  'maintains a small open-source library used by other teams',
  'took a twelve-month unpaid sabbatical to travel, and says so plainly',
  'joined as an intern and was promoted twice in four years',
  'moved countries mid-career and re-qualified locally',
  'has only ever worked at companies of fewer than twenty people',
  'led a team for a year, then deliberately returned to hands-on work',
  'freelanced for two years between staff roles',
  'mentors regularly at a local coding bootcamp',
  'left a research post to work in industry',
  'built the first version of a product that was later shut down',
  'runs a small side business at weekends',
  'shipped a regulated product through an external audit',
];
