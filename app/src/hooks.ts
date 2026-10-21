import { useEffect, useState } from 'react'

// 每秒刷新一次，用来显示“几秒前”和计时
export function useNow(on = true) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    if (!on) return
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [on])
  return now
}

// 训练时屏幕不自动黑；切出去再回来会重新申请
export function useWakeLock(on: boolean) {
  useEffect(() => {
    if (!on || !('wakeLock' in navigator)) return
    let lock: WakeLockSentinel | null = null
    let dead = false
    const req = async () => {
      try {
        const l = await navigator.wakeLock.request('screen')
        if (dead) l.release()
        else lock = l
      } catch {
        // 系统不让就算了
      }
    }
    req()
    const onVis = () => {
      if (document.visibilityState === 'visible') req()
    }
    document.addEventListener('visibilitychange', onVis)
    return () => {
      dead = true
      document.removeEventListener('visibilitychange', onVis)
      lock?.release()
    }
  }, [on])
}

// iPhone 要先在点按里启动声音，之后才能自己响
let ctx: AudioContext | null = null
export function primeAudio() {
  ctx ??= new AudioContext()
  ctx.resume()
}
export function beep(times = 3) {
  if (!ctx) return
  for (let i = 0; i < times; i++) {
    const t = ctx.currentTime + i * 0.5
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.frequency.value = 880
    o.connect(g)
    g.connect(ctx.destination)
    g.gain.setValueAtTime(0.4, t)
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.35)
    o.start(t)
    o.stop(t + 0.35)
  }
}

// 震动：iPhone 网页不支持，安卓能震；不支持就靠响声和整屏变色
export function buzz() {
  try {
    navigator.vibrate?.([400, 200, 400, 200, 400])
  } catch {
    // 不支持就算了
  }
}
