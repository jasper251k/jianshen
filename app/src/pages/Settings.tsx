import { useRef, useState } from 'react'
import { db, DEFAULT_TEMPLATES, newId, type Exercise, type Template } from '../db'
import { exportBackup, importBackup } from '../backup'
import { fmtNum, parseNum } from '../util'

// 编辑一个模板：动作名、组数、次数、顺序
function TemplateEditor({ t, onDone }: { t: Template; onDone: () => void }) {
  const [name, setName] = useState(t.name)
  const [list, setList] = useState<Exercise[]>(t.exercises)

  const patch = (i: number, p: Partial<Exercise>) => setList((l) => l.map((e, j) => (j === i ? { ...e, ...p } : e)))
  const move = (i: number, d: number) =>
    setList((l) => {
      const j = i + d
      if (j < 0 || j >= l.length) return l
      const n = [...l]
      ;[n[i], n[j]] = [n[j], n[i]]
      return n
    })
  const num = (v?: number) => (v != null ? fmtNum(v) : '')

  const save = async () => {
    const exercises = list.filter((e) => e.name.trim()).map((e) => ({ ...e, name: e.name.trim() }))
    await db.templates.update(t.id, { name: name.trim() || t.name, exercises })
    onDone()
  }

  return (
    <div>
      <header className="page-head row">
        <button className="link" onClick={onDone}>
          取消
        </button>
        <button className="link strong" onClick={save}>
          保存
        </button>
      </header>
      <input className="tpl-title" value={name} onChange={(e) => setName(e.target.value)} />
      <p className="note">组数空着 = 看情况，练的时候一组组加。有氧填分钟。</p>

      {list.map((e, i) => (
        <div key={e.id} className="card edit-ex">
          <div className="row">
            <input className="ex-name" value={e.name} placeholder="动作名" onChange={(x) => patch(i, { name: x.target.value })} />
            <button className="icon-btn" onClick={() => move(i, -1)} disabled={i === 0}>
              ↑
            </button>
            <button className="icon-btn" onClick={() => move(i, 1)} disabled={i === list.length - 1}>
              ↓
            </button>
            <button className="icon-btn danger" onClick={() => setList((l) => l.filter((_, j) => j !== i))}>
              ✕
            </button>
          </div>
          {e.minutes != null ? (
            <div className="edit-nums">
              <label>
                <input inputMode="numeric" value={num(e.minutes)} onChange={(x) => patch(i, { minutes: parseNum(x.target.value) ?? 0 })} />
                <small>分钟</small>
              </label>
            </div>
          ) : (
            <div className="edit-nums">
              <label>
                <input inputMode="numeric" value={num(e.sets)} placeholder="看情况" onChange={(x) => patch(i, { sets: parseNum(x.target.value) })} />
                <small>组</small>
              </label>
              <span className="times">×</span>
              <label>
                <input inputMode="numeric" value={num(e.reps)} placeholder="—" onChange={(x) => patch(i, { reps: parseNum(x.target.value) })} />
                <small>次</small>
              </label>
            </div>
          )}
        </div>
      ))}

      <div className="row gap">
        <button className="btn" onClick={() => setList((l) => [...l, { id: newId(), name: '' }])}>
          ＋ 加动作
        </button>
        <button className="btn" onClick={() => setList((l) => [...l, { id: newId(), name: '有氧', minutes: 30 }])}>
          ＋ 加有氧
        </button>
      </div>
    </div>
  )
}

export default function Settings({ templates, onClose }: { templates: Template[]; onClose: () => void }) {
  const [editing, setEditing] = useState<Template | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  if (editing) return <TemplateEditor t={editing} onDone={() => setEditing(null)} />

  const desc = (e: Exercise) => (e.minutes != null ? `${e.minutes}分钟` : e.sets ? `${e.sets}×${e.reps ?? '?'}` : '看情况')

  return (
    <div>
      <header className="page-head row">
        <h1>设置</h1>
        <button className="link strong" onClick={onClose}>
          完成
        </button>
      </header>

      <h2 className="section">训练模板</h2>
      {templates.map((t) => (
        <button key={t.id} className="card tpl-row" onClick={() => setEditing(t)}>
          <b>{t.name}</b>
          <span className="sub">{t.exercises.map((e) => `${e.name} ${desc(e)}`).join(' · ')}</span>
        </button>
      ))}
      <p className="note">改模板只影响以后的训练，已有记录不变。</p>

      <h2 className="section">备份</h2>
      <div className="card">
        <button className="btn" onClick={exportBackup}>
          导出备份
        </button>
        <button className="btn" onClick={() => fileRef.current?.click()}>
          从备份恢复
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".json,application/json"
          hidden
          onChange={async (e) => {
            const f = e.target.files?.[0]
            e.target.value = ''
            if (!f || !confirm('用备份替换手机里现在的全部数据？')) return
            try {
              await importBackup(f)
              alert('已恢复')
            } catch (err) {
              alert('恢复失败：' + (err as Error).message)
            }
          }}
        />
        <p className="note">导出后选「存储到文件」→ iCloud 云盘，换手机或清数据时能恢复。</p>
      </div>

      <button
        className="btn plain"
        onClick={async () => {
          if (!confirm('三个模板恢复成最初的样子？')) return
          await db.templates.bulkPut(DEFAULT_TEMPLATES)
        }}
      >
        模板恢复默认
      </button>
    </div>
  )
}
