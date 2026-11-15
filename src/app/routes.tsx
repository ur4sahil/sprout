import type { RouteObject } from 'react-router-dom';
import { Navigate } from 'react-router-dom';
import ProfilePicker from '../screens/kid/ProfilePicker';

// The only place routes are declared.
export const routes: RouteObject[] = [
  { path: '/', element: <ProfilePicker /> },
  { path: '*', element: <Navigate to="/" replace /> },
];
