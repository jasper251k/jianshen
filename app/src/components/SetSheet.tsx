import { useState } from 'react'
import type { SetRec } from '../db'
import { fmtNum, parseNum, setColor } from '../util'

// 点已做的组：改重量 / 次数，或删掉这组
export default function SetSheet({
  title,
  index,
  set,
  cardio,
  onSave,
  onDelete,
  onClose,
}: {
  title: string
  index: number
  set: SetRec
  cardio: boolean
  onSave: (s: SetRec) => void
  onDelete: () => void
  onClose: () => void
}) {
  const [kg, setKg] = useState(set.kg != null ? fmtNum(set.kg) : '')
  const [reps, setReps] = useState(set.reps != null ? fmtNum(set.reps) : '')
  const [min, setMin] = useState(set.min != null ? fmtNum(set.min) : '')

  const save = () => {
    onSave(cardio ? { ...set, min: parseNum(min) } : { ...set, kg: parseNum(kg), reps: parseNum(reps) })
    onClose()
  }

  return (
    <div className="sheet-mask" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <h2>
          <span className="sheet-dot" style={{ background: setColor(index) }}>
            {index + 1}
          </span>
          {title} 第 {index + 1} 组
        </h2>
        {cardio ? (
          <div className="sheet-fields">
            <label>
              <input inputMode="decimal" value={min} onChange={(e) => setMin(e.target.value)} placeholder="—" />
              <small>分钟</small>
            </label>
          </div>
        ) : (
          <div className="sheet-fields">
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
        <button className="btn primary" onClick={save}>
          保存
        </button>
        <button
          className="btn danger"
          onClick={() => {
            onDelete()
            onClose()
          }}
        >
          删掉这组
        </button>
      </div>
    </div>
  )
}
