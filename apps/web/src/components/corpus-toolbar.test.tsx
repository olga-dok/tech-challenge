import { render, screen } from "@testing-library/react";
import { CorpusToolbar } from "./corpus-toolbar";
import {
  IDLE_GENERATION_STATE,
  type GenerationState,
} from "./generation-state";

describe("CorpusToolbar", () => {
  it('shows "Generate corpus" when the corpus is not ingested', () => {
    render(
      <CorpusToolbar
        language="en"
        isIngested={false}
        state={IDLE_GENERATION_STATE}
        onGenerate={jest.fn()}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Generate corpus" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Regenerate" }),
    ).not.toBeInTheDocument();
  });

  it("does not show a corpus action button when the corpus is already ingested", () => {
    render(
      <CorpusToolbar
        language="en"
        isIngested={true}
        state={IDLE_GENERATION_STATE}
        onGenerate={jest.fn()}
      />,
    );

    expect(
      screen.queryByRole("button", { name: "Generate corpus" }),
    ).not.toBeInTheDocument();
  });

  it("disables the button while a run is active", () => {
    const running: GenerationState = {
      ...IDLE_GENERATION_STATE,
      status: "running",
    };
    render(
      <CorpusToolbar
        language="en"
        isIngested={false}
        state={running}
        onGenerate={jest.fn()}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Generate corpus" }),
    ).toBeDisabled();
  });

  it("renders the throttle countdown label", () => {
    const throttled: GenerationState = {
      ...IDLE_GENERATION_STATE,
      status: "throttled",
      throttleDelayMs: 3000,
    };
    render(
      <CorpusToolbar
        language="en"
        isIngested={false}
        state={throttled}
        onGenerate={jest.fn()}
      />,
    );

    expect(screen.getByText(/waiting out a rate limit/)).toBeInTheDocument();
  });

  it('shows "Generate remaining N" after a run ended with gaps', () => {
    const endedWithGaps: GenerationState = {
      ...IDLE_GENERATION_STATE,
      status: "idle",
      failedCount: 2,
      endedWithGaps: true,
    };
    render(
      <CorpusToolbar
        language="en"
        isIngested={true}
        state={endedWithGaps}
        onGenerate={jest.fn()}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Generate remaining 2" }),
    ).toBeInTheDocument();
  });
});
