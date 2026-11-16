import { Component, type ReactNode } from 'react';
import { logError } from '../lib/errorLog';
import BigButton from './BigButton';
import styles from './ErrorBoundary.module.css';

interface Props {
  onHome: () => void;
  children: ReactNode;
}

interface State {
  failed: boolean;
}

export default class ErrorBoundary extends Component<Props, State> {
  override state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  override componentDidCatch(error: unknown): void {
    logError(error);
  }

  private handleHome = (): void => {
    this.setState({ failed: false });
    this.props.onHome();
  };

  override render(): ReactNode {
    if (!this.state.failed) return this.props.children;
    return (
      <main className={styles.wrap} role="alert">
        <div className={styles.face} aria-hidden="true">
          🌱
        </div>
        <h1 className={styles.title}>Something went wrong</h1>
        <BigButton size="kid" onClick={this.handleHome}>
          Back to start
        </BigButton>
      </main>
    );
  }
}
