import { describe, expect, it } from 'vitest'
import {
  applyPracticeEvidence,
  applyRereadEvidence,
  createLearningSummary,
  rebuildLearningSummary,
} from './learning'
import type { Encounter, ExplorationSession, PracticeAttempt } from './models'

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

  it('rebuilds evidence after one understanding trace is removed', () => {
    const encounters: Encounter[] = [
      {
        id: 'encounter-1', articleId: 'article-1', articleContentVersion: 1, blockId: 'p1',
        expressionConceptId: 'concept-reflect', selectedText: 'reflect', normalizedText: 'reflect',
        sentenceText: 'The lake reflected the moonlight.', encounteredAt: '2026-08-01T00:00:00.000Z', source: 'planned',
      },
      {
        id: 'encounter-2', articleId: 'article-2', articleContentVersion: 1, blockId: 'p2',
        expressionConceptId: 'concept-reflect', selectedText: 'reflect', normalizedText: 'reflect',
        sentenceText: 'Her paintings reflect her feelings.', encounteredAt: '2026-08-03T00:00:00.000Z', source: 'planned',
      },
    ]
    const sessions: ExplorationSession[] = [{
      id: 'session-2', encounterId: 'encounter-2', startedAt: '2026-08-03T00:00:00.000Z',
      guessRevisions: [], revealedLevels: [1, 2], highestRevealedLevel: 2,
      selfAssessment: 'clearer', rereadAt: '2026-08-03T01:00:00.000Z',
    }]

    const summary = rebuildLearningSummary('concept-reflect', encounters.slice(1), sessions, [])
    expect(summary).toMatchObject({
      firstEncounteredAt: '2026-08-03T00:00:00.000Z',
      latestEvidenceAt: '2026-08-03T01:00:00.000Z',
      encounterCount: 1,
      explorationCount: 1,
      evidenceLevel: 2,
    })
    expect(rebuildLearningSummary('concept-reflect', [], [], [])).toBeUndefined()
  })
})
