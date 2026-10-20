import { useState } from 'react'
import { setDaily, type Daily } from '../db'
import { fmtNum, parseNum } from '../util'

type Field = 'kg' | 'kcal' | 'hr'
const FIELDS: { key: Field; label: string; unit: string; decimal: boolean }[] = [
  { key: 'kg', label: '体重', unit: 'kg', decimal: true },
  { key: 'kcal', label: '热量', unit: '千卡', decimal: false },
  { key: 'hr', label: '静息心率', unit: '次/分', decimal: false },
]

// 体重 / 热量 / 起床静息心率三格，输入即保存。父组件用 key={date} 切换日期
export default function DailyCard({ date, daily, prev }: { date: string; daily?: Daily; prev?: Daily }) {
  const [text, setText] = useState<Record<Field, string>>(() => ({
    kg: daily?.kg != null ? fmtNum(daily.kg) : '',
    kcal: daily?.kcal != null ? fmtNum(daily.kcal) : '',
    hr: daily?.hr != null ? fmtNum(daily.hr) : '',
  }))

  const change = (f: Field, v: string) => {
    setText((t) => ({ ...t, [f]: v }))
    setDaily(date, f, parseNum(v))
  }

  return (
    <div className="daily">
      {FIELDS.map((f) => (
        <label key={f.key} className="daily-cell">
          <span className="daily-label">{f.label}</span>
          <span className="daily-input">
            <input
              inputMode={f.decimal ? 'decimal' : 'numeric'}
              value={text[f.key]}
              placeholder="—"
              onChange={(e) => change(f.key, e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
            />
            <small>{f.unit}</small>
          </span>
          <span className="daily-prev">{prev?.[f.key] != null ? `上次 ${fmtNum(prev[f.key]!)}` : ' '}</span>
        </label>
      ))}
    </div>
  )
}
