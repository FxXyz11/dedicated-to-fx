import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  HashRouter,
  Navigate,
  Route,
  Routes,
} from 'react-router-dom'
import { AppLayout } from './AppLayout'
import { initialiseLibrary, libraryRepository } from '../db/repository'
import { DashboardPage } from '../features/dashboard/DashboardPage'
import { ExplorationPage } from '../features/exploration/ExplorationPage'
import { LearningHistoryPage } from '../features/history/LearningHistoryPage'
import { JournalPage } from '../features/journal/JournalPage'
import { ImportArticlePage } from '../features/library/ImportArticlePage'
import { LibraryPage } from '../features/library/LibraryPage'
import { PlanningPage } from '../features/planning/PlanningPage'
import { ReaderPage } from '../features/reader/ReaderPage'
import { SettingsPage } from '../features/settings/SettingsPage'

export function App() {
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string>()
  const settings = useLiveQuery(() => libraryRepository.getSettings(), [])

  useEffect(() => {
    initialiseLibrary()
      .then(() => setReady(true))
      .catch(() => setError('本地手稿库暂时无法打开。请刷新页面后重试。'))
  }, [])

  useEffect(() => {
    if (!settings) return
    document.documentElement.style.setProperty('--reader-scale', String(settings.textScale))
    document.documentElement.style.setProperty('--reader-leading', String(settings.lineHeight))
    document.documentElement.dataset.reduceMotion = settings.reduceMotion ? 'true' : 'false'
  }, [settings])

  if (error) {
    return (
      <main className="boot-state">
        <span className="brand-mark">Fx</span>
        <h1>手稿库没有顺利打开</h1>
        <p>{error}</p>
      </main>
    )
  }

  if (!ready) {
    return (
      <main className="boot-state" aria-live="polite">
        <span className="brand-mark brand-mark--breathing">Fx</span>
        <p>正在展开今天的纸页…</p>
      </main>
    )
  }

  return (
    <HashRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="library" element={<LibraryPage />} />
          <Route path="library/import" element={<ImportArticlePage />} />
          <Route path="journal" element={<JournalPage />} />
          <Route path="history" element={<LearningHistoryPage />} />
          <Route path="plans" element={<PlanningPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
        <Route path="read/:articleId" element={<ReaderPage />} />
        <Route path="explore/:encounterId" element={<ExplorationPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  )
}
