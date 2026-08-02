import { ArrowUpRight, Clock3, FileText } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { Article, ArticleProgress } from '../../domain/models'

interface ArticleCardProps {
  article: Article
  progress?: ArticleProgress
  featured?: boolean
}

export function ArticleCard({ article, progress, featured = false }: ArticleCardProps) {
  const action = progress?.status === 'reading' ? '继续阅读' : progress?.status === 'completed' ? '重新阅读' : '开始阅读'

  return (
    <article className={'article-card article-card--' + article.accent + (featured ? ' article-card--featured' : '')}>
      <div className="article-card__wash" aria-hidden="true" />
      <div className="article-card__content">
        <p className="eyebrow">{article.eyebrow}</p>
        <h3>{article.title}</h3>
        <p>{article.summary}</p>
        <div className="article-card__meta">
          <span><Clock3 size={14} /> {article.estimatedMinutes} min</span>
          <span>{article.difficulty}</span>
          {article.origin === 'imported' && <span><FileText size={13} /> Fx import</span>}
          {progress?.status === 'reading' && <span>{Math.round(progress.progressRatio * 100)}%</span>}
        </div>
        {progress?.status === 'reading' && (
          <div className="fine-progress" aria-label={'阅读进度 ' + Math.round(progress.progressRatio * 100) + '%'}>
            <span style={{ width: Math.round(progress.progressRatio * 100) + '%' }} />
          </div>
        )}
        <Link className="text-link" to={'/read/' + article.id}>
          {action} <ArrowUpRight size={16} />
        </Link>
      </div>
    </article>
  )
}
