import type {
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
