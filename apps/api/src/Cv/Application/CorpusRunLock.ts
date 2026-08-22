import { BaseError } from '../../Shared/Domain';

export class CorpusAlreadyGeneratingError extends BaseError {
  private constructor(message: string) {
    super(message);
  }

  static forActiveRun(): CorpusAlreadyGeneratingError {
    return new CorpusAlreadyGeneratingError(
      'A corpus generation run is already in progress. Wait for it to finish, or reload the page to follow it.',
    );
  }
}

/**
 * One run at a time.
 *
 * A double-clicked Generate button would otherwise start two runs over the same
 * plan, and both would race to write the same files and rows. An in-process flag
 * is enough for a prototype that runs as a single API process — a second one
 * would need a database advisory lock, which is noted rather than built because
 * nothing here scales out.
 */
export class CorpusRunLock {
  private active = false;

  acquire(): void {
    if (this.active) {
      throw CorpusAlreadyGeneratingError.forActiveRun();
    }

    this.active = true;
  }

  release(): void {
    this.active = false;
  }

  get isActive(): boolean {
    return this.active;
  }
}
