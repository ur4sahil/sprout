import { useNavigate, useRoutes } from 'react-router-dom';
import ErrorBoundary from '../components/ErrorBoundary';
import styles from './App.module.css';
import { routes } from './routes';

export default function App() {
  const navigate = useNavigate();
  const screen = useRoutes(routes);
  return (
    <div className={styles.shell}>
      <ErrorBoundary onHome={() => navigate('/')}>{screen}</ErrorBoundary>
    </div>
  );
}
