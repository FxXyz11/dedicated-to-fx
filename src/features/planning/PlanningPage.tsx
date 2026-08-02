import { type FormEvent, useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  Archive,
  CalendarDays,
  Check,
  Circle,
  ListTodo,
  Plus,
  Trash2,
} from 'lucide-react'
import {
  addHabit,
  addPlan,
  archiveHabit,
  deletePlan,
  planningRepository,
  toggleHabitCompletion,
  togglePlanStatus,
} from '../../db/repository'

const toDateKey = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const fromDateKey = (dateKey: string) => new Date(`${dateKey}T12:00:00`)

export function PlanningPage() {
  const data = useLiveQuery(() => planningRepository.getSnapshot(), [])
  const [habitName, setHabitName] = useState('')
  const [planTitle, setPlanTitle] = useState('')
  const [planNote, setPlanNote] = useState('')
  const [targetDate, setTargetDate] = useState('')

  const recentDays = useMemo(() => Array.from({ length: 7 }, (_, index) => {
    const date = new Date()
    date.setHours(12, 0, 0, 0)
    date.setDate(date.getDate() - (6 - index))
    return toDateKey(date)
  }), [])

  if (!data) return <div className="page-loading">正在展开 Fx 的计划页…</div>

  const completionIds = new Set(data.completions.map((item) => item.id))
  const activePlans = data.plans.filter((plan) => plan.status === 'active')
  const completedPlans = data.plans.filter((plan) => plan.status === 'completed')

  const submitHabit = async (event: FormEvent) => {
    event.preventDefault()
    await addHabit(habitName)
    setHabitName('')
  }

  const submitPlan = async (event: FormEvent) => {
    event.preventDefault()
    await addPlan({ title: planTitle, note: planNote, targetDate })
    setPlanTitle('')
    setPlanNote('')
    setTargetDate('')
  }

  return (
    <div className="planning-page page-stack">
      <header className="page-intro page-intro--journal">
        <p className="eyebrow">Fx's plans · rhythm and direction</p>
        <h1>照顾每天的节奏，<br />也记得更远的方向。</h1>
        <p>每日习惯记录重复的行动；计划保存想完成的事情。这里只记录，不制造连胜压力。</p>
      </header>

      <section className="planning-section habit-section">
        <div className="section-heading">
          <div><p className="eyebrow">Daily habits</p><h2>每日习惯</h2></div>
          <CalendarDays size={24} strokeWidth={1.5} />
        </div>
        <form className="inline-add-form" onSubmit={(event) => void submitHabit(event)}>
          <label className="visually-hidden" htmlFor="habit-name">添加每日习惯</label>
          <input id="habit-name" value={habitName} maxLength={60} placeholder="例如：阅读英文 20 分钟" onChange={(event) => setHabitName(event.target.value)} />
          <button className="primary-button" type="submit" disabled={!habitName.trim()}><Plus size={17} /> 添加习惯</button>
        </form>

        {data.habits.length ? (
          <div className="habit-board">
            <div className="habit-board__head">
              <span>习惯</span>
              {recentDays.map((dateKey) => (
                <time key={dateKey} dateTime={dateKey}>
                  <small>{new Intl.DateTimeFormat('zh-CN', { weekday: 'narrow' }).format(fromDateKey(dateKey))}</small>
                  <strong>{fromDateKey(dateKey).getDate()}</strong>
                </time>
              ))}
              <span aria-hidden="true" />
            </div>
            {data.habits.map((habit) => (
              <div className="habit-row" key={habit.id}>
                <strong>{habit.name}</strong>
                {recentDays.map((dateKey) => {
                  const id = habit.id + ':' + dateKey
                  const checked = completionIds.has(id)
                  return (
                    <button
                      className={`habit-check${checked ? ' is-checked' : ''}`}
                      type="button"
                      key={dateKey}
                      aria-pressed={checked}
                      aria-label={`${habit.name}，${dateKey}，${checked ? '已完成' : '未完成'}`}
                      onClick={() => void toggleHabitCompletion(habit.id, dateKey)}
                    >
                      {checked ? <Check size={15} /> : <Circle size={12} />}
                    </button>
                  )
                })}
                <button className="habit-archive" type="button" aria-label={`归档习惯：${habit.name}`} onClick={() => void archiveHabit(habit.id)}>
                  <Archive size={15} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-note"><p>还没有每日习惯。添加一个真正想长期保留的小行动。</p></div>
        )}
      </section>

      <section className="planning-section plan-section">
        <div className="section-heading">
          <div><p className="eyebrow">Plans</p><h2>计划</h2></div>
          <ListTodo size={24} strokeWidth={1.5} />
        </div>
        <form className="plan-form" onSubmit={(event) => void submitPlan(event)}>
          <label><span>想完成什么？</span><input value={planTitle} maxLength={100} placeholder="写下一件清晰的事情" onChange={(event) => setPlanTitle(event.target.value)} /></label>
          <label><span>补充说明（可选）</span><textarea value={planNote} maxLength={1000} placeholder="为什么要做、下一步是什么……" onChange={(event) => setPlanNote(event.target.value)} /></label>
          <div className="plan-form__footer">
            <label><span>目标日期（可选）</span><input type="date" value={targetDate} onChange={(event) => setTargetDate(event.target.value)} /></label>
            <button className="primary-button" type="submit" disabled={!planTitle.trim()}><Plus size={17} /> 添加计划</button>
          </div>
        </form>

        <div className="plan-lists">
          <div>
            <p className="plan-list-title">正在进行 · {activePlans.length}</p>
            {activePlans.length ? activePlans.map((plan) => (
              <article className="plan-card" key={plan.id}>
                <button className="plan-status" type="button" aria-label={`完成计划：${plan.title}`} onClick={() => void togglePlanStatus(plan.id)}><Circle size={18} /></button>
                <div><h3>{plan.title}</h3>{plan.note && <p>{plan.note}</p>}{plan.targetDate && <time dateTime={plan.targetDate}>目标：{new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium' }).format(fromDateKey(plan.targetDate))}</time>}</div>
                <button className="plan-delete" type="button" aria-label={`删除计划：${plan.title}`} onClick={() => { if (window.confirm('确定删除这项计划吗？')) void deletePlan(plan.id) }}><Trash2 size={15} /></button>
              </article>
            )) : <p className="muted-copy">现在没有进行中的计划。</p>}
          </div>
          {completedPlans.length > 0 && (
            <div>
              <p className="plan-list-title">已经完成 · {completedPlans.length}</p>
              {completedPlans.map((plan) => (
                <article className="plan-card is-completed" key={plan.id}>
                  <button className="plan-status" type="button" aria-label={`恢复计划：${plan.title}`} onClick={() => void togglePlanStatus(plan.id)}><Check size={18} /></button>
                  <div><h3>{plan.title}</h3>{plan.completedAt && <time dateTime={plan.completedAt}>完成于 {new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium' }).format(new Date(plan.completedAt))}</time>}</div>
                  <button className="plan-delete" type="button" aria-label={`删除计划：${plan.title}`} onClick={() => { if (window.confirm('确定删除这项计划吗？')) void deletePlan(plan.id) }}><Trash2 size={15} /></button>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
