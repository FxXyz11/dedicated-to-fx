import { describe, expect, it } from 'vitest'
import type { Article } from './models'
import { selectDailyArticle } from './daily-recommendation'

const makeArticle = (id: string): Article => ({
  id,
  slug: id,
  title: id,
  eyebrow: 'Test',
  summary: 'Test article',
  topicTags: [],
  difficulty: 'Gentle',
  estimatedMinutes: 1,
  source: 'Test',
  license: 'Test',
  contentVersion: 1,
  blocks: [],
  featuredExpressionIds: [],
  accent: 'moss',
})

describe('daily recommendation', () => {
  it('is stable for the same local date', () => {
    const articles = [makeArticle('a'), makeArticle('b'), makeArticle('c')]
    expect(selectDailyArticle(articles, [], '2026-08-02')?.id).toBe(
      selectDailyArticle(articles, [], '2026-08-02')?.id,
    )
  })

  it('prefers articles that have not been completed', () => {
    const articles = [makeArticle('a'), makeArticle('b')]
    const selected = selectDailyArticle(
      articles,
      [{ articleId: 'a', status: 'completed', progressRatio: 1, rereadCount: 0 }],
      '2026-08-02',
    )
    expect(selected?.id).toBe('b')
  })
})
