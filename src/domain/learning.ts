import type {
  Encounter,
  EvidenceLevel,
  ExplorationSession,
  LearningSummary,
  PracticeAttempt,
} from './models'

export const evidenceLabels: Record<EvidenceLevel, string> = {
  0: '刚刚遇见',
  1: '开始察觉',
  2: '理解此处',
  3: '连接概念',
  4: '可以迁移',
}

export function createLearningSummary(
  expressionConceptId: string,
  encounteredAt: string,
): LearningSummary {
  return {
    expressionConceptId,
    firstEncounteredAt: encounteredAt,
    evidenceLevel: 0,
    contextRecognition: 'emerging',
    conceptConnection: 'emerging',
    transferUse: 'emerging',
    encounterCount: 1,
    explorationCount: 1,
    latestEvidenceAt: encounteredAt,
  }
}

export function applyRereadEvidence(
  summary: LearningSummary,
  session: ExplorationSession,
): LearningSummary {
  if (session.selfAssessment !== 'clearer') return summary

  return {
    ...summary,
    evidenceLevel: Math.max(summary.evidenceLevel, 2) as EvidenceLevel,
    contextRecognition: 'developing',
    latestEvidenceAt: session.rereadAt ?? summary.latestEvidenceAt,
  }
}

export function applyPracticeEvidence(
  summary: LearningSummary,
  attempt: PracticeAttempt,
): LearningSummary {
  if (attempt.result !== 'correct') {
    return {
      ...summary,
      transferUse: 'emerging',
      latestEvidenceAt: attempt.attemptedAt,
    }
  }

  return {
    ...summary,
    evidenceLevel: 4,
    contextRecognition: 'stable',
    conceptConnection: 'developing',
    transferUse: 'developing',
    latestEvidenceAt: attempt.attemptedAt,
  }
}

export function rebuildLearningSummary(
  expressionConceptId: string,
  encounters: Encounter[],
  sessions: ExplorationSession[],
  attempts: PracticeAttempt[],
): LearningSummary | undefined {
  const conceptEncounters = encounters
    .filter((encounter) => encounter.expressionConceptId === expressionConceptId)
    .sort((a, b) => a.encounteredAt.localeCompare(b.encounteredAt))
  if (!conceptEncounters.length) return undefined

  const encounterIds = new Set(conceptEncounters.map((encounter) => encounter.id))
  const evidenceEvents = [
    ...sessions
      .filter((session) => encounterIds.has(session.encounterId) && session.rereadAt)
      .map((session) => ({
        at: session.rereadAt as string,
        apply: (summary: LearningSummary) => applyRereadEvidence(summary, session),
      })),
    ...attempts
      .filter((attempt) => encounterIds.has(attempt.encounterId))
      .map((attempt) => ({
        at: attempt.attemptedAt,
        apply: (summary: LearningSummary) => applyPracticeEvidence(summary, attempt),
      })),
  ].sort((a, b) => a.at.localeCompare(b.at))

  let summary = createLearningSummary(expressionConceptId, conceptEncounters[0].encounteredAt)
  summary = {
    ...summary,
    encounterCount: conceptEncounters.length,
    explorationCount: conceptEncounters.length,
  }
  for (const event of evidenceEvents) summary = event.apply(summary)

  const latestEvidenceAt = [
    ...conceptEncounters.map((encounter) => encounter.encounteredAt),
    ...evidenceEvents.map((event) => event.at),
  ].sort().at(-1) as string

  return { ...summary, latestEvidenceAt }
}
