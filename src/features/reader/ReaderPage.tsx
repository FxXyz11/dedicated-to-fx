import {
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { ArrowLeft, BookOpenCheck, ChevronDown, ChevronRight, Languages, SlidersHorizontal, X } from 'lucide-react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { PronunciationControls } from '../../components/ui/PronunciationControls'
import { lookupDictionaryEntry } from '../../dictionary/dictionary-service'
import {
  beginExploration,
  completeArticle,
  libraryRepository,
  markReread,
  saveReadingPosition,
  updateSettings,
} from '../../db/repository'
import type { DictionaryLookup } from '../../domain/dictionary'
import type { ArticleBlock, LearningUnit } from '../../domain/models'

interface Selection {
  block: ArticleBlock
  text: string
  sentence: string
  unit?: LearningUnit
}

function BilingualReading({ blocks }: { blocks: ArticleBlock[] }) {
  const hasCompleteTranslation = blocks.length > 0 && blocks.every((block) => Boolean(block.translationZh?.trim()))

  return (
    <section className="bilingual-reading" aria-labelledby="bilingual-title">
      <details>
        <summary>
          <span className="bilingual-reading__icon"><Languages size={20} /></span>
          <span>
            <small>After reading · paragraph by paragraph</small>
            <strong id="bilingual-title">全文中英对照</strong>
          </span>
          <ChevronDown className="bilingual-reading__chevron" size={20} />
        </summary>
        {hasCompleteTranslation ? (
          <div className="bilingual-reading__pairs">
            <p className="bilingual-reading__intro">先完成英文阅读，再用中文校准理解。每一组英文与中文保持同一段落对应。</p>
            {blocks.map((block, index) => (
              <article className="bilingual-pair" key={block.id}>
                <span className="bilingual-pair__number">{String(index + 1).padStart(2, '0')}</span>
                <div>
                  <p className="bilingual-pair__english" lang="en">{block.text}</p>
                  <p className="bilingual-pair__chinese" lang="zh-CN">{block.translationZh}</p>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="bilingual-reading__empty">
            <p>这篇本地文章还没有对应的中文译文。</p>
            <small>网站不会在没有翻译模型或人工校对的情况下编造整篇中文。重新导入时可粘贴逐段对应的中文译文。</small>
          </div>
        )}
      </details>
    </section>
  )
}

function sentenceAt(text: string, index: number) {
  const before = text.lastIndexOf('.', Math.max(0, index - 1))
  const question = text.lastIndexOf('?', Math.max(0, index - 1))
  const exclamation = text.lastIndexOf('!', Math.max(0, index - 1))
  const start = Math.max(before, question, exclamation) + 1
  const endings = [text.indexOf('.', index), text.indexOf('?', index), text.indexOf('!', index)]
    .filter((position) => position >= 0)
  const end = endings.length ? Math.min(...endings) + 1 : text.length
  return text.slice(start, end).trim()
}

function renderWords(
  text: string,
  offset: number,
  block: ArticleBlock,
  onSelect: (selection: Selection) => void,
): ReactNode[] {
  const parts = text.split(/([A-Za-z]+(?:[’'-][A-Za-z]+)*)/g)
  let cursor = offset
  return parts.map((part, index) => {
    const position = cursor
    cursor += part.length
    if (!/^[A-Za-z]/.test(part)) return <span key={'space-' + index + '-' + offset}>{part}</span>
    return (
      <button
        className="word-token"
        key={'word-' + index + '-' + offset}
        type="button"
        onClick={() =>
          onSelect({
            block,
            text: part,
            sentence: sentenceAt(block.text, position),
          })
        }
      >
        {part}
      </button>
    )
  })
}

function InteractiveParagraph({
  block,
  units,
  onSelect,
}: {
  block: ArticleBlock
  units: LearningUnit[]
  onSelect: (selection: Selection) => void
}) {
  const ranges = units
    .map((unit) => {
      const start = block.text.indexOf(unit.selectedText)
      return { unit, start, end: start + unit.selectedText.length }
    })
    .filter((range) => range.start >= 0)
    .sort((a, b) => a.start - b.start)

  const content: ReactNode[] = []
  let cursor = 0
  ranges.forEach((range, rangeIndex) => {
    if (range.start > cursor) {
      content.push(...renderWords(block.text.slice(cursor, range.start), cursor, block, onSelect))
    }
    content.push(
      <button
        className="word-token word-token--planned"
        key={'planned-' + range.unit.id}
        type="button"
        onClick={() =>
          onSelect({
            block,
            text: range.unit.selectedText,
            sentence: range.unit.sentenceText,
            unit: range.unit,
          })
        }
        aria-label={'探索表达 ' + range.unit.selectedText}
      >
        {block.text.slice(range.start, range.end)}
      </button>,
    )
    cursor = range.end
    if (rangeIndex === ranges.length - 1 && cursor < block.text.length) {
      content.push(...renderWords(block.text.slice(cursor), cursor, block, onSelect))
    }
  })

  if (!ranges.length) {
    content.push(...renderWords(block.text, 0, block, onSelect))
  }

  return <>{content}</>
}

function SelectionSheet({
  selection,
  onClose,
  onExplore,
  busy,
}: {
  selection: Selection
  onClose: () => void
  onExplore: () => void
  busy: boolean
}) {
  const actionRef = useRef<HTMLButtonElement>(null)
  const [dictionary, setDictionary] = useState<DictionaryLookup>({ status: 'loading' })

  useEffect(() => {
    actionRef.current?.focus()
  }, [])

  useEffect(() => {
    let active = true
    setDictionary({ status: 'loading' })
    void lookupDictionaryEntry(selection.text).then((result) => {
      if (active) setDictionary(result)
    })
    return () => {
      active = false
    }
  }, [selection.text])

  const dictionaryEntry = dictionary.status === 'found' ? dictionary.entry : undefined

  return (
    <div className="sheet-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        aria-labelledby="selection-title"
        aria-modal="true"
        className="selection-sheet"
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
      >
        <button className="icon-button selection-sheet__close" onClick={onClose} type="button" aria-label="关闭">
          <X size={20} />
        </button>
        <p className="eyebrow">{selection.unit ? 'A guided expression' : 'A personal trace'}</p>
        <h2 id="selection-title">{selection.text}</h2>
        <PronunciationControls
          text={selection.text}
          phonetic={dictionaryEntry?.phonetic}
          compact
        />
        <blockquote>{selection.sentence}</blockquote>
        <p className="selection-sheet__note">
          {selection.unit
            ? '这里有一条渐进式探索路径。答案不会马上出现。'
            : dictionary.status === 'found'
              ? '找到基础学习词典。先写下猜测，之后再逐层查看英文解释与中文辅助。'
              : dictionary.status === 'offline'
                ? '基础词典还没有缓存到本机。联网查询一次后，这一词库分片可以离线复用。'
                : dictionary.status === 'not_found'
                  ? '这可能是姓名、专有名词或很少见的词；仍可保存自己的猜测与原句。'
                  : '正在查找基础学习词典…'}
        </p>
        <button
          className="primary-button primary-button--wide"
          onClick={onExplore}
          type="button"
          ref={actionRef}
          disabled={busy}
        >
          {busy ? '正在保存…' : '先写下我的猜测'}
          <ChevronRight size={18} />
        </button>
      </section>
    </div>
  )
}

export function ReaderPage() {
  const { articleId = '' } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const state = location.state as { blockId?: string; rereadEncounterId?: string } | null
  const [selection, setSelection] = useState<Selection>()
  const [busy, setBusy] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [reflection, setReflection] = useState('')

  const data = useLiveQuery(async () => {
    const [article, progress, units, settings] = await Promise.all([
      libraryRepository.getArticle(articleId),
      libraryRepository.getProgress(articleId),
      libraryRepository.listUnitsForArticle(articleId),
      libraryRepository.getSettings(),
    ])
    return { article, progress, units, settings }
  }, [articleId])

  const unitsByBlock = useMemo(() => {
    const map = new Map<string, LearningUnit[]>()
    data?.units.forEach((unit) => {
      map.set(unit.blockId, [...(map.get(unit.blockId) ?? []), unit])
    })
    return map
  }, [data?.units])

  useEffect(() => {
    if (!data?.article) return
    const target = state?.blockId ?? data.progress?.currentBlockId
    if (!target) return
    const timer = window.setTimeout(() => {
      document.getElementById('block-' + target)?.scrollIntoView({ block: 'center' })
    }, 80)
    return () => window.clearTimeout(timer)
  }, [data?.article, data?.progress?.currentBlockId, state?.blockId])

  useEffect(() => {
    if (!data?.article) return
    const blocks = data.article.blocks
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.find((entry) => entry.isIntersecting)
        if (!visible) return
        const blockId = visible.target.getAttribute('data-block-id')
        const index = blocks.findIndex((block) => block.id === blockId)
        if (!blockId || index < 0) return
        void saveReadingPosition(articleId, blockId, (index + 1) / blocks.length)
      },
      { rootMargin: '-18% 0px -66% 0px', threshold: 0 },
    )
    document.querySelectorAll('[data-reader-block]').forEach((element) => observer.observe(element))
    return () => observer.disconnect()
  }, [articleId, data?.article])

  if (!data?.article) return <div className="page-loading">正在打开文章…</div>
  const { article, progress, settings } = data

  const startExploration = async () => {
    if (!selection) return
    setBusy(true)
    try {
      const encounterId = await beginExploration({
        articleId,
        blockId: selection.block.id,
        selectedText: selection.text,
        sentenceText: selection.sentence,
        learningUnitId: selection.unit?.id,
      })
      navigate('/explore/' + encounterId)
    } finally {
      setBusy(false)
    }
  }

  const finishArticle = async () => {
    await completeArticle(articleId, reflection.trim())
    navigate('/')
  }

  const answerReread = async (assessment: 'clearer' | 'unsure') => {
    if (state?.rereadEncounterId) {
      await markReread(state.rereadEncounterId, assessment)
    }
    navigate(location.pathname, { replace: true, state: null })
  }

  return (
    <div className="reader-page">
      <div className="reader-progress" aria-hidden="true">
        <span style={{ width: Math.round((progress?.progressRatio ?? 0) * 100) + '%' }} />
      </div>
      <header className="reader-toolbar">
        <button className="icon-button" type="button" onClick={() => navigate('/')} aria-label="返回首页">
          <ArrowLeft size={21} />
        </button>
        <span>{article.title}</span>
        <button
          className="icon-button"
          type="button"
          onClick={() => setShowSettings((value) => !value)}
          aria-label="阅读设置"
          aria-expanded={showSettings}
        >
          <SlidersHorizontal size={19} />
        </button>
        {showSettings && settings && (
          <div className="reader-settings">
            <label>
              正文字号
              <input
                type="range"
                min="0.9"
                max="1.25"
                step="0.05"
                value={settings.textScale}
                onChange={(event) => void updateSettings({ textScale: Number(event.target.value) })}
              />
            </label>
            <label>
              行间距
              <input
                type="range"
                min="1.6"
                max="2.1"
                step="0.05"
                value={settings.lineHeight}
                onChange={(event) => void updateSettings({ lineHeight: Number(event.target.value) })}
              />
            </label>
          </div>
        )}
      </header>

      <article className="reader-article">
        <header className="reader-article__header">
          <p className="eyebrow">{article.eyebrow}</p>
          <h1>{article.title}</h1>
          <p>{article.summary}</p>
          <div className="reader-rule"><span /></div>
          <small>轻点真正影响理解的表达。正文不会替你决定哪些是“生词”。</small>
        </header>
        <div className="reader-copy">
          {article.blocks.map((block) => (
            <p
              className={state?.blockId === block.id ? 'reader-block is-returned' : 'reader-block'}
              data-block-id={block.id}
              data-reader-block
              id={'block-' + block.id}
              key={block.id}
            >
              <InteractiveParagraph
                block={block}
                units={unitsByBlock.get(block.id) ?? []}
                onSelect={setSelection}
              />
            </p>
          ))}
        </div>
        <BilingualReading blocks={article.blocks} />
        <footer className="reading-finish">
          <BookOpenCheck size={28} strokeWidth={1.4} />
          <p className="eyebrow">End of the essay</p>
          <h2>读完后，什么留了下来？</h2>
          <textarea
            aria-label="文章回顾"
            placeholder="可以是一幅画面、一个想法，或一句仍想再读的话…"
            value={reflection}
            onChange={(event) => setReflection(event.target.value)}
          />
          <button className="primary-button" type="button" onClick={finishArticle}>
            完成这次阅读
          </button>
        </footer>
        <p className="article-source">
          {article.sourceUrl ? (
            <a href={article.sourceUrl} target="_blank" rel="noreferrer">{article.source}</a>
          ) : article.source}
          {' · '}{article.license}
        </p>
      </article>

      {state?.rereadEncounterId && (
        <aside className="reread-prompt" aria-live="polite">
          <div>
            <strong>再读一次刚才的句子。</strong>
            <span>现在是否更清楚？</span>
          </div>
          <button type="button" onClick={() => void answerReread('clearer')}>更清楚了</button>
          <button type="button" onClick={() => void answerReread('unsure')}>仍有疑问</button>
        </aside>
      )}

      {selection && (
        <SelectionSheet
          selection={selection}
          onClose={() => setSelection(undefined)}
          onExplore={() => void startExploration()}
          busy={busy}
        />
      )}
    </div>
  )
}
