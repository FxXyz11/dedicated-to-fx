import { type FormEvent, useMemo, useState } from 'react'
import { ArrowLeft, BookOpen, Check, ClipboardCopy, FilePlus2, Languages } from 'lucide-react'
import { Link } from 'react-router-dom'
import { importArticle } from '../../db/repository'
import type { Article } from '../../domain/models'

const topics = [
  'Art & Design',
  'Culture & Stories',
  'Nature & Animals',
  'Science & Society',
  'CET-4 themes',
  'Personal Reading',
]

export function ImportArticlePage() {
  const [mode, setMode] = useState<'english' | 'chinese'>('english')
  const [title, setTitle] = useState('')
  const [summary, setSummary] = useState('')
  const [topic, setTopic] = useState(topics[0])
  const [difficulty, setDifficulty] = useState<Article['difficulty']>('Gentle')
  const [source, setSource] = useState('')
  const [text, setText] = useState('')
  const [chineseText, setChineseText] = useState('')
  const [message, setMessage] = useState<string>()
  const [importedId, setImportedId] = useState<string>()
  const [busy, setBusy] = useState(false)

  const wordCount = useMemo(
    () => (text.match(/[A-Za-z]+(?:[’'-][A-Za-z]+)*/g) ?? []).length,
    [text],
  )

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setImportedId(undefined)
    try {
      const result = await importArticle({ title, summary, topic, difficulty, source, text })
      if (!result.ok) {
        setMessage(result.error)
        return
      }
      setMessage(`文章已保存在本机，共约 ${result.wordCount} 个英文词。现在可以点词查看发音和基础学习词典。`)
      setImportedId(result.article.id)
    } catch {
      setMessage('这次导入没有完成，请稍后再试。')
    } finally {
      setBusy(false)
    }
  }

  const copyChineseWorkflow = async () => {
    if (!chineseText.trim()) {
      setMessage('先粘贴需要改写的中文文章。')
      return
    }
    const prompt = `请把下面的中文文章改写为自然、连贯、适合英语学习者阅读的英文文章。\n\n要求：\n1. 保留原意与叙事逻辑，不逐字硬译；\n2. 使用自然英文搭配，整体难度约为大学英语四级至 B2；\n3. 分段清楚，给出英文标题；\n4. 不添加原文没有的事实；\n5. 只输出英文标题和正文。\n\n中文原文：\n${chineseText.trim()}`
    try {
      await navigator.clipboard.writeText(prompt)
      setMessage('转换要求已复制。交给你信任的 AI 处理后，把英文结果粘贴回“导入英文”即可。')
    } catch {
      setMessage('浏览器没有允许复制。可以手动复制中文，再让 AI 按“自然改写、保留原意、四级至 B2 难度”处理。')
    }
  }

  return (
    <div className="import-page page-stack">
      <header className="page-intro page-intro--journal">
        <Link className="quiet-link history-back" to="/library"><ArrowLeft size={16} /> 返回文章库</Link>
        <p className="eyebrow">Local import · stays on this device</p>
        <h1>把想读的英文，<br />放进 Fx 的文章库。</h1>
        <p>正文只会作为纯文本保存在这台设备，并自动加入每日推荐候选。</p>
      </header>

      <div className="import-mode" role="tablist" aria-label="导入方式">
        <button className={mode === 'english' ? 'is-active' : ''} type="button" role="tab" aria-selected={mode === 'english'} onClick={() => { setMode('english'); setMessage(undefined) }}>
          <FilePlus2 size={18} /> 导入英文
        </button>
        <button className={mode === 'chinese' ? 'is-active' : ''} type="button" role="tab" aria-selected={mode === 'chinese'} onClick={() => { setMode('chinese'); setMessage(undefined) }}>
          <Languages size={18} /> 中文转英文流程
        </button>
      </div>

      {mode === 'english' ? (
        <form className="article-import-form" onSubmit={(event) => void submit(event)}>
          <section className="import-fields">
            <div className="section-heading">
              <div><p className="eyebrow">Article details</p><h2>文章信息</h2></div>
            </div>
            <label><span>英文标题</span><input value={title} maxLength={120} placeholder="Title of the article" onChange={(event) => setTitle(event.target.value)} /></label>
            <label><span>简短介绍（可选）</span><textarea value={summary} maxLength={320} placeholder="不填写时，将使用第一段生成简介。" onChange={(event) => setSummary(event.target.value)} /></label>
            <div className="import-field-row">
              <label><span>主题</span><select value={topic} onChange={(event) => setTopic(event.target.value)}>{topics.map((item) => <option key={item}>{item}</option>)}</select></label>
              <label><span>阅读难度</span><select value={difficulty} onChange={(event) => setDifficulty(event.target.value as Article['difficulty'])}><option value="Gentle">Gentle</option><option value="Stretch">Stretch</option></select></label>
            </div>
            <label><span>来源（可选）</span><input value={source} maxLength={200} placeholder="作者、书名或网页名称" onChange={(event) => setSource(event.target.value)} /></label>
          </section>

          <section className="import-text-panel">
            <div className="section-heading">
              <div><p className="eyebrow">Plain English text</p><h2>英文正文</h2></div>
              <span className="word-count">{wordCount} words</span>
            </div>
            <label className="visually-hidden" htmlFor="article-text">英文正文</label>
            <textarea id="article-text" value={text} maxLength={60000} placeholder={'Paste the complete English article here.\n\nUse a blank line between paragraphs.'} onChange={(event) => setText(event.target.value)} />
            <div className="import-guidance">
              <p><strong>导入后可以：</strong>离线阅读、记录进度、点击单词播放英式/美式发音，并进入每日推荐。</p>
              <p><strong>词典范围：</strong>普通单词会逐层显示基础英文释义与中文辅助；已策划表达还会提供当前语境和核心概念。姓名、拼写错误或极少见的专业词可能没有词条。</p>
              <p><strong>离线说明：</strong>词库按小块下载。某类单词联网查询过一次后会缓存到手机；尚未下载的词库在完全离线时暂时无法查询。</p>
            </div>
            <button className="primary-button" type="submit" disabled={busy || !title.trim() || !text.trim()}>
              <BookOpen size={18} /> {busy ? '正在保存…' : '保存到文章库'}
            </button>
            {message && <div className="settings-message" role="status">{message}</div>}
            {importedId && <Link className="secondary-button" to={'/read/' + importedId}><Check size={17} /> 开始阅读这篇文章</Link>}
          </section>
        </form>
      ) : (
        <section className="chinese-workflow">
          <div className="translation-boundary">
            <Languages size={25} />
            <div>
              <p className="eyebrow">Why it is not automatic</p>
              <h2>站内不会假装自己能离线翻译。</h2>
              <p>把中文改写成顺畅英文需要语言模型或人工编辑。当前网站没有服务器、API Key 或内置大模型，因此不能在本机自动完成可靠翻译，也不会把生硬机器结果当成学习文章。</p>
            </div>
          </div>
          <label><span>中文原文</span><textarea value={chineseText} maxLength={30000} placeholder="粘贴中文后，可复制一份专门为英语学习设计的转换要求。" onChange={(event) => setChineseText(event.target.value)} /></label>
          <button className="primary-button" type="button" onClick={() => void copyChineseWorkflow()} disabled={!chineseText.trim()}><ClipboardCopy size={18} /> 复制英文改写要求</button>
          {message && <div className="settings-message" role="status">{message}</div>}
          <ol className="translation-steps">
            <li><span>1</span>复制改写要求。</li>
            <li><span>2</span>交给 ChatGPT 或人工译者生成并检查英文。</li>
            <li><span>3</span>回到“导入英文”，把确认后的英文保存进文章库。</li>
          </ol>
        </section>
      )}
    </div>
  )
}
