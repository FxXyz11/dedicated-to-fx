export type ISODate = string
export type EvidenceLevel = 0 | 1 | 2 | 3 | 4
export type ArticleStatus = 'unread' | 'reading' | 'completed'
export type ExpressionType = 'word' | 'phrase' | 'pattern'
export type HintLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8

export interface ArticleBlock {
  id: string
  type: 'heading' | 'paragraph' | 'quote'
  text: string
}

export interface Article {
  id: string
  slug: string
  title: string
  eyebrow: string
  summary: string
  topicTags: string[]
  difficulty: 'Gentle' | 'Stretch'
  estimatedMinutes: number
  source: string
  sourceUrl?: string
  license: string
  contentVersion: number
  blocks: ArticleBlock[]
  featuredExpressionIds: string[]
  accent: 'moss' | 'clay' | 'ink'
  origin?: 'built_in' | 'imported'
  importedAt?: ISODate
}

export interface ExpressionConcept {
  id: string
  canonicalForm: string
  expressionType: ExpressionType
  coreConceptEn: string
  coreConceptZh: string
  mentalModel: string
  boundaries: string[]
  contentVersion: number
}

export interface RelatedContext {
  sentence: string
  meaningEn: string
  supportZh: string
  connection: string
}

export interface TransferChoice {
  id: string
  label: string
}

export interface TransferExercise {
  prompt: string
  context: string
  choices: TransferChoice[]
  correctChoiceId: string
  feedback: string
}

export interface LearningUnit {
  id: string
  articleId: string
  blockId: string
  expressionConceptId: string
  selectedText: string
  sentenceText: string
  contextClues: string[]
  grammarAndCollocations: string[]
  simpleEnglishMeaning: string
  contextualMeaningEn: string
  contextualSupportZh: string
  coreConnection: string
  relatedContexts: RelatedContext[]
  transfer: TransferExercise
  contentVersion: number
}

export interface ArticleProgress {
  articleId: string
  status: ArticleStatus
  currentBlockId?: string
  progressRatio: number
  startedAt?: ISODate
  lastReadAt?: ISODate
  completedAt?: ISODate
  rereadCount: number
  reflectionText?: string
}

export interface Encounter {
  id: string
  articleId: string
  articleContentVersion: number
  blockId: string
  expressionConceptId?: string
  learningUnitId?: string
  selectedText: string
  normalizedText: string
  sentenceText: string
  encounteredAt: ISODate
  source: 'planned' | 'user_selected'
}

export interface GuessRevision {
  text: string
  revisedAt: ISODate
}

export interface ExplorationSession {
  id: string
  encounterId: string
  startedAt: ISODate
  completedAt?: ISODate
  guessText?: string
  guessRevisions: GuessRevision[]
  revealedLevels: HintLevel[]
  highestRevealedLevel: HintLevel
  selfAssessment?: 'clearer' | 'unsure'
  rereadAt?: ISODate
  userNote?: string
}

export type ErrorTag =
  | 'literal_translation'
  | 'ignored_context'
  | 'collocation_confusion'
  | 'part_of_speech_confusion'
  | 'overgeneralized_concept'
  | 'unknown'

export interface PracticeAttempt {
  id: string
  expressionConceptId: string
  encounterId: string
  selectedChoiceId?: string
  responseText?: string
  result: 'correct' | 'partial' | 'incorrect' | 'ungraded'
  errorTags: ErrorTag[]
  hintDepth: number
  attemptedAt: ISODate
}

export interface LearningSummary {
  expressionConceptId: string
  firstEncounteredAt: ISODate
  evidenceLevel: EvidenceLevel
  contextRecognition: 'emerging' | 'developing' | 'stable'
  conceptConnection: 'emerging' | 'developing' | 'stable'
  transferUse: 'emerging' | 'developing' | 'stable'
  encounterCount: number
  explorationCount: number
  latestEvidenceAt: ISODate
}

export interface AppSettings {
  id: 'singleton'
  textScale: number
  lineHeight: number
  reduceMotion: boolean
  lastBackupAt?: ISODate
}

export interface JournalEntry {
  dateKey: string
  title: string
  content: string
  createdAt: ISODate
  updatedAt: ISODate
}

export interface DailyHabit {
  id: string
  name: string
  createdAt: ISODate
  order: number
  archivedAt?: ISODate
}

export interface HabitCompletion {
  id: string
  habitId: string
  dateKey: string
  completedAt: ISODate
}

export interface PlanItem {
  id: string
  title: string
  note: string
  status: 'active' | 'completed'
  targetDate?: string
  createdAt: ISODate
  updatedAt: ISODate
  completedAt?: ISODate
}

export interface LearningArchive {
  format: 'dedicated-to-fx-backup'
  schemaVersion: 1 | 2 | 3
  appVersion: string
  exportedAt: ISODate
  data: {
    progress: ArticleProgress[]
    encounters: Encounter[]
    sessions: ExplorationSession[]
    attempts: PracticeAttempt[]
    summaries: LearningSummary[]
    settings: AppSettings[]
    journalEntries?: JournalEntry[]
    habits?: DailyHabit[]
    habitCompletions?: HabitCompletion[]
    plans?: PlanItem[]
    importedArticles?: Article[]
  }
}
