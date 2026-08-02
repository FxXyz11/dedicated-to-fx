import { describe, expect, it } from 'vitest'
import { articles, concepts, learningUnits } from './library'

const unique = (values: string[]) => new Set(values).size === values.length

describe('curated content library', () => {
  it('uses stable unique ids', () => {
    expect(unique(articles.map((item) => item.id))).toBe(true)
    expect(unique(concepts.map((item) => item.id))).toBe(true)
    expect(unique(learningUnits.map((item) => item.id))).toBe(true)
  })

  it('keeps every learning unit anchored in its article', () => {
    for (const unit of learningUnits) {
      const article = articles.find((item) => item.id === unit.articleId)
      const block = article?.blocks.find((item) => item.id === unit.blockId)
      expect(article, unit.id).toBeDefined()
      expect(block, unit.id).toBeDefined()
      expect(block?.text.includes(unit.selectedText), unit.id).toBe(true)
      expect(block?.text.includes(unit.sentenceText), unit.id).toBe(true)
      expect(concepts.some((item) => item.id === unit.expressionConceptId), unit.id).toBe(true)
    }
  })

  it('connects every featured expression to the same article', () => {
    for (const article of articles) {
      for (const unitId of article.featuredExpressionIds) {
        expect(
          learningUnits.some((unit) => unit.id === unitId && unit.articleId === article.id),
          `${article.id}:${unitId}`,
        ).toBe(true)
      }
    }
  })
})
