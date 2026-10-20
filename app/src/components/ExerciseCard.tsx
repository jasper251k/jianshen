import { useEffect, useState } from 'react'
import { db, type Exercise, type SetRec, type Workout } from '../db'
import { beep, primeAudio } from '../hooks'
import { clock, fmtNum, parseNum, setColor } from '../util'
import SetSheet from './SetSheet'

async function writeSets(w: Workout, exId: string, fn: (list: SetRec[]) => SetRec[], extra?: Partial<Workout>) {
  await db.workouts
    .where('id')
    .equals(w.id!)
    .modify((x) => {
      x.sets[exId] = fn(x.sets[exId] ?? [])
      if (!x.sets[exId].length) delete x.sets[exId]
      Object.assign(x, extra)
    })
}

function label(s: SetRec) {
  if (s.min != null) return `${fmtNum(s.min)} 分钟`
  const kg = s.kg != null ? fmtNum(s.kg) : '自重'
  return s.reps != null ? `${kg}×${fmtNum(s.reps)}` : kg
}

export default function ExerciseCard({
  w,
  ex,
  prefill,
  now,
  onRecorded,
}: {
  w: Workout
  ex: Exercise
  prefill?: SetRec // 上次这个动作的重量和次数
  now: number
  onRecorded: (index: number) => void
}) {
  const done = w.sets[ex.id] ?? []
  const cardio = ex.minutes != null
  const last = done[done.length - 1]
  const [kg, setKg] = useState(() => {
    const v = last?.kg ?? prefill?.kg
    return v != null ? fmtNum(v) : ''
  })
  const [reps, setReps] = useState(() => {
    const v = ex.reps ?? last?.reps ?? prefill?.reps
    return v != null ? fmtNum(v) : ''
  })
  const [editing, setEditing] = useState<number | null>(null)

  const target = cardio ? 1 : (ex.sets ?? 0)
  const finished = target > 0 && done.length >= target
  // 固定组数：排好所有圆点；看情况的：已做的 + 下一组
  const slots = Math.max(target, done.length + (finished ? 0 : target ? 0 : 1))

  const record = () => {
    const s: SetRec = cardio ? { min: ex.minutes, at: Date.now() } : { kg: parseNum(kg), reps: parseNum(reps), at: Date.now() }
    writeSets(w, ex.id, (list) => [...list, s], cardio ? { timerStart: undefined } : undefined)
    onRecorded(done.length)
  }

  // 有氧计时（按开始时间算，切出去再回来也准）
  const timerLeft = cardio && w.timerStart ? w.timerStart + ex.minutes! * 60000 - now : null
  const timeUp = timerLeft != null && timerLeft <= 0
  useEffect(() => {
    if (timeUp) beep()
  }, [timeUp])

  return (
    <section className={'ex' + (finished ? ' ex-done' : '')}>
      <header className="ex-head">
        <h3>{ex.name}</h3>
        <span className="ex-target">
          {cardio ? `${ex.minutes} 分钟` : ex.sets ? `${ex.sets}×${ex.reps ?? '?'}` : '看情况'}
          {!cardio && done.length > 0 && <b> · 已做 {done.length} 组</b>}
          {finished && <b className="ok"> ✓</b>}
        </span>
      </header>

      <div className="dots">
        {Array.from({ length: slots }, (_, i) => {
          const s = done[i]
          const color = setColor(i)
          if (s)
            return (
              <button key={i} className="dot-wrap" onClick={() => setEditing(i)}>
                <span className="dot on" style={{ background: color, borderColor: color }}>
                  {cardio ? '✓' : i + 1}
                </span>
                <span className="dot-label">{label(s)}</span>
              </button>
            )
          const next = i === done.length
          return (
            <button key={i} className="dot-wrap" onClick={record}>
              <span className={'dot' + (next ? ' next' : '')} style={{ borderColor: color, color }}>
                {cardio ? '完成' : i + 1}
              </span>
              <span className="dot-label">{next ? '点这里' : ' '}</span>
            </button>
          )
        })}
        {finished && !cardio && (
          <button className="dot-wrap" onClick={record}>
            <span className="dot plus">＋</span>
            <span className="dot-label">再加一组</span>
          </button>
        )}
      </div>

      {cardio
        ? !finished && (
            <div className="ex-inputs">
              {timerLeft == null ? (
                <button
                  className="btn small"
                  onClick={() => {
                    primeAudio()
                    writeSets(w, ex.id, (l) => l, { timerStart: Date.now() })
                  }}
                >
                  开始 {ex.minutes} 分钟计时
                </button>
              ) : (
                <>
                  <span className={'timer' + (timerLeft <= 0 ? ' up' : '')}>
                    {timerLeft > 0 ? `还剩 ${clock(timerLeft)}` : '时间到'}
                  </span>
                  <button className="btn small" onClick={() => writeSets(w, ex.id, (l) => l, { timerStart: undefined })}>
                    取消计时
                  </button>
                </>
              )}
            </div>
          )
        : !finished && (
            <div className="ex-inputs">
              <span className="next-tag" style={{ color: setColor(done.length) }}>
                第 {done.length + 1} 组
              </span>
              <label>
                <input inputMode="decimal" value={kg} onChange={(e) => setKg(e.target.value)} placeholder="自重" />
                <small>kg</small>
              </label>
              <span className="times">×</span>
              <label>
                <input inputMode="numeric" value={reps} onChange={(e) => setReps(e.target.value)} placeholder="—" />
                <small>次</small>
              </label>
            </div>
          )}

      {editing != null && done[editing] && (
        <SetSheet
          title={ex.name}
          index={editing}
          set={done[editing]}
          cardio={cardio}
          onSave={(s) => writeSets(w, ex.id, (l) => l.map((x, i) => (i === editing ? s : x)))}
          onDelete={() => writeSets(w, ex.id, (l) => l.filter((_, i) => i !== editing))}
          onClose={() => setEditing(null)}
        />
      )}
    </section>
  )
}
