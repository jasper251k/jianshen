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

  if (!templates || !workouts || !daily) return null

  let page
  if (showSettings) page = <Settings templates={templates} onClose={() => setShowSettings(false)} />
  else if (tab === 'today')
    page =
      active && active.date === today() ? (
        <WorkoutView w={active} history={workouts} />
      ) : (
        <Today templates={templates} workouts={workouts} daily={daily} onOpenSettings={() => setShowSettings(true)} />
      )
  else page = <History workouts={workouts} daily={daily} />

  return (
    <div className="app">
      <main className="screen" key={showSettings ? 's' : tab}>
        {page}
      </main>
      {!showSettings && (
        <nav className="tabbar">
          <button className={tab === 'today' ? 'on' : ''} onClick={() => setTab('today')}>
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
