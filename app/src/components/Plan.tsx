import { useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, savePlan } from '../db'
import { dateKey, fmtDate } from '../util'

// 周训练计划：上传一张 Excel 截图，首页常驻；点开全屏，双指或双击放大看

// undefined = 还在读，null = 没传过
export function usePlan() {
  return useLiveQuery(async () => (await db.plan.get('week')) ?? null)
}

// 首页：本周计划卡片
export function PlanCard() {
  const plan = usePlan()
  const [open, setOpen] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  if (plan === undefined) return null
  const pick = () => fileRef.current?.click()

  return (
    <>
      <div className="row plan-head">
        <h2 className="section">本周计划</h2>
        {plan && (
          <button className="link" onClick={pick}>
            换一张
          </button>
        )}
      </div>
      {plan ? (
        <button className="card plan-card" onClick={() => setOpen(true)}>
          <img src={plan.image} alt="周训练计划" />
          <span className="plan-hint">{fmtDate(dateKey(new Date(plan.at)))} 上传 · 点开放大看</span>
        </button>
      ) : (
        <button className="card plan-empty" onClick={pick}>
          ＋ 上传周计划截图
          <small>传一次一直显示，点开能放大看清</small>
        </button>
      )}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        hidden
        onChange={async (e) => {
          const f = e.target.files?.[0]
          e.target.value = ''
          if (!f) return
          try {
            await savePlan(f)
          } catch (err) {
            alert('上传失败：' + (err as Error).message)
          }
        }}
      />
      {open && plan && <PlanViewer image={plan.image} onClose={() => setOpen(false)} />}
    </>
  )
}

// 全屏看图：双指缩放、单指拖动、双击放大 / 还原
export function PlanViewer({ image, onClose }: { image: string; onClose: () => void }) {
  const boxRef = useRef<HTMLDivElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
    const box = boxRef.current!
    const img = imgRef.current!
    let scale = 1
    let pinch: { d: number; s: number; ux: number; uy: number } | null = null
    let tap: { x: number; y: number; t: number } | null = null
    let lastTap = { x: 0, y: 0, t: 0 }

    // 手指下面是原图上的哪一点（按 1 倍算）
    const at = (cx: number, cy: number) => {
      const r = img.getBoundingClientRect()
      return [(cx - r.left) / scale, (cy - r.top) / scale]
    }
    // 放大到 s 倍，并让原图上 (ux, uy) 这一点停在屏幕 (cx, cy)
    const zoomTo = (s: number, ux: number, uy: number, cx: number, cy: number) => {
      scale = Math.min(6, Math.max(1, s))
      img.style.width = `${scale * 100}%`
      const r = box.getBoundingClientRect()
      box.scrollLeft = ux * scale - (cx - r.left)
      box.scrollTop = uy * scale - (cy - r.top)
    }
    const two = (t: TouchList) => ({
      cx: (t[0].clientX + t[1].clientX) / 2,
      cy: (t[0].clientY + t[1].clientY) / 2,
      d: Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY),
    })

    const onStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        tap = { x: e.touches[0].clientX, y: e.touches[0].clientY, t: Date.now() }
      } else if (e.touches.length === 2) {
        tap = null
        const { cx, cy, d } = two(e.touches)
        const [ux, uy] = at(cx, cy)
        pinch = { d, s: scale, ux, uy }
      }
    }
    const onMove = (e: TouchEvent) => {
      if (!pinch || e.touches.length !== 2) return
      e.preventDefault()
      const { cx, cy, d } = two(e.touches)
      zoomTo((pinch.s * d) / pinch.d, pinch.ux, pinch.uy, cx, cy)
    }
    const onEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) pinch = null
      if (e.touches.length || !tap) return
      const p = e.changedTouches[0]
      const now = Date.now()
      const still = Math.hypot(p.clientX - tap.x, p.clientY - tap.y) < 10 && now - tap.t < 300
      tap = null
      if (!still) return
      if (now - lastTap.t < 320 && Math.hypot(p.clientX - lastTap.x, p.clientY - lastTap.y) < 40) {
        e.preventDefault()
        const [ux, uy] = at(p.clientX, p.clientY)
        zoomTo(scale > 1.05 ? 1 : 2.5, ux, uy, p.clientX, p.clientY)
        lastTap = { x: 0, y: 0, t: 0 }
      } else lastTap = { x: p.clientX, y: p.clientY, t: now }
    }
    const stop = (e: Event) => e.preventDefault() // 挡住苹果自带的整页缩放

    box.addEventListener('touchstart', onStart, { passive: true })
    box.addEventListener('touchmove', onMove, { passive: false })
    box.addEventListener('touchend', onEnd, { passive: false })
    box.addEventListener('gesturestart', stop)
    return () => {
      box.removeEventListener('touchstart', onStart)
      box.removeEventListener('touchmove', onMove)
      box.removeEventListener('touchend', onEnd)
      box.removeEventListener('gesturestart', stop)
    }
  }, [])

  return (
    <div className="plan-viewer">
      <div className="plan-box" ref={boxRef}>
        <img ref={imgRef} src={image} alt="周训练计划" />
      </div>
      <div className="plan-bar">
        <span>双指或双击放大</span>
        <button onClick={onClose}>完成</button>
      </div>
    </div>
  )
}
