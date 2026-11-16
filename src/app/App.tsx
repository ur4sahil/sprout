import { useEffect } from 'react';
import { useNavigate, useRoutes } from 'react-router-dom';
import ErrorBoundary from '../components/ErrorBoundary';
import SignIn from '../screens/account/SignIn';
import { checkSession } from '../storage/account';
import styles from './App.module.css';
import { routes } from './routes';
import { useAppStore } from './store';

export default function App() {
  const navigate = useNavigate();
  const screen = useRoutes(routes);
  const status = useAppStore((s) => s.account.status);

  useEffect(() => {
    if (useAppStore.getState().account.status === 'checking') void checkSession();
  }, []);

  // The sign-in guard: without a session nothing else can be reached, on any path.
  let content = screen;
  if (status === 'checking') {
    content = (
      <main className={styles.splash} aria-busy="true" aria-label="Starting Sprout">
        <span aria-hidden="true">🌱</span>
      </main>
    );
  } else if (status === 'signedOut') {
    content = <SignIn />;
  }

  return (
    <div className={styles.shell}>
      <ErrorBoundary onHome={() => navigate('/')}>{content}</ErrorBoundary>
    </div>
  );
}
