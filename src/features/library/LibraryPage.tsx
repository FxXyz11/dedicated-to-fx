import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { FilePlus2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ArticleCard } from '../../components/ui/ArticleCard'
import { libraryRepository } from '../../db/repository'

const filters = ['All', 'My Imports', 'Art & Design', 'Culture & Stories', 'Nature & Animals', 'Science & Society']

export function LibraryPage() {
  const [filter, setFilter] = useState('All')
  const data = useLiveQuery(async () => {
    const [articles, progress] = await Promise.all([
      libraryRepository.listArticles(),
      libraryRepository.listProgress(),
    ])
    return { articles, progress }
  }, [])

  const filtered = useMemo(
    () => data?.articles.filter((article) => filter === 'All' || article.topicTags.includes(filter)) ?? [],
    [data, filter],
  )

  if (!data) return <div className="page-loading">正在展开文章库…</div>
  const progressMap = new Map(data.progress.map((item) => [item.articleId, item]))

  return (
    <div className="library-page page-stack">
      <header className="page-intro page-intro--library">
        <div>
          <p className="eyebrow">Library · {data.articles.length} essays</p>
          <h1>文章先于词语。</h1>
          <p>从你真正愿意读完的主题开始。探索只在需要时发生。</p>
        </div>
        <Link className="secondary-button" to="/library/import"><FilePlus2 size={17} /> 本地导入文章</Link>
      </header>
      <div className="filter-row" aria-label="文章主题筛选">
        {filters.map((item) => (
          <button
            className={filter === item ? 'filter-chip is-active' : 'filter-chip'}
            key={item}
            onClick={() => setFilter(item)}
            type="button"
          >
            {item}
          </button>
        ))}
      </div>
      <div className="article-grid">
        {filtered.map((article) => (
          <ArticleCard
            key={article.id}
            article={article}
            progress={progressMap.get(article.id)}
          />
        ))}
      </div>
      <p className="source-note">
        内置文章为 Dedicated to Fx 原创内容；Fx 导入的文章只保存在本机。策划文章含完整语境探索，普通导入文章保留个人猜测与已有概念连接。
      </p>
    </div>
  )
}
