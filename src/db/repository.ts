import { articles, concepts, learningUnits } from '../content/library'
import {
  applyPracticeEvidence,
  applyRereadEvidence,
  createLearningSummary,
} from '../domain/learning'
import { prepareImportedArticle, type ArticleImportDraft } from '../domain/article-import'
import { canonicalCandidates } from '../domain/expression-match'
import type {
  AppSettings,
  Article,
  ArticleProgress,
  DailyHabit,
  Encounter,
  ExplorationSession,
  HintLevel,
  JournalEntry,
  LearningArchive,
  PlanItem,
  PracticeAttempt,
} from '../domain/models'
import { db } from './database'

const now = () => new Date().toISOString()
const createId = (prefix: string) => prefix + '-' + crypto.randomUUID()

const defaultSettings: AppSettings = {
  id: 'singleton',
  textScale: 1,
  lineHeight: 1.82,
  reduceMotion: false,
}

export async function initialiseLibrary() {
  await db.transaction('rw', db.articles, db.concepts, db.learningUnits, db.settings, async () => {
    await db.articles.bulkPut(articles)
    await db.concepts.bulkPut(concepts)
    await db.learningUnits.bulkPut(learningUnits)
    if (!(await db.settings.get('singleton'))) {
      await db.settings.add(defaultSettings)
    }
  })
}

export const libraryRepository = {
  listArticles: () => db.articles.toArray(),
  getArticle: (id: string) => db.articles.get(id),
  listProgress: () => db.articleProgress.toArray(),
  getProgress: (articleId: string) => db.articleProgress.get(articleId),
  listRecentEncounters: (limit = 12) =>
    db.encounters.orderBy('encounteredAt').reverse().limit(limit).toArray(),
  listSessions: () => db.explorationSessions.toArray(),
  listSummaries: () => db.learningSummaries.toArray(),
  listUnitsForArticle: (articleId: string) =>
    db.learningUnits.where('articleId').equals(articleId).toArray(),
  getEncounter: (id: string) => db.encounters.get(id),
  getSessionForEncounter: (encounterId: string) =>
    db.explorationSessions.where('encounterId').equals(encounterId).last(),
  getUnit: (id: string) => db.learningUnits.get(id),
  getConcept: (id: string) => db.concepts.get(id),
  getSettings: () => db.settings.get('singleton'),
}

export async function importArticle(draft: ArticleImportDraft) {
  const timestamp = now()
  const result = prepareImportedArticle(draft, {
    id: createId('imported'),
    importedAt: timestamp,
  })
  if (!result.ok) return result
  await db.articles.add(result.article)
  return result
}

export const journalRepository = {
  listEntries: () => db.journalEntries.orderBy('dateKey').reverse().toArray(),
  getEntry: (dateKey: string) => db.journalEntries.get(dateKey),
}

export async function saveJournalEntry(input: {
  dateKey: string
  title: string
  content: string
}) {
  const timestamp = now()
  const existing = await db.journalEntries.get(input.dateKey)
  const entry: JournalEntry = {
    dateKey: input.dateKey,
    title: input.title.trim(),
    content: input.content.trim(),
    createdAt: existing?.createdAt ?? timestamp,
    updatedAt: timestamp,
  }
  await db.journalEntries.put(entry)
  return entry
}

export async function deleteJournalEntry(dateKey: string) {
  await db.journalEntries.delete(dateKey)
}

export const planningRepository = {
  getSnapshot: async () => ({
    habits: await db.habits.orderBy('order').filter((habit) => !habit.archivedAt).toArray(),
    completions: await db.habitCompletions.toArray(),
    plans: await db.plans.orderBy('createdAt').reverse().toArray(),
  }),
}

export async function addHabit(name: string) {
  const trimmed = name.trim()
  if (!trimmed) return
  const timestamp = now()
  const last = await db.habits.orderBy('order').last()
  const habit: DailyHabit = {
    id: createId('habit'),
    name: trimmed,
    createdAt: timestamp,
    order: (last?.order ?? -1) + 1,
  }
  await db.habits.add(habit)
  return habit
}

export async function toggleHabitCompletion(habitId: string, dateKey: string) {
  const id = habitId + ':' + dateKey
  const existing = await db.habitCompletions.get(id)
  if (existing) {
    await db.habitCompletions.delete(id)
    return false
  }
  await db.habitCompletions.add({ id, habitId, dateKey, completedAt: now() })
  return true
}

export async function archiveHabit(id: string) {
  await db.habits.update(id, { archivedAt: now() })
}

export async function addPlan(input: {
  title: string
  note?: string
  targetDate?: string
}) {
  const title = input.title.trim()
  if (!title) return
  const timestamp = now()
  const plan: PlanItem = {
    id: createId('plan'),
    title,
    note: input.note?.trim() ?? '',
    status: 'active',
    targetDate: input.targetDate || undefined,
    createdAt: timestamp,
    updatedAt: timestamp,
  }
  await db.plans.add(plan)
  return plan
}

export async function togglePlanStatus(id: string) {
  const plan = await db.plans.get(id)
  if (!plan) return
  const timestamp = now()
  const completed = plan.status === 'active'
  await db.plans.update(id, {
    status: completed ? 'completed' : 'active',
    updatedAt: timestamp,
    completedAt: completed ? timestamp : undefined,
  })
}

export async function deletePlan(id: string) {
  await db.plans.delete(id)
}

export async function saveReadingPosition(
  articleId: string,
  currentBlockId: string,
  progressRatio: number,
) {
  const existing = await db.articleProgress.get(articleId)
  const timestamp = now()
  const next: ArticleProgress = {
    articleId,
    status: existing?.status === 'completed' ? 'completed' : 'reading',
    currentBlockId,
    progressRatio: Math.max(0, Math.min(1, progressRatio)),
    startedAt: existing?.startedAt ?? timestamp,
    lastReadAt: timestamp,
    completedAt: existing?.completedAt,
    rereadCount: existing?.rereadCount ?? 0,
    reflectionText: existing?.reflectionText,
  }
  await db.articleProgress.put(next)
}

export async function completeArticle(articleId: string, reflectionText = '') {
  const existing = await db.articleProgress.get(articleId)
  const timestamp = now()
  await db.articleProgress.put({
    articleId,
    status: 'completed',
    currentBlockId: existing?.currentBlockId,
    progressRatio: 1,
    startedAt: existing?.startedAt ?? timestamp,
    lastReadAt: timestamp,
    completedAt: existing?.completedAt ?? timestamp,
    rereadCount: existing?.rereadCount ?? 0,
    reflectionText,
  })
}

export async function beginExploration(input: {
  articleId: string
  blockId: string
  selectedText: string
  sentenceText: string
  learningUnitId?: string
}) {
  const article = await db.articles.get(input.articleId)
  if (!article) throw new Error('Article not found')
  const unit = input.learningUnitId
    ? await db.learningUnits.get(input.learningUnitId)
    : undefined
  const matchedConcept = unit
    ? await db.concepts.get(unit.expressionConceptId)
    : (await db.concepts.toArray()).find((concept) =>
        canonicalCandidates(input.selectedText).includes(concept.canonicalForm.toLowerCase()),
      )
  const timestamp = now()
  const encounter: Encounter = {
    id: createId('encounter'),
    articleId: input.articleId,
    articleContentVersion: article.contentVersion,
    blockId: input.blockId,
    expressionConceptId: matchedConcept?.id,
    learningUnitId: unit?.id,
    selectedText: input.selectedText,
    normalizedText: matchedConcept?.canonicalForm ?? input.selectedText.toLowerCase(),
    sentenceText: input.sentenceText,
    encounteredAt: timestamp,
    source: unit ? 'planned' : 'user_selected',
  }
  const session: ExplorationSession = {
    id: createId('session'),
    encounterId: encounter.id,
    startedAt: timestamp,
    guessRevisions: [],
    revealedLevels: [1],
    highestRevealedLevel: 1,
  }

  await db.transaction(
    'rw',
    db.encounters,
    db.explorationSessions,
    db.learningSummaries,
    async () => {
      await db.encounters.add(encounter)
      await db.explorationSessions.add(session)
      if (matchedConcept) {
        const existing = await db.learningSummaries.get(matchedConcept.id)
        if (existing) {
          await db.learningSummaries.put({
            ...existing,
            encounterCount: existing.encounterCount + 1,
            explorationCount: existing.explorationCount + 1,
            latestEvidenceAt: timestamp,
          })
        } else {
          await db.learningSummaries.add(
            createLearningSummary(matchedConcept.id, timestamp),
          )
        }
      }
    },
  )

  return encounter.id
}

export async function saveGuess(sessionId: string, text: string) {
  const session = await db.explorationSessions.get(sessionId)
  if (!session) return
  const trimmed = text.trim()
  const revisions =
    session.guessText && session.guessText !== trimmed
      ? [...session.guessRevisions, { text: session.guessText, revisedAt: now() }]
      : session.guessRevisions
  await db.explorationSessions.update(sessionId, {
    guessText: trimmed,
    guessRevisions: revisions,
  })
}

export async function revealLevel(sessionId: string, level: HintLevel) {
  const session = await db.explorationSessions.get(sessionId)
  if (!session) return
  const revealed = Array.from(new Set([...session.revealedLevels, level])).sort(
    (a, b) => a - b,
  ) as HintLevel[]
  await db.explorationSessions.update(sessionId, {
    revealedLevels: revealed,
    highestRevealedLevel: Math.max(...revealed) as HintLevel,
  })
}

export async function markReread(
  encounterId: string,
  assessment: 'clearer' | 'unsure',
) {
  const encounter = await db.encounters.get(encounterId)
  const session = await db.explorationSessions.where('encounterId').equals(encounterId).last()
  if (!session) return
  const timestamp = now()
  const updated: ExplorationSession = {
    ...session,
    completedAt: timestamp,
    rereadAt: timestamp,
    selfAssessment: assessment,
  }
  await db.explorationSessions.put(updated)

  if (encounter?.expressionConceptId) {
    const summary = await db.learningSummaries.get(encounter.expressionConceptId)
    if (summary) {
      await db.learningSummaries.put(applyRereadEvidence(summary, updated))
    }
  }
}

export async function savePracticeAttempt(input: {
  encounterId: string
  expressionConceptId: string
  selectedChoiceId: string
  correctChoiceId: string
  hintDepth: number
}) {
  const timestamp = now()
  const correct = input.selectedChoiceId === input.correctChoiceId
  const attempt: PracticeAttempt = {
    id: createId('attempt'),
    expressionConceptId: input.expressionConceptId,
    encounterId: input.encounterId,
    selectedChoiceId: input.selectedChoiceId,
    result: correct ? 'correct' : 'incorrect',
    errorTags: correct ? [] : ['unknown'],
    hintDepth: input.hintDepth,
    attemptedAt: timestamp,
  }
  await db.transaction('rw', db.practiceAttempts, db.learningSummaries, async () => {
    await db.practiceAttempts.add(attempt)
    const summary = await db.learningSummaries.get(input.expressionConceptId)
    if (summary) {
      await db.learningSummaries.put(applyPracticeEvidence(summary, attempt))
    }
  })
  return correct
}

export async function updateSettings(patch: Partial<AppSettings>) {
  const existing = (await db.settings.get('singleton')) ?? defaultSettings
  await db.settings.put({ ...existing, ...patch, id: 'singleton' })
}

export async function exportArchive(): Promise<LearningArchive> {
  const archive: LearningArchive = {
    format: 'dedicated-to-fx-backup',
    schemaVersion: 3,
    appVersion: '0.6.0',
    exportedAt: now(),
    data: {
      progress: await db.articleProgress.toArray(),
      encounters: await db.encounters.toArray(),
      sessions: await db.explorationSessions.toArray(),
      attempts: await db.practiceAttempts.toArray(),
      summaries: await db.learningSummaries.toArray(),
      settings: await db.settings.toArray(),
      journalEntries: await db.journalEntries.toArray(),
      habits: await db.habits.toArray(),
      habitCompletions: await db.habitCompletions.toArray(),
      plans: await db.plans.toArray(),
      importedArticles: await db.articles.filter((article) => article.origin === 'imported').toArray(),
    },
  }
  await updateSettings({ lastBackupAt: archive.exportedAt })
  return archive
}

export function isLearningArchive(value: unknown): value is LearningArchive {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<LearningArchive>
  if (
    candidate.format !== 'dedicated-to-fx-backup' ||
    (candidate.schemaVersion !== 1 && candidate.schemaVersion !== 2 && candidate.schemaVersion !== 3) ||
    !candidate.data ||
    typeof candidate.data !== 'object'
  ) {
    return false
  }
  const data = candidate.data as unknown as Record<string, unknown>
  const learningKeys = ['progress', 'encounters', 'sessions', 'attempts', 'summaries', 'settings']
  if (!learningKeys.every((key) => Array.isArray(data[key]))) return false
  if (candidate.schemaVersion === 1) return true
  if (!['journalEntries', 'habits', 'habitCompletions', 'plans'].every(
    (key) => Array.isArray(data[key]),
  )) return false
  if (candidate.schemaVersion === 2) return true
  return Array.isArray(data.importedArticles) && data.importedArticles.every(isImportedArticle)
}

function isImportedArticle(value: unknown): value is Article {
  if (!value || typeof value !== 'object') return false
  const article = value as Record<string, unknown>
  if (
    typeof article.id !== 'string' ||
    !article.id.startsWith('imported-') ||
    article.origin !== 'imported' ||
    typeof article.title !== 'string' ||
    typeof article.slug !== 'string' ||
    typeof article.summary !== 'string' ||
    typeof article.eyebrow !== 'string' ||
    typeof article.source !== 'string' ||
    typeof article.license !== 'string' ||
    !['Gentle', 'Stretch'].includes(String(article.difficulty)) ||
    !['moss', 'clay', 'ink'].includes(String(article.accent)) ||
    typeof article.estimatedMinutes !== 'number' ||
    typeof article.contentVersion !== 'number' ||
    !Array.isArray(article.featuredExpressionIds) ||
    !article.featuredExpressionIds.every((id) => typeof id === 'string') ||
    !Array.isArray(article.topicTags) ||
    !article.topicTags.every((tag) => typeof tag === 'string') ||
    !Array.isArray(article.blocks) ||
    article.blocks.length === 0
  ) return false

  return article.blocks.every((block) => {
    if (!block || typeof block !== 'object') return false
    const candidateBlock = block as Record<string, unknown>
    return (
      typeof candidateBlock.id === 'string' &&
      typeof candidateBlock.text === 'string' &&
      candidateBlock.text.length <= 60_000 &&
      (candidateBlock.translationZh === undefined ||
        (typeof candidateBlock.translationZh === 'string' && candidateBlock.translationZh.length <= 60_000)) &&
      ['paragraph', 'heading', 'quote'].includes(String(candidateBlock.type))
    )
  })
}

export async function restoreArchive(archive: LearningArchive) {
  await db.transaction(
    'rw',
    [
      db.articleProgress,
      db.encounters,
      db.explorationSessions,
      db.practiceAttempts,
      db.learningSummaries,
      db.settings,
      db.journalEntries,
      db.habits,
      db.habitCompletions,
      db.plans,
      db.articles,
    ],
    async () => {
      await Promise.all([
        db.articleProgress.clear(),
        db.encounters.clear(),
        db.explorationSessions.clear(),
        db.practiceAttempts.clear(),
        db.learningSummaries.clear(),
        db.settings.clear(),
        db.journalEntries.clear(),
        db.habits.clear(),
        db.habitCompletions.clear(),
        db.plans.clear(),
      ])
      await db.articles.filter((article) => article.origin === 'imported').delete()
      await db.articleProgress.bulkAdd(archive.data.progress)
      await db.encounters.bulkAdd(archive.data.encounters)
      await db.explorationSessions.bulkAdd(archive.data.sessions)
      await db.practiceAttempts.bulkAdd(archive.data.attempts)
      await db.learningSummaries.bulkAdd(archive.data.summaries)
      await db.settings.bulkPut(
        archive.data.settings.length ? archive.data.settings : [defaultSettings],
      )
      await db.journalEntries.bulkAdd(archive.data.journalEntries ?? [])
      await db.habits.bulkAdd(archive.data.habits ?? [])
      await db.habitCompletions.bulkAdd(archive.data.habitCompletions ?? [])
      await db.plans.bulkAdd(archive.data.plans ?? [])
      await db.articles.bulkPut(archive.data.importedArticles ?? [])
    },
  )
}
