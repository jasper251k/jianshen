import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, finishWorkout } from './db'
import { today } from './util'
import Today from './pages/Today'
import WorkoutView from './pages/WorkoutView'
import History from './pages/History'
import Settings from './pages/Settings'

type Tab = 'today' | 'history'

export default function App() {
  const [tab, setTab] = useState<Tab>('today')
  const [showSettings, setShowSettings] = useState(false)
  const [paused, setPaused] = useState(false) // 训练中先回首页，训练保留着
  const templates = useLiveQuery(() => db.templates.orderBy('order').toArray())
  const workouts = useLiveQuery(() => db.workouts.orderBy('startedAt').toArray())
  const daily = useLiveQuery(() => db.daily.orderBy('date').toArray())

  useEffect(() => {
    navigator.storage?.persist?.()
  }, [])

  const active = workouts?.find((w) => !w.endedAt)

  // 前一天忘了点「结束训练」：自动结束，不挡住今天
  useEffect(() => {
    if (active && active.date !== today()) finishWorkout(active, true)
  }, [active])

  const showWorkout = tab === 'today' && !paused && !!active && active.date === today()
  const inSub = showSettings || showWorkout

  // 进训练 / 设置时多压一层浏览记录，左滑返回只回到首页，不会退出网页
  useEffect(() => {
    if (!inSub) return
    history.pushState({ sub: true }, '')
    const onPop = () => {
      setShowSettings(false)
      setPaused(true)
    }
    window.addEventListener('popstate', onPop)
    return () => {
      window.removeEventListener('popstate', onPop)
      if (history.state?.sub) history.back()
    }
  }, [inSub])

  if (!templates || !workouts || !daily) return null

  let page
  if (showSettings) page = <Settings templates={templates} onClose={() => setShowSettings(false)} />
  else if (showWorkout) page = <WorkoutView w={active!} history={workouts} onBack={() => setPaused(true)} />
  else if (tab === 'today')
    page = (
      <Today
        templates={templates}
        workouts={workouts}
        daily={daily}
        active={active?.date === today() ? active : undefined}
        onResume={() => setPaused(false)}
        onOpenSettings={() => setShowSettings(true)}
      />
    )
  else page = <History workouts={workouts} daily={daily} />

  return (
    <div className="app">
      <main className="screen" key={showSettings ? 's' : showWorkout ? 'w' : tab}>
        {page}
      </main>
      {!showSettings && (
        <nav className="tabbar">
          <button className={tab === 'today' ? 'on' : ''} onClick={() => {
              setTab('today')
              setPaused(false)
            }}
          >
            {active ? '训练中' : '今天'}
          </button>
          <button className={tab === 'history' ? 'on' : ''} onClick={() => setTab('history')}>
            记录
          </button>
        </nav>
      )}
    </div>
  )
}
