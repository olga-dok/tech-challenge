import { Suspense } from "react";
import type { Metadata } from "next";
import { HomeView } from "../components/home-view";

export const metadata: Metadata = {
  title: "CV Screener",
  description:
    "Search and screen candidates with AI-powered answers grounded in their CVs.",
};

export default function Home() {
  return (
    <Suspense fallback={null}>
      <HomeView />
    </Suspense>
  );
}
