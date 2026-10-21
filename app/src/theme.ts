// 外观：跟随系统 / 白天（柔彩渐变）/ 夜间（发光圆环）。选择存在手机本地
export type ThemePref = 'auto' | 'light' | 'dark'
const KEY = 'theme'
const mq = window.matchMedia('(prefers-color-scheme: dark)')

export function getThemePref(): ThemePref {
  try {
    const v = localStorage.getItem(KEY)
    if (v === 'light' || v === 'dark') return v
  } catch {
    // 读不到就跟随系统
  }
  return 'auto'
}

export function applyTheme() {
  const pref = getThemePref()
  const dark = pref === 'dark' || (pref === 'auto' && mq.matches)
  document.documentElement.dataset.theme = dark ? 'dark' : 'light'
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#000000' : '#ffe7dc')
}

export function setThemePref(p: ThemePref) {
  try {
    if (p === 'auto') localStorage.removeItem(KEY)
    else localStorage.setItem(KEY, p)
  } catch {
    // 存不了也照样切换
  }
  applyTheme()
}

applyTheme()
mq.addEventListener?.('change', applyTheme)
document.addEventListener('visibilitychange', applyTheme) // 回到 App 时再看一次系统深浅色
