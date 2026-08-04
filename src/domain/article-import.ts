import type { Article } from './models'

export interface ArticleImportDraft {
  title: string
  text: string
  translationZh?: string
  summary?: string
  topic?: string
  difficulty?: Article['difficulty']
  source?: string
}

export type ArticleImportResult =
  | { ok: true; article: Article; wordCount: number }
  | { ok: false; error: string }

const englishWords = (text: string) => text.match(/[A-Za-z]+(?:[’'-][A-Za-z]+)*/g) ?? []

function toParagraphs(text: string) {
  return text
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.replace(/[ \t]+/g, ' ').replace(/\n/g, ' ').trim())
    .filter(Boolean)
}

function createSummary(text: string) {
  const firstParagraph = text.split(/\n\s*\n/)[0]?.replace(/\s+/g, ' ').trim() ?? ''
  if (firstParagraph.length <= 180) return firstParagraph
  const sentenceEnd = firstParagraph.slice(0, 180).lastIndexOf('.')
  return firstParagraph.slice(0, sentenceEnd > 80 ? sentenceEnd + 1 : 177).trim() + (sentenceEnd > 80 ? '' : '…')
}

export function prepareImportedArticle(
  draft: ArticleImportDraft,
  metadata: { id: string; importedAt: string },
): ArticleImportResult {
  const title = draft.title.trim()
  const text = draft.text.replace(/\r\n?/g, '\n').trim()
  const translationZh = draft.translationZh?.replace(/\r\n?/g, '\n').trim() ?? ''

  if (!title) return { ok: false, error: '请先填写英文标题。' }
  if (title.length > 120) return { ok: false, error: '标题请控制在 120 个字符以内。' }
  if (!text) return { ok: false, error: '请粘贴英文正文。' }
  if (text.length > 60_000) return { ok: false, error: '单篇文章请控制在 60,000 个字符以内。' }
  if (translationZh.length > 60_000) return { ok: false, error: '中文译文请控制在 60,000 个字符以内。' }
  if (/<[a-z][\s\S]*>/i.test(text)) {
    return { ok: false, error: '请粘贴纯文本，不要粘贴 HTML 代码。' }
  }

  const words = englishWords(text)
  if (words.length < 20) return { ok: false, error: '正文至少需要约 20 个英文单词。' }
  const chineseCharacters = (text.match(/[\u3400-\u9fff]/g) ?? []).length
  if (chineseCharacters > Math.max(20, words.length / 2)) {
    return { ok: false, error: '这段内容主要是中文。当前版本只能直接导入英文文章。' }
  }

  const paragraphs = toParagraphs(text)
  const translatedParagraphs = translationZh ? toParagraphs(translationZh) : []
  if (translatedParagraphs.length && translatedParagraphs.length !== paragraphs.length) {
    return {
      ok: false,
      error: `英文正文有 ${paragraphs.length} 段，中文译文有 ${translatedParagraphs.length} 段。请用空行分段并保持一一对应。`,
    }
  }

  const accentIndex = [...title].reduce((sum, character) => sum + character.charCodeAt(0), 0) % 3
  const accents: Article['accent'][] = ['moss', 'clay', 'ink']
  const topic = draft.topic?.trim() || 'Personal Reading'

  return {
    ok: true,
    wordCount: words.length,
    article: {
      id: metadata.id,
      slug: metadata.id,
      title,
      eyebrow: `${topic} · Fx import`,
      summary: draft.summary?.trim() || createSummary(text),
      topicTags: ['My Imports', topic],
      difficulty: draft.difficulty ?? 'Gentle',
      estimatedMinutes: Math.max(1, Math.ceil(words.length / 180)),
      source: draft.source?.trim() || 'Imported locally by Fx',
      license: 'Personal local copy · User-provided text',
      contentVersion: 1,
      blocks: paragraphs.map((paragraph, index) => ({
        id: `${metadata.id}-p${index + 1}`,
        type: 'paragraph',
        text: paragraph,
        translationZh: translatedParagraphs[index] || undefined,
      })),
      featuredExpressionIds: [],
      accent: accents[accentIndex],
      origin: 'imported',
      importedAt: metadata.importedAt,
    },
  }
}
