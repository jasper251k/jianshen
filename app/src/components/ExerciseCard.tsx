import { useEffect, useRef, useState } from 'react'
import { setCompleted, writeSets, type Exercise, type SetRec, type Workout } from '../db'
import { beep, primeAudio } from '../hooks'
import { clock, fmtDate, fmtNum, parseNum, setColor, setText } from '../util'
import RpeSheet from './RpeSheet'
import SetSheet from './SetSheet'

export default function ExerciseCard({
  w,
  ex,
  prefill,
  lastSession,
  now,
  onRecorded,
  onDeleted,
}: {
  w: Workout
  ex: Exercise
  prefill?: SetRec // 上次这个动作的重量和次数
  lastSession?: { date: string; sets: SetRec[] } // 上次练这个动作的每组
  now: number
  onRecorded: (index: number) => void
  onDeleted: (index: number) => void
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
  const [rpe, setRpe] = useState('') // 每组现填，不沿用
  const [needRpe, setNeedRpe] = useState(false) // 没填 RPE 就点了下一组
  const [showRpe, setShowRpe] = useState(false) // RPE 对照表
  const rpeInput = useRef<HTMLInputElement>(null)
  const [editing, setEditing] = useState<number | null>(null)
  // 点一下改，连点两下删；刚记的 0.6 秒内不算，防止点「下一组」时手快多点一下就删了
  const tap = useRef<{ i: number; t: number; timer?: number }>({ i: -1, t: 0 })
  const tapDone = (i: number) => {
    if (completed) return
    const now = Date.now()
    if (now - done[i].at < 600) return
    const last = tap.current
    clearTimeout(last.timer)
    if (last.i === i && now - last.t < 350) {
      tap.current = { i: -1, t: 0 }
      writeSets(w, ex.id, (l) => l.filter((_, j) => j !== i))
      onDeleted(i)
      return
    }
    tap.current = { i, t: now, timer: setTimeout(() => setEditing(i), 300) }
  }

  const completed = !!w.completed?.includes(ex.id)
  const target = cardio ? 1 : (ex.sets ?? 0)
  const finished = completed || (target > 0 && done.length >= target)
  // 固定组数：排好所有圆点；看情况的：已做的 + 下一组；点了完成只留已做的
  const slots = completed ? done.length : Math.max(target, done.length + (finished ? 0 : target ? 0 : 1))

  const record = () => {
    if (completed) return
    // 深蹲、硬拉、卧推、划船：必须先填 RPE
    if (ex.rpe && parseNum(rpe) == null) {
      setNeedRpe(true)
      rpeInput.current?.focus()
      return
    }
    setNeedRpe(false)
    const s: SetRec = cardio ? { min: ex.minutes, at: Date.now() } : { kg: parseNum(kg), reps: parseNum(reps), rpe: ex.rpe ? parseNum(rpe) : undefined, at: Date.now() }
    writeSets(w, ex.id, (list) => [...list, s], cardio ? { timerStart: undefined } : undefined)
    setRpe('')
    onRecorded(done.length)
  }

  // 有氧计时（按开始时间算，切出去再回来也准）
  const timerLeft = cardio && w.timerStart ? w.timerStart + ex.minutes! * 60000 - now : null
  const timeUp = timerLeft != null && timerLeft <= 0
  useEffect(() => {
    if (timeUp) beep()
  }, [timeUp])

  return (
    <section className={'ex' + (finished ? ' ex-done' : '') + (completed ? ' ex-completed' : '')}>
      <header className="ex-head">
        <h3>{ex.name}</h3>
        <span className="ex-target">
          {cardio ? `${ex.minutes} 分钟` : ex.sets ? `${ex.sets}×${ex.reps ?? '?'}` : '看情况'}
          {!cardio && done.length > 0 && <b> · 已做 {done.length} 组</b>}
          {finished && <b className="ok"> ✓</b>}
          {completed && (
            <button className="link reopen" onClick={() => setCompleted(w, ex.id, false)}>
              撤回
            </button>
          )}
        </span>
      </header>

      {ex.rpe && lastSession && !completed && (
        <p className="ex-last">
          上次 {fmtDate(lastSession.date).replace(/ 周./, '')}：{lastSession.sets.map((s) => setText(s)).join('，')}
        </p>
      )}

      <div className="dots">
        {Array.from({ length: slots }, (_, i) => {
          const s = done[i]
          const color = setColor(i)
          if (s)
            return (
              <button key={i} className="dot-wrap" onClick={() => tapDone(i)}>
                <span className="dot on" style={{ '--c': color } as React.CSSProperties}>
                  {cardio ? '✓' : i + 1}
                </span>
                <span className="dot-label">{setText({ ...s, rpe: undefined })}</span>
                {s.rpe != null && <span className="dot-rpe">RPE {fmtNum(s.rpe)}</span>}
              </button>
            )
          const next = i === done.length
          return (
            <button key={i} className="dot-wrap" onClick={record}>
              <span className={'dot' + (next ? ' next' : '')} style={next ? ({ '--c': color } as React.CSSProperties) : undefined}>
                {cardio ? '完成' : i + 1}
              </span>
              <span className="dot-label">{next ? '点这里' : ' '}</span>
            </button>
          )
        })}
        {finished && !completed && !cardio && (
          <button className="dot-wrap" onClick={record}>
            <span className="dot plus">＋</span>
            <span className="dot-label">再加一组</span>
          </button>
        )}
      </div>

      {completed
        ? null
        : cardio
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
              {ex.rpe && (
                <div className={'field rpe-in' + (needRpe ? ' need' : '')}>
                  <button className="rpe-help" onClick={() => setShowRpe(true)}>
                    RPE ⓘ
                  </button>
                  <input
                    ref={rpeInput}
                    inputMode="decimal"
                    value={rpe}
                    onChange={(e) => {
                      setRpe(e.target.value)
                      setNeedRpe(false)
                    }}
                    placeholder="必填"
                  />
                </div>
              )}
              {needRpe && <span className="rpe-warn">先填 RPE 再点圆点</span>}
            </div>
          )}

      {!completed && done.length > 0 && (
        <button
          className="btn small complete"
          onClick={() => confirm(`${ex.name} 做完了？完成后排到最底下，不能再点。`) && setCompleted(w, ex.id, true)}
        >
          完成这个动作
        </button>
      )}

      {showRpe && (
        <RpeSheet
          onPick={(n) => {
            setRpe(String(n))
            setNeedRpe(false)
          }}
          onClose={() => setShowRpe(false)}
        />
      )}

      {editing != null && done[editing] && (
        <SetSheet
          title={ex.name}
          index={editing}
          set={done[editing]}
          cardio={cardio}
          rpe={!!ex.rpe}
          onSave={(s) => writeSets(w, ex.id, (l) => l.map((x, i) => (i === editing ? s : x)))}
          onDelete={() => writeSets(w, ex.id, (l) => l.filter((_, i) => i !== editing))}
          onClose={() => setEditing(null)}
        />
      )}
    </section>
  )
}
