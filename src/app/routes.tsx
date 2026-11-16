import type { RouteObject } from 'react-router-dom';
import { Navigate } from 'react-router-dom';
import SignIn from '../screens/account/SignIn';
import ProfilePicker from '../screens/kid/ProfilePicker';

// The only place routes are declared.
export const routes: RouteObject[] = [
  { path: '/', element: <ProfilePicker /> },
  { path: '/signin', element: <SignIn /> },
  { path: '*', element: <Navigate to="/" replace /> },
];
