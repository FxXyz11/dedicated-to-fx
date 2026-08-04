import { describe, expect, it } from 'vitest'
import { prepareImportedArticle } from '../domain/article-import'
import { isLearningArchive } from './repository'

describe('backup validation', () => {
  it('accepts the versioned archive shape', () => {
    expect(
      isLearningArchive({
        format: 'dedicated-to-fx-backup',
        schemaVersion: 3,
        appVersion: '0.3.0',
        exportedAt: '2026-08-02T00:00:00.000Z',
        data: {
          progress: [],
          encounters: [],
          sessions: [],
          attempts: [],
          summaries: [],
          settings: [],
          journalEntries: [],
          habits: [],
          habitCompletions: [],
          plans: [],
          importedArticles: [],
        },
      }),
    ).toBe(true)
  })

  it('keeps accepting version 2 personal-space backups', () => {
    expect(
      isLearningArchive({
        format: 'dedicated-to-fx-backup',
        schemaVersion: 2,
        appVersion: '0.2.0',
        exportedAt: '2026-08-02T00:00:00.000Z',
        data: {
          progress: [], encounters: [], sessions: [], attempts: [], summaries: [], settings: [],
          journalEntries: [], habits: [], habitCompletions: [], plans: [],
        },
      }),
    ).toBe(true)
  })

  it('keeps accepting version 1 learning-only backups', () => {
    expect(
      isLearningArchive({
        format: 'dedicated-to-fx-backup',
        schemaVersion: 1,
        appVersion: '0.1.0',
        exportedAt: '2026-08-02T00:00:00.000Z',
        data: {
          progress: [],
          encounters: [],
          sessions: [],
          attempts: [],
          summaries: [],
          settings: [],
        },
      }),
    ).toBe(true)
  })

  it('rejects unversioned or incomplete input', () => {
    expect(isLearningArchive({ format: 'dedicated-to-fx-backup', data: {} })).toBe(false)
  })

  it('rejects malformed imported articles in version 3 backups', () => {
    expect(
      isLearningArchive({
        format: 'dedicated-to-fx-backup',
        schemaVersion: 3,
        appVersion: '0.3.0',
        exportedAt: '2026-08-02T00:00:00.000Z',
        data: {
          progress: [], encounters: [], sessions: [], attempts: [], summaries: [], settings: [],
          journalEntries: [], habits: [], habitCompletions: [], plans: [],
          importedArticles: [{ id: 'not-safe', blocks: [] }],
        },
      }),
    ).toBe(false)
  })

  it('validates imported bilingual text in version 3 backups', () => {
    const result = prepareImportedArticle(
      {
        title: 'A Small Test',
        text: 'A complete English paragraph with enough words to be accepted by the local importer and stored safely for reading today.',
        translationZh: '这是一段与英文原文对应的完整中文译文。',
      },
      { id: 'imported-backup-test', importedAt: '2026-08-04T00:00:00.000Z' },
    )
    expect(result.ok).toBe(true)
    if (!result.ok) return

    const archive = {
      format: 'dedicated-to-fx-backup',
      schemaVersion: 3,
      appVersion: '0.6.0',
      exportedAt: '2026-08-04T00:00:00.000Z',
      data: {
        progress: [], encounters: [], sessions: [], attempts: [], summaries: [], settings: [],
        journalEntries: [], habits: [], habitCompletions: [], plans: [],
        importedArticles: [result.article],
      },
    }
    expect(isLearningArchive(archive)).toBe(true)

    const invalidArticle = {
      ...result.article,
      blocks: [{ ...result.article.blocks[0], translationZh: 42 }],
    }
    expect(isLearningArchive({
      ...archive,
      data: { ...archive.data, importedArticles: [invalidArticle] },
    })).toBe(false)
  })
})
