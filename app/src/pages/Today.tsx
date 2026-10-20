import { startWorkout, type Daily, type Template, type Workout } from '../db'
import { fmtDate, today } from '../util'
import DailyCard from '../components/DailyCard'

// 首页：今天的体重 / 热量 / 心率 + 选模板开练
export default function Today({
  templates,
  workouts,
  daily,
  active,
  onResume,
  onOpenSettings,
}: {
  templates: Template[]
  workouts: Workout[]
  daily: Daily[]
  active?: Workout // 今天还没结束的训练
  onResume: () => void
  onOpenSettings: () => void
}) {
  const date = today()
  const d = daily.find((x) => x.date === date)
  const prev = daily.filter((x) => x.date < date).at(-1)
  const doneToday = workouts.filter((w) => w.date === date && w.endedAt)

  const lastOf = (t: Template) => workouts.filter((w) => w.templateId === t.id && w.endedAt).at(-1)
  const daysAgo = (w?: Workout) => {
    if (!w) return '还没练过'
    const n = Math.round((new Date(date).getTime() - new Date(w.date).getTime()) / 86400000)
    return n === 0 ? '今天练过' : n === 1 ? '昨天练过' : `${n} 天前练过`
  }

  const start = async (t: Template) => {
    if (active) {
      if (active.templateId === t.id) return onResume()
      if (!confirm(`「${active.name}」还没结束，结束它并开始「${t.name}」？`)) return
    }
    await startWorkout(t, date)
    onResume()
  }

  return (
    <div>
      <header className="page-head row">
        <div>
          <h1>今天</h1>
          <span className="sub">{fmtDate(date)}</span>
        </div>
        <button className="icon-btn" onClick={onOpenSettings} aria-label="设置">
          ⚙︎
        </button>
      </header>

      {active && (
        <button className="resume" onClick={onResume}>
          <span>
            <b>{active.name}</b> 进行中 · 已记 {Object.values(active.sets).flat().length} 组
          </span>
          <span className="resume-go">继续 ›</span>
        </button>
      )}

      <DailyCard key={date} date={date} daily={d} prev={prev} />

      <h2 className="section">开始训练</h2>
      <div className="templates">
        {templates.map((t) => (
          <button key={t.id} className="tpl" onClick={() => start(t)}>
            <span className="tpl-name">{t.name}</span>
            <span className="tpl-ex">{t.exercises.map((e) => e.name).join(' · ')}</span>
            <span className="tpl-last">{daysAgo(lastOf(t))}</span>
          </button>
        ))}
      </div>

      {doneToday.length > 0 && (
        <p className="note">今天已完成：{doneToday.map((w) => w.name).join('、')}</p>
      )}
    </div>
  )
}
