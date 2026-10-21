import { useEffect, useState } from 'react'
import { finishWorkout, lastSessionOf, lastSetOf, db, writeSets, type SetRec, type Workout } from '../db'
import { beep, buzz, useNow, useWakeLock } from '../hooks'
import { ago, clock, setColor } from '../util'
import ExerciseCard from '../components/ExerciseCard'

const REST_IDS = ['squat', 'bench'] // 有休息提醒的动作

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

  // 深蹲、卧推休息提醒：第 1 组后 5 分钟，之后每组多 1 分钟
  let rest: { name: string; index: number; at: number; min: number } | undefined
  for (const ex of w.exercises)
    if (REST_IDS.includes(ex.id)) {
      const list = w.sets[ex.id] ?? []
      const s = list[list.length - 1]
      if (s && (!rest || s.at > rest.at) && !w.completed?.includes(ex.id))
        rest = { name: ex.name, index: list.length - 1, at: s.at, min: 5 + list.length - 1 }
    }
  const restLeft = rest ? rest.at + rest.min * 60000 - now : null
  const restUp = restLeft != null && restLeft <= 0
  const [dismissed, setDismissed] = useState(0) // 点「知道了」的那组时间
  const alarm = restUp && restLeft! > -180000 && dismissed !== rest!.at // 整屏提醒最多 3 分钟
  useEffect(() => {
    if (!restUp) return
    beep(5)
    buzz()
  }, [restUp, rest?.at])

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
      {alarm && (
        <button className="alarm" onClick={() => setDismissed(rest!.at)}>
          <span className="alarm-big">休息够了</span>
          <span>
            该做{rest!.name}第 {rest!.index + 2} 组
          </span>
          <small>点一下关掉</small>
        </button>
      )}
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
            <span className="main-lab">
              主项休息
              <b>
                {latestMain.name} 第 {latestMain.index + 1} 组
              </b>
            </span>
            <span className="main-clock">{clock(now - latestMain.at)}</span>
          </div>
        )}
        {rest && (
          <div className={'rest-bar' + (restUp ? ' up' : '')}>
            <span className="rest-lab">
              {restUp ? (
                <>
                  休息够了<b>该做{rest.name}第 {rest.index + 2} 组</b>
                </>
              ) : (
                <>
                  {rest.name}第 {rest.index + 1} 组后休息 {rest.min} 分钟<b>还剩 {clock(restLeft!)}</b>
                </>
              )}
            </span>
            <span className="rest-track">
              <span style={{ width: `${Math.min(100, ((rest.min * 60000 - Math.max(0, restLeft!)) / (rest.min * 60000)) * 100)}%` }} />
            </span>
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
