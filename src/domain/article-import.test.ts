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
        translationZh: '午后的光线掠过纸面，一间安静的画室随之改变。艺术家从容地观察。\n\n每一道笔触都始于专注，每一次停顿都为另一种可能的出现留下空间。',
      },
      metadata,
    )

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.article.blocks).toHaveLength(2)
    expect(result.article.blocks[0].translationZh).toContain('画室')
    expect(result.article.origin).toBe('imported')
    expect(result.article.topicTags).toContain('My Imports')
  })

  it('requires Chinese paragraphs to align with English paragraphs', () => {
    const result = prepareImportedArticle(
      {
        title: 'A Mismatched Test',
        text: 'The first English paragraph contains enough words to be accepted as part of a complete reading article.\n\nThe second paragraph also contains enough English words for the validation rule to accept this test.',
        translationZh: '这里只有一个中文段落，因此不能与两段英文一一对应。',
      },
      metadata,
    )

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toContain('英文正文有 2 段')
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
