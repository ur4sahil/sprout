import type { RouteObject } from 'react-router-dom';
import { Navigate } from 'react-router-dom';
import SignIn from '../screens/account/SignIn';
import Gallery from '../screens/dev/Gallery';
import ProfilePicker from '../screens/kid/ProfilePicker';

// The only place routes are declared.
export const routes: RouteObject[] = [
  { path: '/', element: <ProfilePicker /> },
  { path: '/signin', element: <SignIn /> },
  // Dev routes exist only in development builds.
  ...(import.meta.env.DEV ? [{ path: '/dev/gallery', element: <Gallery /> }] : []),
  { path: '*', element: <Navigate to="/" replace /> },
];
