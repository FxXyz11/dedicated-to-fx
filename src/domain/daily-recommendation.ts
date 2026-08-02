import type { Article, ArticleProgress } from './models'

function hashDate(dateKey: string) {
  return [...dateKey].reduce((hash, character) => (hash * 31 + character.charCodeAt(0)) >>> 0, 17)
}

export function selectDailyArticle(
  articles: Article[],
  progress: ArticleProgress[],
  dateKey: string,
) {
  if (!articles.length) return undefined
  const completedIds = new Set(
    progress.filter((item) => item.status === 'completed').map((item) => item.articleId),
  )
  const unread = articles.filter((article) => !completedIds.has(article.id))
  const candidates = (unread.length ? unread : articles).slice().sort((a, b) => a.id.localeCompare(b.id))
  return candidates[hashDate(dateKey) % candidates.length]
}
