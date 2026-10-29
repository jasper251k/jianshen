import { db } from './db'
import { today } from './util'

// 导出全部数据为一个 JSON 文件；手机上弹出分享，可存到「文件」/ iCloud
export async function exportBackup() {
  const data = {
    app: 'jianshen',
    version: 1,
    templates: await db.templates.toArray(),
    workouts: await db.workouts.toArray(),
    daily: await db.daily.toArray(),
    plan: await db.plan.toArray(),
  }
  const name = `训练记备份-${today()}.json`
  const file = new File([JSON.stringify(data)], name, { type: 'application/json' })
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] })
      return
    } catch (e) {
      if ((e as Error).name === 'AbortError') return
    }
  }
  const a = document.createElement('a')
  a.href = URL.createObjectURL(file)
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}

// 用备份替换手机里的全部数据
export async function importBackup(file: File) {
  const data = JSON.parse(await file.text())
  if (data?.app !== 'jianshen') throw new Error('不是训练记的备份文件')
  await db.transaction('rw', [db.templates, db.workouts, db.daily, db.plan], async () => {
    await Promise.all([db.templates.clear(), db.workouts.clear(), db.daily.clear()])
    await db.templates.bulkAdd(data.templates ?? [])
    await db.workouts.bulkAdd(data.workouts ?? [])
    await db.daily.bulkAdd(data.daily ?? [])
    // 旧备份没有计划截图，就保留手机里现在这张
    if (data.plan) {
      await db.plan.clear()
      await db.plan.bulkAdd(data.plan)
    }
  })
}
