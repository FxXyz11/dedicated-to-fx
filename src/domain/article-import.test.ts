import { describe, expect, it } from 'vitest'
import { prepareImportedArticle } from './article-import'

const metadata = {
  id: 'imported-test',
  importedAt: '2026-08-02T00:00:00.000Z',
}

describe('article import', () => {
  it('turns plain English paragraphs into a local article', () => {
    const result = prepareImportedArticle(
      {
        title: 'A Small Test',
        topic: 'Art & Design',
        text: 'A quiet studio changes as the afternoon light moves across the paper. The artist watches without rushing.\n\nEach mark begins with attention, and every pause leaves room for another possibility to appear.',
      },
      metadata,
    )

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.article.blocks).toHaveLength(2)
    expect(result.article.origin).toBe('imported')
    expect(result.article.topicTags).toContain('My Imports')
  })

  it('rejects content that is mainly Chinese', () => {
    const result = prepareImportedArticle(
      {
        title: '中文内容',
        text: '这是一篇主要由中文组成的文章。它不会在没有语言模型的情况下被假装翻译成自然英文。这里只混入 a few English words to test the validation rule safely.',
      },
      metadata,
    )

    expect(result.ok).toBe(false)
  })
})
