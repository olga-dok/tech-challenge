import { fireEvent, render, screen } from "@testing-library/react";
import type { CandidateSummary } from "../domain/corpus/corpus-summary";
import { CandidateCard } from "./candidate-card";

const candidate: CandidateSummary = {
  id: "8f14e45f-ceea-467e-adc0-14dbc8f5c882",
  slug: "ana-ruiz",
  fullName: "Ana Ruiz",
  headline: "Senior Backend Engineer",
  location: "Madrid, Spain",
  topSkills: ["Kubernetes", "Go", "PostgreSQL", "Redis"],
  yearsExperience: 8,
  seniority: "SENIOR",
  portraitUrl: "/cvs/ana-ruiz/portrait",
  pdfUrl: "/cvs/ana-ruiz/pdf",
};

describe("CandidateCard", () => {
  it("renders the candidate's summary fields", () => {
    render(<CandidateCard candidate={candidate} />);

    expect(screen.getByText("Ana Ruiz")).toBeInTheDocument();
    expect(screen.getByText("Senior Backend Engineer")).toBeInTheDocument();
    expect(screen.getByText(/Madrid, Spain/)).toBeInTheDocument();
    expect(screen.getByText(/8 yrs/)).toBeInTheDocument();
    // Only the top 3, even though the fixture has 4.
    expect(screen.getByText("Kubernetes")).toBeInTheDocument();
    expect(screen.getByText("PostgreSQL")).toBeInTheDocument();
    expect(screen.queryByText("Redis")).not.toBeInTheDocument();
  });

  it("links to the PDF via the proxy path", () => {
    render(<CandidateCard candidate={candidate} />);

    expect(screen.getByRole("link")).toHaveAttribute(
      "href",
      "/api/proxy/cvs/ana-ruiz/pdf",
    );
  });

  it("falls back to initials when the portrait image fails to load", () => {
    const { container } = render(<CandidateCard candidate={candidate} />);

    // The portrait is decorative (empty alt), so it has no accessible "img"
    // role — queried by tag instead.
    const image = container.querySelector("img");
    expect(image).not.toBeNull();
    fireEvent.error(image as HTMLImageElement);

    expect(screen.getByText("AR")).toBeInTheDocument();
    expect(container.querySelector("img")).toBeNull();
  });
});
