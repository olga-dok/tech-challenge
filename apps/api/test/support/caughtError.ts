/**
 * Runs `act` and hands back whatever it threw.
 *
 * Domain errors expose static factories over a private constructor, and Jest's
 * `toThrow(SomeError)` needs a publicly constructable class — so assertions go
 * through `expect(caughtError(...)).toBeInstanceOf(SomeError)` instead.
 */
export function caughtError(act: () => unknown): unknown {
  try {
    act();
  } catch (error: unknown) {
    return error;
  }

  throw new Error('Expected the call to throw, but it returned normally');
}

/** The awaited counterpart, for ports and adapters that reject rather than throw. */
export async function caughtRejection(
  act: () => Promise<unknown>,
): Promise<unknown> {
  try {
    await act();
  } catch (error: unknown) {
    return error;
  }

  throw new Error('Expected the call to reject, but it resolved');
}
