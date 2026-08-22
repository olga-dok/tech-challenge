import { ProfileDraftingError } from '../../../../../src/Cv/Domain/ProfileDraftingError';
import type { ProfilePrompt } from '../../../../../src/Cv/Infrastructure/Drafter/buildProfilePrompt';
import { draftWithOneRetry } from '../../../../../src/Cv/Infrastructure/Drafter/draftWithOneRetry';
import { caughtRejection } from '../../../../support/caughtError';
import { personaFixture, profileFixture } from '../../../../support/fixtures';

const persona = personaFixture();

const generatorOver = (
  responses: string[],
): {
  generate: (prompt: ProfilePrompt) => Promise<string>;
  prompts: ProfilePrompt[];
} => {
  const prompts: ProfilePrompt[] = [];
  let index = 0;

  return {
    prompts,
    generate: (prompt) => {
      prompts.push(prompt);
      const response = responses[Math.min(index, responses.length - 1)];
      index += 1;

      return Promise.resolve(response);
    },
  };
};

describe('draftWithOneRetry', () => {
  it('accepts a valid profile on the first attempt', async () => {
    const { generate, prompts } = generatorOver([
      JSON.stringify(profileFixture()),
    ]);

    await expect(draftWithOneRetry(persona, generate)).resolves.toEqual(
      profileFixture(),
    );
    expect(prompts).toHaveLength(1);
  });

  it('puts the persona facts in front of the model', async () => {
    const { generate, prompts } = generatorOver([
      JSON.stringify(profileFixture()),
    ]);

    await draftWithOneRetry(persona, generate);
    const [prompt] = prompts;

    expect(prompt.user).toContain('Ana Ruiz');
    expect(prompt.user).toContain('Barcelona');
    expect(prompt.user).toContain('Universitat Politècnica de Catalunya (UPC)');
    expect(prompt.user).toContain(
      'mentors regularly at a local coding bootcamp',
    );
    // A Spanish persona must get a Spanish CV, or the multilingual half of the
    // corpus quietly disappears.
    expect(prompt.system).toContain('Spanish');
    expect(prompt.system).toContain('Lorem ipsum');
  });

  it('repairs an invalid profile by showing the model its own validation errors', async () => {
    const invalid = profileFixture();
    const { generate, prompts } = generatorOver([
      JSON.stringify({
        ...invalid,
        experience: [{ ...invalid.experience[0], startDate: 'March 2021' }],
      }),
      JSON.stringify(profileFixture()),
    ]);

    await expect(draftWithOneRetry(persona, generate)).resolves.toEqual(
      profileFixture(),
    );

    expect(prompts).toHaveLength(2);
    // The specific complaint, with its path — this is what makes the second
    // attempt land instead of being the same ask twice.
    expect(prompts[1].user).toContain('experience.0.startDate');
    expect(prompts[1].user).toContain('YYYY-MM');
    expect(prompts[1].user).toContain('March 2021');
  });

  it('recovers when the first answer was prose wrapped around JSON', async () => {
    const { generate } = generatorOver([
      `Here you go:\n\`\`\`json\n${JSON.stringify(profileFixture())}\n\`\`\``,
    ]);

    await expect(draftWithOneRetry(persona, generate)).resolves.toEqual(
      profileFixture(),
    );
  });

  it('gives up after exactly one repair attempt', async () => {
    const { generate, prompts } = generatorOver(['{"fullName":"Ana"}']);

    const error = await caughtRejection(() =>
      draftWithOneRetry(persona, generate),
    );

    expect(error).toBeInstanceOf(ProfileDraftingError);
    // Two calls, not four: a model that cannot satisfy the schema when shown its
    // errors will not on the fifth ask either, and the quota belongs to the next
    // CV.
    expect(prompts).toHaveLength(2);
  });

  it('reports a response with no JSON at all', async () => {
    const { generate } = generatorOver(['I cannot help with that.']);

    const error = await caughtRejection(() =>
      draftWithOneRetry(persona, generate),
    );

    expect(error).toBeInstanceOf(ProfileDraftingError);
    expect((error as Error).message).toContain('Ana Ruiz');
  });

  it('names the candidate in the failure, so a batch summary is actionable', async () => {
    const { generate } = generatorOver(['{}']);

    const error = await caughtRejection(() =>
      draftWithOneRetry(personaFixture({ givenName: 'Mateo' }), generate),
    );

    expect((error as Error).message).toContain('Mateo Ruiz');
  });
});
