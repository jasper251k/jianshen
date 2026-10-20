import { useEffect, useState } from 'react'
import { finishWorkout, lastSessionOf, lastSetOf, db, writeSets, type SetRec, type Workout } from '../db'
import { useNow, useWakeLock } from '../hooks'
import { ago, clock, setColor } from '../util'
import ExerciseCard from '../components/ExerciseCard'

// 正在练：顶部常驻「刚记了什么」，下面每个动作一张卡
export default function WorkoutView({ w, history, onBack }: { w: Workout; history: Workout[]; onBack: () => void }) {
  const now = useNow()
  useWakeLock(true)
  const [flash, setFlash] = useState<number | null>(null) // 刚点的那组颜色，整屏闪一下

  // 删掉一组后，底部提示 5 秒，可撤销
  type Removed = { exId: string; name: string; index: number; set: SetRec; key: number }
  const [removed, setRemoved] = useState<Removed | null>(null)
  useEffect(() => {
    if (!removed) return
    const t = setTimeout(() => setRemoved(null), 5000)
    return () => clearTimeout(t)
  }, [removed])
  const remove = (exId: string, index: number, set: SetRec) => {
    const name = w.exercises.find((e) => e.id === exId)?.name ?? ''
    setRemoved({ exId, name, index, set, key: Date.now() })
  }
  const undo = () => {
    if (!removed) return
    const r = removed
    writeSets(w, r.exId, (l) => [...l.slice(0, r.index), r.set, ...l.slice(r.index)])
    setRemoved(null)
  }

  useEffect(() => {
    if (flash == null) return
    const t = setTimeout(() => setFlash(null), 600)
    return () => clearTimeout(t)
  }, [flash])

  // 最近一次记录；main = 只看深蹲、硬拉、卧推、划船（记 RPE 的），用来算主项休息了多久
  const latestOf = (main: boolean) => {
    let best: { exId: string; name: string; index: number; at: number } | undefined
    for (const ex of w.exercises)
      if (!main || ex.rpe)
        (w.sets[ex.id] ?? []).forEach((s, i) => {
          if (!best || s.at > best.at) best = { exId: ex.id, name: ex.name, index: i, at: s.at }
        })
    return best
  }
  const latest = latestOf(false)
  const latestMain = latestOf(true)

  // 点了「完成这个动作」的按完成顺序排到最底下
  const completed = w.completed ?? []
  const ordered = [
    ...w.exercises.filter((ex) => !completed.includes(ex.id)),
    ...completed.map((id) => w.exercises.find((ex) => ex.id === id)!).filter(Boolean),
  ]

  const total = w.exercises.length
  const doneCount = w.exercises.filter((ex) => {
    if (completed.includes(ex.id)) return true
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
            <button
              className="btn small last-undo"
              onClick={() => {
                const set = w.sets[latest.exId][latest.index]
                writeSets(w, latest.exId, (l) => l.filter((_, j) => j !== latest.index))
                remove(latest.exId, latest.index, set)
              }}
            >
              删掉这组
            </button>
          </>
        ) : (
          <span className="last-text">
            还没记录<small>做完一组，点对应的圆点</small>
          </span>
        )}
        {latestMain && (
          <div className="main-bar">
            <span className="main-dot" style={{ background: setColor(latestMain.index) }}>
              {latestMain.index + 1}
            </span>
            主项：{latestMain.name} 第 {latestMain.index + 1} 组<b>{ago(now - latestMain.at)}</b>
          </div>
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

      {ordered.map((ex) => (
        <ExerciseCard
          key={ex.id}
          w={w}
          ex={ex}
          prefill={lastSetOf(history, ex.name, w.id)}
          lastSession={lastSessionOf(history, ex.name, w.id)}
          now={now}
          onRecorded={(i) => setFlash(i)}
          onDeleted={(i) => remove(ex.id, i, w.sets[ex.id][i])}
        />
      ))}

      {removed && (
        <div className="toast" key={removed.key}>
          <span>
            已删除 {removed.name} 第 {removed.index + 1} 组
          </span>
          <button onClick={undo}>撤销</button>
        </div>
      )}

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
