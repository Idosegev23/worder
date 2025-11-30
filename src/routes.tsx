import { useRoutes } from 'react-router-dom'
import Login from './features/auth/Login'
import Register from './features/auth/Register'
import AvatarPicker from './features/avatar/AvatarPicker'
import CategoryGrid from './features/categories/CategoryGrid'
import GameScreen from './features/game/GameScreen'
import RewardChooser from './features/rewards/RewardChooser'
import UserProfile from './features/profile/UserProfile'
import AdminLogin from './features/admin/AdminLogin'
import AdminDashboard from './features/admin/AdminDashboard'
import WordsTable from './features/admin/WordsTable'
import UsersTable from './features/admin/UsersTable'
import RewardsTable from './features/admin/RewardsTable'
import BackupRestore from './features/admin/BackupRestore'
import ProgressTable from './features/admin/ProgressTable'
import ErrorsTable from './features/admin/ErrorsTable'
import RecordingsTable from './features/admin/RecordingsTable'
import LeaderboardTable from './features/admin/LeaderboardTable'
import CategoriesTable from './features/admin/CategoriesTable'

export default function RoutesView() {
  return useRoutes([
    { path: '/', element: <Login /> },
    { path: '/register', element: <Register /> },
    { path: '/avatar', element: <AvatarPicker /> },
    { path: '/categories', element: <CategoryGrid /> },
    { path: '/play/:categoryId', element: <GameScreen /> },
    { path: '/rewards', element: <RewardChooser /> },
    { path: '/profile', element: <UserProfile /> },
    { path: '/admin', element: <AdminLogin /> },
    { path: '/admin/dashboard', element: <AdminDashboard /> },
    { path: '/admin/words', element: <WordsTable /> },
    { path: '/admin/users', element: <UsersTable /> },
    { path: '/admin/rewards', element: <RewardsTable /> },
    { path: '/admin/backup', element: <BackupRestore /> },
    { path: '/admin/progress', element: <ProgressTable /> },
    { path: '/admin/errors', element: <ErrorsTable /> },
    { path: '/admin/recordings', element: <RecordingsTable /> },
    { path: '/admin/leaderboard', element: <LeaderboardTable /> },
    { path: '/admin/categories', element: <CategoriesTable /> },
  ])
}

