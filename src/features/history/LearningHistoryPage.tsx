import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { ArrowLeft, BookMarked, Layers3, Quote, Sprout, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { deleteUnderstandingTrace, libraryRepository } from '../../db/repository'
import { evidenceLabels } from '../../domain/learning'

export function LearningHistoryPage() {
  const [pendingDeleteId, setPendingDeleteId] = useState<string>()
  const deleteTrace = async (encounterId: string) => {
    await deleteUnderstandingTrace(encounterId)
    setPendingDeleteId(undefined)
  }

  const data = useLiveQuery(async () => {
    const [encounters, sessions, summaries, progress] = await Promise.all([
      libraryRepository.listRecentEncounters(100),
      libraryRepository.listSessions(),
      libraryRepository.listSummaries(),
      libraryRepository.listProgress(),
    ])
    const records = await Promise.all(
      encounters.map(async (encounter) => ({
        encounter,
        session: sessions.find((item) => item.encounterId === encounter.id),
        summary: summaries.find(
          (item) => item.expressionConceptId === encounter.expressionConceptId,
        ),
        concept: encounter.expressionConceptId
          ? await libraryRepository.getConcept(encounter.expressionConceptId)
          : undefined,
        article: await libraryRepository.getArticle(encounter.articleId),
      })),
    )
    return { records, summaries, progress }
  }, [])

  if (!data) return <div className="page-loading">正在整理英语学习轨迹…</div>
  const completed = data.progress.filter((item) => item.status === 'completed')

  return (
    <div className="learning-history page-stack">
      <header className="page-intro page-intro--journal">
        <Link className="quiet-link history-back" to="/journal"><ArrowLeft size={16} /> 返回日记</Link>
        <p className="eyebrow">Learning history · memory in context</p>
        <h1>理解发生过的地方，<br />都留在原来的语境里。</h1>
        <p>这里仅保存英语阅读中的猜测、提示与重读；Fx 的私人日记在 Journal 中独立记录。</p>
      </header>

      <section className="journal-overview">
        <article><BookMarked size={21} /><strong>{completed.length}</strong><span>篇文章读完</span></article>
        <article><Quote size={21} /><strong>{data.records.length}</strong><span>处语境遇见</span></article>
        <article><Sprout size={21} /><strong>{data.summaries.filter((item) => item.evidenceLevel === 4).length}</strong><span>次迁移证据</span></article>
      </section>

      <section>
        <div className="section-heading">
          <div><p className="eyebrow">Encounter history</p><h2>按真实遇见排列</h2></div>
        </div>
        {data.records.length ? (
          <div className="journal-timeline">
            {data.records.map(({ encounter, session, summary, concept, article }) => (
              <article className="journal-entry" key={encounter.id}>
                <div className="journal-entry__date">
                  <span>{new Intl.DateTimeFormat('zh-CN', { month: 'short', day: 'numeric' }).format(new Date(encounter.encounteredAt))}</span>
                  <i />
                </div>
                <div className="journal-entry__paper">
                  <div className="journal-entry__header">
                    <div><p className="eyebrow">{article?.title ?? 'Unknown article'}</p><h3>{concept?.canonicalForm ?? encounter.selectedText}</h3></div>
                    <div className="journal-entry__actions">
                      <span className="evidence-pill">{summary ? evidenceLabels[summary.evidenceLevel] : '个人记录'}</span>
                      <button
                        className="trace-delete"
                        type="button"
                        aria-label={`删除理解痕迹：${concept?.canonicalForm ?? encounter.selectedText}`}
                        aria-expanded={pendingDeleteId === encounter.id}
                        onClick={() => setPendingDeleteId(
                          pendingDeleteId === encounter.id ? undefined : encounter.id,
                        )}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  {pendingDeleteId === encounter.id && (
                    <div className="trace-confirm" role="alert">
                      <p><strong>删除这条理解痕迹？</strong><span>这一次的猜测、提示进度和练习也会删除，且无法恢复。</span></p>
                      <div>
                        <button type="button" onClick={() => setPendingDeleteId(undefined)}>保留</button>
                        <button className="is-danger" type="button" onClick={() => void deleteTrace(encounter.id)}>确认删除</button>
                      </div>
                    </div>
                  )}
                  <blockquote>{encounter.sentenceText}</blockquote>
                  {session?.guessText ? (
                    <div className="guess-note"><span>当时的猜测</span><p>{session.guessText}</p></div>
                  ) : <p className="muted-copy">这次没有留下文字猜测。</p>}
                  <div className="entry-meta">
                    <span><Layers3 size={14} /> 展开至第 {session?.highestRevealedLevel ?? 1} 层</span>
                    {session?.rereadAt && <span>已返回原文重读</span>}
                  </div>
                  <Link className="quiet-link" to={'/read/' + encounter.articleId}>回到这篇文章</Link>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-note empty-note--large">
            <BookMarked size={28} strokeWidth={1.4} />
            <h3>学习轨迹还是空白的。</h3>
            <p>先进入一篇文章。只有某个表达真正挡住理解时，再轻点它。</p>
            <Link className="primary-button" to="/library">去选择文章</Link>
          </div>
        )}
      </section>
    </div>
  )
}
