import { createBrowserRouter } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { HomePage } from '../pages/HomePage'
import { SearchPage } from '../pages/SearchPage'
import { SongPage } from '../pages/SongPage'
import { LibraryPage } from '../pages/LibraryPage'
import { SettingsPage } from '../pages/SettingsPage'
import { PracticeSelectPage } from '../pages/PracticeSelectPage'
import { PracticeQuizPage } from '../pages/PracticeQuizPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'search', element: <SearchPage /> },
      { path: 'song/:id', element: <SongPage /> },
      { path: 'library', element: <LibraryPage /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: 'practice', element: <PracticeSelectPage /> },
      { path: 'practice/:id', element: <PracticeQuizPage /> },
    ],
  },
])
