import Dexie, { type EntityTable } from 'dexie'
import type {
  AppSettings,
  Article,
  ArticleProgress,
  DailyHabit,
  Encounter,
  ExplorationSession,
  ExpressionConcept,
  HabitCompletion,
  JournalEntry,
  LearningSummary,
  LearningUnit,
  PlanItem,
  PracticeAttempt,
} from '../domain/models'

export class DedicatedDatabase extends Dexie {
  articles!: EntityTable<Article, 'id'>
  concepts!: EntityTable<ExpressionConcept, 'id'>
  learningUnits!: EntityTable<LearningUnit, 'id'>
  articleProgress!: EntityTable<ArticleProgress, 'articleId'>
  encounters!: EntityTable<Encounter, 'id'>
  explorationSessions!: EntityTable<ExplorationSession, 'id'>
  practiceAttempts!: EntityTable<PracticeAttempt, 'id'>
  learningSummaries!: EntityTable<LearningSummary, 'expressionConceptId'>
  settings!: EntityTable<AppSettings, 'id'>
  journalEntries!: EntityTable<JournalEntry, 'dateKey'>
  habits!: EntityTable<DailyHabit, 'id'>
  habitCompletions!: EntityTable<HabitCompletion, 'id'>
  plans!: EntityTable<PlanItem, 'id'>

  constructor() {
    super('DedicatedToFx')
    this.version(1).stores({
      articles: 'id, slug, *topicTags',
      concepts: 'id, canonicalForm',
      learningUnits: 'id, articleId, expressionConceptId, [articleId+blockId]',
      articleProgress: 'articleId, status, lastReadAt',
      encounters: 'id, articleId, expressionConceptId, encounteredAt, [articleId+blockId]',
      explorationSessions: 'id, encounterId, startedAt, completedAt',
      practiceAttempts: 'id, expressionConceptId, encounterId, attemptedAt',
      learningSummaries: 'expressionConceptId, evidenceLevel, latestEvidenceAt',
      settings: 'id',
    })
    this.version(2).stores({
      journalEntries: 'dateKey, updatedAt',
      habits: 'id, createdAt, order, archivedAt',
      habitCompletions: 'id, habitId, dateKey, completedAt, [habitId+dateKey]',
      plans: 'id, status, targetDate, createdAt, updatedAt',
    })
  }
}

export const db = new DedicatedDatabase()
