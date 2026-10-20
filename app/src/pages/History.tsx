import { useState } from 'react'
import { db, type Daily, type SetRec, type Workout } from '../db'
import { clock, fmtDate, fmtNum, shiftDate, today } from '../util'
import DailyCard from '../components/DailyCard'

function setText(s: SetRec) {
  if (s.min != null) return `${fmtNum(s.min)} 分钟`
  const kg = s.kg != null ? fmtNum(s.kg) : '自重'
  return s.reps != null ? `${kg}×${fmtNum(s.reps)}` : kg
}

// 按日期翻看：每天的体重 / 热量 / 心率（可补记）和练了什么
export default function History({ workouts, daily }: { workouts: Workout[]; daily: Daily[] }) {
  const [date, setDate] = useState(today())
  const [open, setOpen] = useState<number | null>(null)
  const isToday = date === today()
  const d = daily.find((x) => x.date === date)
  const prev = daily.filter((x) => x.date < date).at(-1)
  const ws = workouts.filter((w) => w.date === date && w.endedAt)

  // 最近记录列表：有数据的日子，倒序
  const dates = [...new Set([...daily.map((x) => x.date), ...workouts.filter((w) => w.endedAt).map((w) => w.date)])]
    .sort()
    .reverse()
    .slice(0, 30)

  return (
    <div>
      <header className="page-head">
        <h1>记录</h1>
      </header>

      <div className="day-nav">
        <button onClick={() => setDate(shiftDate(date, -1))}>‹</button>
        <span>{isToday ? '今天' : fmtDate(date)}</span>
        <button onClick={() => setDate(shiftDate(date, 1))} disabled={isToday}>
          ›
        </button>
      </div>

      <DailyCard key={date} date={date} daily={d} prev={prev} />

      {ws.length === 0 ? (
        <p className="note">这天没有训练记录</p>
      ) : (
        ws.map((w) => (
          <section key={w.id} className="card">
            <button className="row card-head" onClick={() => setOpen(open === w.id ? null : w.id!)}>
              <b>{w.name}</b>
              <span className="sub">用时 {clock((w.endedAt ?? w.startedAt) - w.startedAt)}</span>
            </button>
            {w.exercises
              .filter((ex) => w.sets[ex.id]?.length)
              .map((ex) => (
                <div key={ex.id} className="hist-ex">
                  <span>{ex.name}</span>
                  <span className="sub">{w.sets[ex.id].map(setText).join('  ')}</span>
                </div>
              ))}
            {open === w.id && (
              <button
                className="btn danger small"
                onClick={() => confirm(`删除这次「${w.name}」？`) && db.workouts.delete(w.id!)}
              >
                删除这次训练
              </button>
            )}
          </section>
        ))
      )}

      <h2 className="section">最近</h2>
      <div className="card list">
        {dates.length === 0 && <p className="note">还没有记录</p>}
        {dates.map((x) => {
          const dd = daily.find((y) => y.date === x)
          const wn = workouts.filter((w) => w.date === x && w.endedAt).map((w) => w.name)
          return (
            <button key={x} className={'list-row' + (x === date ? ' on' : '')} onClick={() => setDate(x)}>
              <span className="list-date">{fmtDate(x)}</span>
              <span className="list-vals">
                {dd?.kg != null && <span>{fmtNum(dd.kg)}kg</span>}
                {dd?.kcal != null && <span>{fmtNum(dd.kcal)}千卡</span>}
                {dd?.hr != null && <span>♥{fmtNum(dd.hr)}</span>}
              </span>
              <span className="list-w">{wn.join('、')}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
