import type { RouteObject } from 'react-router-dom';
import { Navigate } from 'react-router-dom';
import SignIn from '../screens/account/SignIn';
import Gallery from '../screens/dev/Gallery';
import DevReview from '../screens/dev/Review';
import Awards from '../screens/kid/Awards';
import Diagnostic from '../screens/kid/Diagnostic';
import FactRace from '../screens/kid/FactRace';
import FastFacts from '../screens/kid/FastFacts';
import Home from '../screens/kid/Home';
import Lesson from '../screens/kid/Lesson';
import Play from '../screens/kid/Play';
import Pairs from '../screens/kid/Pairs';
import MixedBag from '../screens/kid/MixedBag';
import Pop from '../screens/kid/Pop';
import Practice from '../screens/kid/Practice';
import ProfilePicker from '../screens/kid/ProfilePicker';
import Review from '../screens/kid/Review';
import SubjectPage from '../screens/kid/SubjectPage';
import Dashboard from '../screens/parent/Dashboard';
import ParentFacts from '../screens/parent/Facts';
import Worksheet from '../screens/parent/Worksheet';
import Worksheets from '../screens/parent/Worksheets';
import Data from '../screens/parent/Data';
import Log from '../screens/parent/Log';
import Plans from '../screens/parent/Plans';
import Certificate from '../screens/parent/Certificate';
import Scores from '../screens/parent/Scores';
import Settings from '../screens/parent/Settings';
import SoundCheck from '../screens/parent/SoundCheck';
import Trouble from '../screens/parent/Trouble';

// The only place routes are declared.
export const routes: RouteObject[] = [
  { path: '/', element: <ProfilePicker /> },
  { path: '/home', element: <Home /> },
  { path: '/play', element: <Play /> },
  { path: '/subject/:subject', element: <SubjectPage /> },
  { path: '/skill/:skillId', element: <Practice /> },
  { path: '/skill/:skillId/learn', element: <Lesson /> },
  { path: '/review', element: <Review /> },
  { path: '/mixed', element: <MixedBag /> },
  { path: '/diagnostic', element: <Diagnostic /> },
  { path: '/awards', element: <Awards /> },
  { path: '/games/pop', element: <Pop /> },
  { path: '/games/pairs', element: <Pairs /> },
  { path: '/facts', element: <FastFacts /> },
  { path: '/facts/:setId', element: <FactRace /> },
  { path: '/parent', element: <Navigate to="/parent/dashboard" replace /> },
  { path: '/parent/dashboard', element: <Dashboard /> },
  { path: '/parent/scores', element: <Scores /> },
  { path: '/parent/certificate/:childId/:skillId', element: <Certificate /> },
  { path: '/parent/trouble', element: <Trouble /> },
  { path: '/parent/facts', element: <ParentFacts /> },
  { path: '/parent/worksheets', element: <Worksheets /> },
  { path: '/parent/worksheet', element: <Worksheet /> },
  { path: '/parent/log', element: <Log /> },
  { path: '/parent/plans', element: <Plans /> },
  { path: '/parent/settings', element: <Settings /> },
  { path: '/parent/sound', element: <SoundCheck /> },
  { path: '/parent/data', element: <Data /> },
  { path: '/signin', element: <SignIn /> },
  // Dev routes exist only in development builds.
  ...(import.meta.env.DEV
    ? [
        { path: '/dev/gallery', element: <Gallery /> },
        { path: '/dev/review/:skillId', element: <DevReview /> },
      ]
    : []),
  { path: '*', element: <Navigate to="/" replace /> },
];
