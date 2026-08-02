import { useEffect, useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  BookMarked,
  Check,
  ChevronLeft,
  ChevronRight,
  Feather,
  Save,
  Trash2,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import {
  deleteJournalEntry,
  journalRepository,
  saveJournalEntry,
} from '../../db/repository'

const toDateKey = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const fromDateKey = (dateKey: string) => new Date(`${dateKey}T12:00:00`)
const todayKey = toDateKey(new Date())
const weekDays = ['一', '二', '三', '四', '五', '六', '日']

export function JournalPage() {
  const entries = useLiveQuery(() => journalRepository.listEntries(), [])
  const [month, setMonth] = useState(() => {
    const date = new Date()
    return new Date(date.getFullYear(), date.getMonth(), 1)
  })
  const [selectedDate, setSelectedDate] = useState(todayKey)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [message, setMessage] = useState<string>()
  const [saving, setSaving] = useState(false)

  const entryMap = useMemo(
    () => new Map((entries ?? []).map((entry) => [entry.dateKey, entry])),
    [entries],
  )
  const selectedEntry = entryMap.get(selectedDate)

  useEffect(() => {
    setTitle(selectedEntry?.title ?? '')
    setContent(selectedEntry?.content ?? '')
    setMessage(undefined)
  }, [selectedDate, selectedEntry?.updatedAt])

  const firstDayOffset = (month.getDay() + 6) % 7
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
  const calendarCells = [
    ...Array.from({ length: firstDayOffset }, () => undefined),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ]

  const moveMonth = (offset: number) => {
    const next = new Date(month.getFullYear(), month.getMonth() + offset, 1)
    setMonth(next)
    setSelectedDate(toDateKey(next > new Date() ? new Date() : next))
  }

  const save = async () => {
    if (!content.trim()) {
      setMessage('写下一点内容后，这一天才会被填充。')
      return
    }
    setSaving(true)
    try {
      await saveJournalEntry({ dateKey: selectedDate, title, content })
      setMessage('这一天已经收进 Fx 的日记。')
    } catch {
      setMessage('这次没有保存成功，请稍后再试。')
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    if (!selectedEntry) return
    if (!window.confirm('确定删除这一天的日记吗？删除后无法恢复。')) return
    await deleteJournalEntry(selectedDate)
    setTitle('')
    setContent('')
    setMessage('这一天的日记已经移除。')
  }

  if (!entries) return <div className="page-loading">正在展开 Fx 的日记…</div>

  const monthLabel = new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: 'long',
  }).format(month)
  const selectedLabel = new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  }).format(fromDateKey(selectedDate))
  const isCurrentMonth =
    month.getFullYear() === new Date().getFullYear() &&
    month.getMonth() === new Date().getMonth()

  return (
    <div className="personal-journal page-stack">
      <header className="page-intro page-intro--journal journal-heading">
        <div>
          <p className="eyebrow">Fx's journal · one day at a time</p>
          <h1>把日子写下来，<br />让记忆有迹可循。</h1>
          <p>每个被墨色填充的日期，都保存着 Fx 在那一天留下的文字。</p>
        </div>
        <Link className="secondary-button" to="/history">
          <BookMarked size={17} /> 查看英语学习轨迹
        </Link>
      </header>

      <section className="journal-workspace" aria-label="日记日期与编辑器">
        <div className="journal-calendar">
          <div className="calendar-toolbar">
            <button className="icon-button" type="button" onClick={() => moveMonth(-1)} aria-label="上一个月">
              <ChevronLeft size={20} />
            </button>
            <h2>{monthLabel}</h2>
            <button
              className="icon-button"
              type="button"
              onClick={() => moveMonth(1)}
              aria-label="下一个月"
              disabled={isCurrentMonth}
            >
              <ChevronRight size={20} />
            </button>
          </div>
          <div className="calendar-weekdays" aria-hidden="true">
            {weekDays.map((day) => <span key={day}>{day}</span>)}
          </div>
          <div className="calendar-grid">
            {calendarCells.map((day, index) => {
              if (!day) return <span className="journal-day journal-day--empty" key={`empty-${index}`} />
              const dateKey = toDateKey(new Date(month.getFullYear(), month.getMonth(), day))
              const hasEntry = entryMap.has(dateKey)
              const isSelected = selectedDate === dateKey
              const isFuture = dateKey > todayKey
              return (
                <button
                  className={`journal-day${hasEntry ? ' has-entry' : ''}${isSelected ? ' is-selected' : ''}`}
                  type="button"
                  key={dateKey}
                  disabled={isFuture}
                  aria-pressed={isSelected}
                  aria-label={`${dateKey}${hasEntry ? '，已写日记' : '，没有日记'}`}
                  onClick={() => setSelectedDate(dateKey)}
                >
                  <span>{day}</span>
                  {hasEntry && <Check className="journal-day__mark" size={11} aria-hidden="true" />}
                </button>
              )
            })}
          </div>
          <p className="calendar-note"><span /> 墨色日期表示当天已经写过日记</p>
        </div>

        <form className="journal-editor" onSubmit={(event) => { event.preventDefault(); void save() }}>
          <div className="journal-editor__date">
            <Feather size={18} />
            <div>
              <p className="eyebrow">Selected day</p>
              <h2>{selectedLabel}</h2>
            </div>
          </div>
          <label>
            <span>标题（可选）</span>
            <input
              type="text"
              value={title}
              maxLength={80}
              placeholder="给这一天一个名字"
              onChange={(event) => setTitle(event.target.value)}
            />
          </label>
          <label className="journal-editor__body">
            <span>今天想留下什么？</span>
            <textarea
              value={content}
              maxLength={12000}
              placeholder="从此刻最真实的感受开始……"
              onChange={(event) => setContent(event.target.value)}
            />
          </label>
          <div className="journal-editor__actions">
            <button className="primary-button" type="submit" disabled={saving}>
              <Save size={17} /> {saving ? '正在保存…' : '保存这一天'}
            </button>
            {selectedEntry && (
              <button className="journal-delete" type="button" onClick={() => void remove()}>
                <Trash2 size={16} /> 删除
              </button>
            )}
            {message && <p role="status">{message}</p>}
          </div>
        </form>
      </section>

      <section>
        <div className="section-heading">
          <div>
            <p className="eyebrow">Recent pages</p>
            <h2>最近写下的日子</h2>
          </div>
        </div>
        {entries.length ? (
          <div className="diary-entry-list">
            {entries.slice(0, 6).map((entry) => (
              <button
                className="diary-entry-card"
                type="button"
                key={entry.dateKey}
                onClick={() => {
                  const date = fromDateKey(entry.dateKey)
                  setMonth(new Date(date.getFullYear(), date.getMonth(), 1))
                  setSelectedDate(entry.dateKey)
                  window.scrollTo({ top: 0, behavior: 'smooth' })
                }}
              >
                <time dateTime={entry.dateKey}>
                  {new Intl.DateTimeFormat('zh-CN', { month: 'short', day: 'numeric' }).format(fromDateKey(entry.dateKey))}
                </time>
                <span>
                  <strong>{entry.title || '无题日记'}</strong>
                  <small>{entry.content.slice(0, 92)}{entry.content.length > 92 ? '…' : ''}</small>
                </span>
                <ChevronRight size={17} />
              </button>
            ))}
          </div>
        ) : (
          <div className="empty-note">
            <Feather size={24} strokeWidth={1.4} />
            <p>日记还是空白的。选择今天，写下第一段文字吧。</p>
          </div>
        )}
      </section>
    </div>
  )
}
