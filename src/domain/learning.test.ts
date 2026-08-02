import { describe, expect, it } from 'vitest'
import {
  applyPracticeEvidence,
  applyRereadEvidence,
  createLearningSummary,
} from './learning'
import type { ExplorationSession, PracticeAttempt } from './models'

describe('learning evidence', () => {
  it('does not call a viewed explanation mastery', () => {
    const summary = createLearningSummary('concept-reflect', '2026-08-02T00:00:00.000Z')
    const session: ExplorationSession = {
      id: 'session-1',
      encounterId: 'encounter-1',
      startedAt: '2026-08-02T00:00:00.000Z',
      guessRevisions: [],
      revealedLevels: [1, 2, 3, 4, 5, 6, 7, 8],
      highestRevealedLevel: 8,
      selfAssessment: 'unsure',
      rereadAt: '2026-08-02T01:00:00.000Z',
    }

    expect(applyRereadEvidence(summary, session).evidenceLevel).toBe(0)
  })

  it('records a clearer reread as contextual understanding', () => {
    const summary = createLearningSummary('concept-reflect', '2026-08-02T00:00:00.000Z')
    const session: ExplorationSession = {
      id: 'session-1',
      encounterId: 'encounter-1',
      startedAt: '2026-08-02T00:00:00.000Z',
      guessRevisions: [],
      revealedLevels: [1, 2, 3, 4, 5],
      highestRevealedLevel: 5,
      selfAssessment: 'clearer',
      rereadAt: '2026-08-02T01:00:00.000Z',
    }

    expect(applyRereadEvidence(summary, session).evidenceLevel).toBe(2)
  })

  it('requires a correct transfer attempt for transfer evidence', () => {
    const summary = createLearningSummary('concept-reflect', '2026-08-02T00:00:00.000Z')
    const attempt: PracticeAttempt = {
      id: 'attempt-1',
      encounterId: 'encounter-1',
      expressionConceptId: 'concept-reflect',
      selectedChoiceId: 'b',
      result: 'correct',
      errorTags: [],
      hintDepth: 8,
      attemptedAt: '2026-08-03T00:00:00.000Z',
    }

    expect(applyPracticeEvidence(summary, attempt).evidenceLevel).toBe(4)
  })
})
