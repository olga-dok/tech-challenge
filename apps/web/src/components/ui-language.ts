export type UiLanguage = "en" | "es";

type Labels = {
  appDescription: string;
  askTitle: string;
  askPlaceholder: string;
  send: string;
  stop: string;
  clearRanking: string;
  showingMatchesFor: string;
  matchingCandidates: (count: number) => string;
  activeRankingFor: string;
  sources: string;
  previous: string;
  next: string;
  pageOf: (page: number, totalPages: number) => string;
  galleryPages: string;
  noCandidatesTitle: string;
  noCandidatesBody: string;
  generateCorpus: string;
  regenerateCorpus: string;
  generateRemaining: (count: number) => string;
  regenerateConfirm: string;
  waitingRateLimit: (seconds: number) => string;
  generationProgress: (completed: number, total: number) => string;
  batchProgress: (batch: number, totalBatches: number) => string;
  bestMatch: string;
  relevanceScoreTitle: (rank: number, score: number) => string;
  relevanceScoreAria: string;
  aiTemporarilyUnavailable: string;
  tryAgainSoon: string;
  retry: string;
  previousAnswer: string;
};

export const UI_LABELS: Record<UiLanguage, Labels> = {
  en: {
    appDescription:
      "Search and screen candidates with AI-powered answers grounded in their CVs.",
    askTitle: "Ask",
    askPlaceholder:
      "Ask about skills, experience, education, or candidate fit…",
    send: "Send",
    stop: "Stop",
    clearRanking: "Clear matches",
    showingMatchesFor: "Showing matches for:",
    matchingCandidates: (count) => `${String(count)} matching candidates`,
    activeRankingFor: "Active ranking for:",
    sources: "Sources:",
    previous: "Previous",
    next: "Next",
    pageOf: (page, totalPages) =>
      `Page ${String(page)} of ${String(totalPages)}`,
    galleryPages: "Gallery pages",
    noCandidatesTitle: "No candidates yet",
    noCandidatesBody:
      "Generate a corpus of realistic CVs, indexed for search as they land. On a free-tier key, ~25 candidates takes a few minutes — cards fill in live as each one finishes.",
    generateCorpus: "Generate corpus",
    regenerateCorpus: "Regenerate corpus",
    generateRemaining: (count) => `Generate remaining ${String(count)}`,
    regenerateConfirm:
      "Regenerating replaces the existing corpus and takes a few minutes. Continue?",
    waitingRateLimit: (seconds) =>
      `waiting out a rate limit — resuming in ${String(seconds)}s`,
    generationProgress: (completed, total) =>
      `${String(completed)} of ${String(total)}`,
    batchProgress: (batch, totalBatches) =>
      `batch ${String(batch)} of ${String(totalBatches)}`,
    bestMatch: "Best match",
    relevanceScoreTitle: (rank, score) =>
      `Rank #${String(rank)}. Relevance score: ${score.toFixed(2)} (higher means more relevant for this answer).`,
    relevanceScoreAria: "Candidate ranking indicator",
    aiTemporarilyUnavailable: "AI temporarily unavailable",
    tryAgainSoon: "Please try again in a moment.",
    retry: "Retry",
    previousAnswer: "Show answer",
  },
  es: {
    appDescription:
      "Busca y evalúa candidatos con respuestas de IA basadas en sus CV.",
    askTitle: "Pregunta",
    askPlaceholder:
      "Pregunta sobre habilidades, experiencia, educación o encaje del candidato…",
    send: "Enviar",
    stop: "Detener",
    clearRanking: "Quitar coincidencias",
    showingMatchesFor: "Mostrando coincidencias para:",
    matchingCandidates: (count) => `${String(count)} candidatos coincidentes`,
    activeRankingFor: "Ranking activo para:",
    sources: "Fuentes:",
    previous: "Anterior",
    next: "Siguiente",
    pageOf: (page, totalPages) =>
      `Página ${String(page)} de ${String(totalPages)}`,
    galleryPages: "Páginas de la galería",
    noCandidatesTitle: "Aún no hay candidatos",
    noCandidatesBody:
      "Genera un corpus de CV realistas, indexado para búsqueda a medida que se crea. Con una clave gratuita, ~25 candidatos tardan unos minutos y las tarjetas aparecen en vivo al completarse.",
    generateCorpus: "Generar corpus",
    regenerateCorpus: "Regenerar corpus",
    generateRemaining: (count) => `Generar ${String(count)} restantes`,
    regenerateConfirm:
      "Regenerar sustituye el corpus actual y tarda unos minutos. ¿Continuar?",
    waitingRateLimit: (seconds) =>
      `esperando límite de cuota — se reanuda en ${String(seconds)} s`,
    generationProgress: (completed, total) =>
      `${String(completed)} de ${String(total)}`,
    batchProgress: (batch, totalBatches) =>
      `lote ${String(batch)} de ${String(totalBatches)}`,
    bestMatch: "Mejor coincidencia",
    relevanceScoreTitle: (rank, score) =>
      `Posición #${String(rank)}. Puntuación de relevancia: ${score.toFixed(2)} (a mayor valor, mayor relevancia para esta respuesta).`,
    relevanceScoreAria: "Indicador de ranking del candidato",
    aiTemporarilyUnavailable: "IA temporalmente no disponible",
    tryAgainSoon: "Vuelve a intentarlo en un momento.",
    retry: "Reintentar",
    previousAnswer: "Enseñar respuesta",
  },
};
