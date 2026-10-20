import { useEffect, useMemo, useState } from 'react'
import { finishWorkout, lastSessionOf, lastSetOf, db, type Workout } from '../db'
import { useNow, useWakeLock } from '../hooks'
import { ago, clock, setColor } from '../util'
import ExerciseCard from '../components/ExerciseCard'

// 正在练：顶部常驻「刚记了什么」，下面每个动作一张卡
export default function WorkoutView({ w, history, onBack }: { w: Workout; history: Workout[]; onBack: () => void }) {
  const now = useNow()
  useWakeLock(true)
  const [flash, setFlash] = useState<number | null>(null) // 刚点的那组颜色，整屏闪一下

  useEffect(() => {
    if (flash == null) return
    const t = setTimeout(() => setFlash(null), 600)
    return () => clearTimeout(t)
  }, [flash])

  // 最近一次记录
  const latest = useMemo(() => {
    let best: { name: string; index: number; at: number } | undefined
    for (const ex of w.exercises)
      (w.sets[ex.id] ?? []).forEach((s, i) => {
        if (!best || s.at > best.at) best = { name: ex.name, index: i, at: s.at }
      })
    return best
  }, [w])

  const total = w.exercises.length
  const doneCount = w.exercises.filter((ex) => {
    const n = w.sets[ex.id]?.length ?? 0
    const target = ex.minutes != null ? 1 : ex.sets
    return target ? n >= target : n > 0
  }).length

  const finish = async () => {
    if (!latest && !confirm('一组都没记，结束就不保存这次训练，确定吗？')) return
    finishWorkout(w)
  }

  return (
    <div className="workout">
      {flash != null && <div className="flash" style={{ background: setColor(flash) }} />}
      <div className="last-bar" style={latest ? { borderLeftColor: setColor(latest.index) } : undefined}>
        {latest ? (
          <>
            <span className="last-dot" style={{ background: setColor(latest.index) }}>
              {latest.index + 1}
            </span>
            <span className="last-text">
              <span>
                刚记：<b>{latest.name} 第 {latest.index + 1} 组</b>
              </span>
              <small>{ago(now - latest.at)}</small>
            </span>
          </>
        ) : (
          <span className="last-text">
            还没记录<small>做完一组，点对应的圆点</small>
          </span>
        )}
      </div>

      <header className="page-head">
        <button className="link back" onClick={onBack}>
          ‹ 首页
        </button>
        <h1>{w.name}</h1>
        <span className="sub">
          已练 {clock(now - w.startedAt)} · {doneCount}/{total} 个动作
        </span>
      </header>

      {w.exercises.map((ex) => (
        <ExerciseCard
          key={ex.id}
          w={w}
          ex={ex}
          prefill={lastSetOf(history, ex.name, w.id)}
          lastSession={lastSessionOf(history, ex.name, w.id)}
          now={now}
          onRecorded={(i) => setFlash(i)}
        />
      ))}

      <button className="btn primary finish" onClick={finish}>
        结束训练
      </button>
      <button
        className="btn plain"
        onClick={() => confirm('放弃这次训练？记过的组都会删掉。') && db.workouts.delete(w.id!)}
      >
        放弃这次训练
      </button>
    </div>
  )
}
