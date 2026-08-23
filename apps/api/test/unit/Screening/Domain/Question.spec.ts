import { InvalidQuestionError } from '../../../../src/Screening/Domain/InvalidQuestionError';
import { Question } from '../../../../src/Screening/Domain/Question';
import { caughtError } from '../../../support/caughtError';

describe('Question', () => {
  it('accepts a normal question and trims surrounding whitespace', () => {
    const question = Question.from('  Who knows Kubernetes?  ');

    expect(question.text).toBe('Who knows Kubernetes?');
  });

  it('rejects an empty question', () => {
    const error = caughtError(() => Question.from(''));

    expect(error).toBeInstanceOf(InvalidQuestionError);
  });

  it('rejects a whitespace-only question', () => {
    const error = caughtError(() => Question.from('   '));

    expect(error).toBeInstanceOf(InvalidQuestionError);
  });

  it('rejects a question over 500 characters', () => {
    const error = caughtError(() => Question.from('a'.repeat(501)));

    expect(error).toBeInstanceOf(InvalidQuestionError);
  });

  it('accepts a question at exactly the 500 character limit', () => {
    expect(() => Question.from('a'.repeat(500))).not.toThrow();
  });
});
