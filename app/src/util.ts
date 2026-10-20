// 日期、数字格式、每组颜色

export function today() {
  return dateKey(new Date())
}

export function dateKey(d: Date) {
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

export function shiftDate(date: string, days: number) {
  const d = new Date(date + 'T12:00:00')
  d.setDate(d.getDate() + days)
  return dateKey(d)
}

const WEEK = '日一二三四五六'
export function fmtDate(date: string) {
  const d = new Date(date + 'T12:00:00')
  return `${d.getMonth() + 1}月${d.getDate()}日 周${WEEK[d.getDay()]}`
}

// "60.0" → "60"，"62.50" → "62.5"
export function fmtNum(n: number) {
  return String(Math.round(n * 100) / 100)
}

// 空 → undefined；支持逗号小数点
export function parseNum(s: string): number | undefined {
  const n = parseFloat(s.replace(/[,，。]/g, '.'))
  return Number.isFinite(n) && n > 0 ? n : undefined
}

// 一组的文字：100×5 @8 / 自重×8 / 30 分钟
export function setText(s: { kg?: number; reps?: number; min?: number; rpe?: number }) {
  if (s.min != null) return `${fmtNum(s.min)} 分钟`
  const kg = s.kg != null ? fmtNum(s.kg) : '自重'
  const t = s.reps != null ? `${kg}×${fmtNum(s.reps)}` : kg
  return s.rpe != null ? `${t} @${fmtNum(s.rpe)}` : t
}

export function ago(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000))
  if (s < 60) return `${s} 秒前`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m} 分 ${s % 60} 秒前`
  return `${Math.floor(m / 60)} 小时前`
}

export function clock(ms: number) {
  const s = Math.max(0, Math.round(ms / 1000))
  const m = Math.floor(s / 60)
  return `${m}:${String(s % 60).padStart(2, '0')}`
}

// 第 1 组红、2 橙、3 绿、4 蓝、5 紫……每组颜色固定，靠颜色记住做到第几组
export const SET_COLORS = ['#ff3b30', '#ff9500', '#34c759', '#007aff', '#af52de', '#ff2d55', '#30b0c7', '#a2845e']
export function setColor(i: number) {
  return SET_COLORS[i % SET_COLORS.length]
}
