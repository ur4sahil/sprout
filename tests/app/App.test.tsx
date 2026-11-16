import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import App from '../../src/app/App';
import { requestCode, setPasswordWithCode } from '../../src/storage/account';
import { settle, stubServer } from '../storage/serverStub';
import { PARENT } from '../worker/harness';

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

// Every path in the plan's route table, plus one that does not exist.
const PATHS = [
  '/',
  '/home',
  '/play',
  '/subject/math',
  '/skill/M-K-B3',
  '/skill/M-K-B3/learn',
  '/review',
  '/diagnostic',
  '/awards',
  '/games/pop',
  '/games/pairs',
  '/parent',
  '/parent/dashboard',
  '/parent/scores',
  '/parent/trouble',
  '/parent/log',
  '/parent/plans',
  '/parent/settings',
  '/parent/sound',
  '/parent/pin',
  '/parent/data',
  '/signin',
  '/dev/gallery',
  '/no/such/page',
];

describe('App shell with no session', () => {
  it.each(PATHS)('shows the sign-in screen at %s', async (path) => {
    stubServer();
    renderAt(path);
    expect(await screen.findByRole('button', { name: 'Sign in' })).toBeTruthy();
    expect(screen.getByLabelText('Email')).toBeTruthy();
    expect(screen.getByLabelText('Password')).toBeTruthy();
  });

  it('shows the sign-in screen, with a plain message, when there is no network', async () => {
    stubServer().goOffline();
    renderAt('/home');
    expect(await screen.findByRole('button', { name: 'Sign in' })).toBeTruthy();
    expect(screen.getByRole('alert').textContent).toContain('No internet connection');
  });

  it('shows nothing of the app while the session is being checked', () => {
    stubServer();
    renderAt('/');
    expect(screen.queryByRole('heading', { name: 'Sprout' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Sign in' })).toBeNull();
  });
});

describe('App shell with a session', () => {
  async function signedIn() {
    const stub = stubServer();
    await requestCode(PARENT);
    await settle();
    await setPasswordWithCode(PARENT, stub.server.lastCode(), 'a long password');
  }

  it('renders the start screen at /', async () => {
    await signedIn();
    renderAt('/');
    expect(await screen.findByRole('heading', { name: 'Sprout' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Sign in' })).toBeNull();
  });

  it('sends an unknown path back to the start screen', async () => {
    await signedIn();
    renderAt('/no/such/page');
    expect(await screen.findByRole('heading', { name: 'Sprout' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Sign in' })).toBeNull();
  });
});
