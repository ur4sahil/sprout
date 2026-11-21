import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import App from '../../src/app/App';
import { giveFamilyPin } from '../helpers/familyPin';
import { useAppStore } from '../../src/app/store';
import { joinWithInvite, makeInvite, makeResetLink, requestCode, setPasswordWithCode, signIn, signOut } from '../../src/storage/account';
import { stubServer } from '../storage/serverStub';
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
    await setPasswordWithCode(PARENT, stub.server.lastCode(), 'a long password');
    await giveFamilyPin();
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

describe('an invite link (Nov 21, 2026)', () => {
  it('opens on making an account, which signs the new parent in to an empty family of their own', async () => {
    const stub = stubServer();
    await requestCode(PARENT);
    await setPasswordWithCode(PARENT, stub.server.lastCode(), 'a long password');
    const made = await makeInvite();
    if (!made.ok) throw new Error('no invite');
    await signOut();
    useAppStore.getState().setAccount({ status: 'checking' });

    const user = userEvent.setup();
    renderAt(`/join#${made.url.split('#')[1]}`);
    expect(await screen.findByRole('heading', { name: 'Welcome to Sprout' })).toBeTruthy();
    await user.type(screen.getByLabelText('Email'), 'new.parent@example.com');
    await user.type(screen.getByLabelText('New password'), 'another long password');
    await user.type(screen.getByLabelText('New password again'), 'another long password');
    await user.click(screen.getByRole('button', { name: 'Make my account' }));
    await screen.findByRole('heading', { name: 'Choose a grown-ups PIN' });
    expect(useAppStore.getState().account).toMatchObject({ status: 'signedIn', email: 'new.parent@example.com' });
  });

  it('"I already have an account" goes to the usual sign-in', async () => {
    stubServer();
    const user = userEvent.setup();
    renderAt(`/join#${'A'.repeat(43)}`);
    await user.click(await screen.findByRole('button', { name: 'I already have an account' }));
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeTruthy();
  });
});

describe('a reset link (Nov 21, 2026)', () => {
  it('opens on a new password for the invited parent it was made for, and signs them in', async () => {
    const stub = stubServer();
    await requestCode(PARENT);
    await setPasswordWithCode(PARENT, stub.server.lastCode(), 'a long password');
    const made = await makeInvite();
    if (!made.ok) throw new Error('no invite');
    await signOut();
    await joinWithInvite(made.url.split('#')[1] as string, 'new.parent@example.com', 'first long password');
    await signOut();
    await signIn(PARENT, 'a long password');
    const reset = await makeResetLink('new.parent@example.com');
    if (!reset.ok) throw new Error('no reset');
    await signOut();
    useAppStore.getState().setAccount({ status: 'checking' });

    const user = userEvent.setup();
    renderAt(`/reset#${reset.url.split('#')[1]}`);
    expect(await screen.findByText('For new.parent@example.com.')).toBeTruthy();
    await user.type(screen.getByLabelText('New password'), 'second long password');
    await user.type(screen.getByLabelText('New password again'), 'second long password');
    await user.click(screen.getByRole('button', { name: 'Save password and sign in' }));
    await screen.findByRole('heading', { name: 'Choose a grown-ups PIN' });
    expect(useAppStore.getState().account).toMatchObject({ status: 'signedIn', email: 'new.parent@example.com' });
  });
});

