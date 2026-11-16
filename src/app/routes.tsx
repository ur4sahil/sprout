import type { RouteObject } from 'react-router-dom';
import { Navigate } from 'react-router-dom';
import SignIn from '../screens/account/SignIn';
import Gallery from '../screens/dev/Gallery';
import Awards from '../screens/kid/Awards';
import Diagnostic from '../screens/kid/Diagnostic';
import Home from '../screens/kid/Home';
import Lesson from '../screens/kid/Lesson';
import Play from '../screens/kid/Play';
import Practice from '../screens/kid/Practice';
import ProfilePicker from '../screens/kid/ProfilePicker';
import Review from '../screens/kid/Review';
import SubjectPage from '../screens/kid/SubjectPage';
import Dashboard from '../screens/parent/Dashboard';
import Data from '../screens/parent/Data';
import Scores from '../screens/parent/Scores';
import Settings from '../screens/parent/Settings';
import SoundCheck from '../screens/parent/SoundCheck';

// The only place routes are declared.
export const routes: RouteObject[] = [
  { path: '/', element: <ProfilePicker /> },
  { path: '/home', element: <Home /> },
  { path: '/play', element: <Play /> },
  { path: '/subject/:subject', element: <SubjectPage /> },
  { path: '/skill/:skillId', element: <Practice /> },
  { path: '/skill/:skillId/learn', element: <Lesson /> },
  { path: '/review', element: <Review /> },
  { path: '/diagnostic', element: <Diagnostic /> },
  { path: '/awards', element: <Awards /> },
  { path: '/parent', element: <Navigate to="/parent/dashboard" replace /> },
  { path: '/parent/dashboard', element: <Dashboard /> },
  { path: '/parent/scores', element: <Scores /> },
  { path: '/parent/settings', element: <Settings /> },
  { path: '/parent/sound', element: <SoundCheck /> },
  { path: '/parent/data', element: <Data /> },
  { path: '/signin', element: <SignIn /> },
  // Dev routes exist only in development builds.
  ...(import.meta.env.DEV ? [{ path: '/dev/gallery', element: <Gallery /> }] : []),
  { path: '*', element: <Navigate to="/" replace /> },
];
