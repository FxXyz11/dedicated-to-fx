import { useLiveQuery } from 'dexie-react-hooks'
import { ArrowRight, BookOpen, Compass, Sprout } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ArticleCard } from '../../components/ui/ArticleCard'
import { libraryRepository } from '../../db/repository'
import { evidenceLabels } from '../../domain/learning'
import { selectDailyArticle } from '../../domain/daily-recommendation'

const toDateKey = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function DashboardPage() {
  const data = useLiveQuery(async () => {
    const [articles, progress, encounters, summaries] = await Promise.all([
      libraryRepository.listArticles(),
      libraryRepository.listProgress(),
      libraryRepository.listRecentEncounters(4),
      libraryRepository.listSummaries(),
    ])
    const recent = await Promise.all(
      encounters.map(async (encounter) => ({
        encounter,
        concept: encounter.expressionConceptId
          ? await libraryRepository.getConcept(encounter.expressionConceptId)
          : undefined,
        article: await libraryRepository.getArticle(encounter.articleId),
      })),
    )
    return { articles, progress, encounters, summaries, recent }
  }, [])

  if (!data) return <div className="page-loading">正在整理今天的纸页…</div>

  const progressMap = new Map(data.progress.map((item) => [item.articleId, item]))
  const activeProgress = [...data.progress]
    .filter((item) => item.status === 'reading')
    .sort((a, b) => (b.lastReadAt ?? '').localeCompare(a.lastReadAt ?? ''))[0]
  const activeArticle = data.articles.find((article) => article.id === activeProgress?.articleId)
  const dailyArticle = selectDailyArticle(data.articles, data.progress, toDateKey(new Date())) ?? data.articles[0]
  const primaryArticle = activeArticle ?? dailyArticle
  const completed = data.progress.filter((item) => item.status === 'completed').length
  const stable = data.summaries.filter((item) => item.evidenceLevel >= 3)
  const date = new Intl.DateTimeFormat('zh-CN', {
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  }).format(new Date())

  if (!primaryArticle || !dailyArticle) {
    return <div className="page-loading">文章库暂时是空的，请先导入一篇英文文章。</div>
  }

  return (
    <div className="dashboard page-stack">
      <section className="dashboard-hero">
        <div className="dashboard-hero__copy">
          <p className="eyebrow">{date} · For Fx</p>
          <h1>让英文的意义，<br />从语境里慢慢浮现。</h1>
          <p className="lede">
            不急着翻译。先读完整的意思，再靠近那个真正让你停下来的表达。
          </p>
          <Link className="primary-button" to={'/read/' + primaryArticle.id}>
            {activeProgress ? '继续今天的阅读' : '开始今天的阅读'}
            <ArrowRight size={18} />
          </Link>
        </div>
        <div className="ink-composition" aria-hidden="true">
          <span className="ink-orbit ink-orbit--one" />
          <span className="ink-orbit ink-orbit--two" />
          <span className="ink-stone" />
          <span className="ink-caption">meaning<br />takes shape</span>
        </div>
      </section>

      <section className="today-reading">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Today’s reading</p>
            <h2>Fx 今天的推荐</h2>
          </div>
          <Link className="quiet-link" to="/library">全部文章 <ArrowRight size={15} /></Link>
        </div>
        <ArticleCard article={dailyArticle} progress={progressMap.get(dailyArticle.id)} featured />
        <p className="daily-recommendation-note">推荐每天按本地日期自动轮换；不会联网抓取文章，也不会打断正在阅读的内容。</p>
      </section>

      <section className="stat-grid" aria-label="学习统计">
        <article>
          <BookOpen size={20} />
          <strong>{completed}</strong>
          <span>篇完整阅读</span>
        </article>
        <article>
          <Compass size={20} />
          <strong>{data.encounters.length}</strong>
          <span>次主动探索</span>
        </article>
        <article>
          <Sprout size={20} />
          <strong>{stable.length}</strong>
          <span>个稳定连接</span>
        </article>
      </section>

      <section>
        <div className="section-heading">
          <div>
            <p className="eyebrow">Recent traces</p>
            <h2>最近留下的理解痕迹</h2>
          </div>
        </div>
        {data.recent.length ? (
          <div className="trace-list">
            {data.recent.map(({ encounter, concept, article }) => {
              const summary = data.summaries.find(
                (item) => item.expressionConceptId === encounter.expressionConceptId,
              )
              return (
                <article className="trace-item" key={encounter.id}>
                  <span className="trace-item__word">{concept?.canonicalForm ?? encounter.selectedText}</span>
                  <div>
                    <p>{encounter.sentenceText}</p>
                    <small>{article?.title} · {summary ? evidenceLabels[summary.evidenceLevel] : '待继续理解'}</small>
                  </div>
                </article>
              )
            })}
          </div>
        ) : (
          <div className="empty-note">
            <p>第一道痕迹，会在你主动探索一个表达后出现在这里。</p>
          </div>
        )}
      </section>
    </div>
  )
}
