import Dexie, { type EntityTable } from 'dexie'

export type Exercise = {
  id: string
  name: string
  sets?: number // 固定组数；不填 = 看情况，练的时候一组组加
  reps?: number // 每组默认次数
  minutes?: number // 有填 = 有氧，按时长算
  rpe?: boolean // 每组要记 RPE
}

export type Template = {
  id: string
  name: string
  order: number
  exercises: Exercise[]
}

export type SetRec = { kg?: number; reps?: number; min?: number; rpe?: number; at: number }

export type Workout = {
  id?: number
  date: string // YYYY-MM-DD
  templateId: string
  name: string
  startedAt: number
  endedAt?: number
  exercises: Exercise[] // 开练时模板的快照，之后改模板不影响历史
  sets: Record<string, SetRec[]> // 动作 id → 已做的组
  timerStart?: number // 有氧计时开始时间
}

export type Daily = {
  date: string
  kg?: number
  kcal?: number
  hr?: number // 起床静息心率
}

export const db = new Dexie('jianshen') as Dexie & {
  templates: EntityTable<Template, 'id'>
  workouts: EntityTable<Workout, 'id'>
  daily: EntityTable<Daily, 'date'>
}

db.version(1).stores({
  templates: 'id, order',
  workouts: '++id, date, startedAt',
  daily: 'date',
})

// v2：深蹲、硬拉、平板卧推、划船加记 RPE（已有模板和训练一起改）
const RPE_IDS = ['squat', 'deadlift', 'bench', 'row']
const addRpe = (exs: Exercise[]) => exs.forEach((e) => RPE_IDS.includes(e.id) && (e.rpe = true))
db.version(2)
  .stores({})
  .upgrade(async (tx) => {
    await tx.table('templates').toCollection().modify((t: Template) => addRpe(t.exercises))
    await tx.table('workouts').toCollection().modify((w: Workout) => addRpe(w.exercises))
  })

const PULLUP: Exercise = { id: 'pullup', name: '引体', sets: 4, reps: 8 }

export const DEFAULT_TEMPLATES: Template[] = [
  {
    id: 'leg',
    name: '练腿日',
    order: 0,
    exercises: [
      PULLUP,
      { id: 'squat', name: '深蹲', rpe: true },
      { id: 'deadlift', name: '硬拉', rpe: true },
      { id: 'hangleg', name: '悬垂举腿', sets: 4, reps: 6 },
      { id: 'fly', name: '飞鸟', sets: 4, reps: 10 },
    ],
  },
  {
    id: 'upper',
    name: '上半身日',
    order: 1,
    exercises: [
      { id: 'bench', name: '平板卧推', rpe: true },
      { id: 'row', name: '划船', rpe: true },
      { id: 'neckf', name: '前脖子', sets: 4, reps: 20 },
      { id: 'neckb', name: '后脖子', sets: 4, reps: 20 },
      { id: 'skull', name: '仰卧臂屈伸', sets: 4, reps: 8 },
      { id: 'backext', name: '山羊挺身', sets: 4, reps: 10 },
    ],
  },
  {
    id: 'cardio',
    name: '有氧日',
    order: 2,
    exercises: [
      { id: 'cardio', name: '有氧', minutes: 30 },
      PULLUP,
      { id: 'inclinedb', name: '上斜哑铃卧推', sets: 4, reps: 8 },
    ],
  },
]

db.on('populate', (tx) => {
  tx.table('templates').bulkAdd(DEFAULT_TEMPLATES)
})

// 上次这个动作（按名字认）最后一组的重量和次数，用来预填
export function lastSetOf(workouts: Workout[], name: string, exceptId?: number): SetRec | undefined {
  let best: SetRec | undefined
  for (const w of workouts) {
    if (w.id === exceptId) continue
    for (const ex of w.exercises) {
      if (ex.name !== name) continue
      const list = w.sets[ex.id]
      const s = list?.[list.length - 1]
      if (s && (!best || s.at > best.at)) best = s
    }
  }
  return best
}

// 上一次练这个动作（按名字认）的那次训练：日期和每组
export function lastSessionOf(workouts: Workout[], name: string, exceptId?: number) {
  for (let i = workouts.length - 1; i >= 0; i--) {
    const w = workouts[i]
    if (w.id === exceptId) continue
    const ex = w.exercises.find((e) => e.name === name && w.sets[e.id]?.length)
    if (ex) return { date: w.date, sets: w.sets[ex.id] }
  }
}

export function newId() {
  return 'e' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}

export function doneAts(w: Workout) {
  return Object.values(w.sets).flatMap((list) => list.map((s) => s.at))
}

// 结束训练：一组都没做就直接删掉；stale = 忘了点结束的旧训练，按最后一组的时间算结束
export async function finishWorkout(w: Workout, stale = false) {
  const ats = doneAts(w)
  if (!ats.length) return db.workouts.delete(w.id!)
  await db.workouts.update(w.id!, { endedAt: stale ? Math.max(...ats) : Date.now() })
}

export async function startWorkout(t: Template, date: string) {
  const open = await db.workouts.filter((w) => !w.endedAt).toArray()
  for (const w of open) await finishWorkout(w, true)
  return db.workouts.add({
    date,
    templateId: t.id,
    name: t.name,
    startedAt: Date.now(),
    exercises: structuredClone(t.exercises),
    sets: {},
  }) as Promise<number>
}

export async function setDaily(date: string, field: 'kg' | 'kcal' | 'hr', value: number | undefined) {
  await db.transaction('rw', db.daily, async () => {
    const d: Daily = (await db.daily.get(date)) ?? { date }
    d[field] = value
    if (d.kg == null && d.kcal == null && d.hr == null) await db.daily.delete(date)
    else await db.daily.put(d)
  })
}
