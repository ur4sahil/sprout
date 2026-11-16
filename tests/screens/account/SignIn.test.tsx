import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import App from '../../../src/app/App';
import { useAppStore } from '../../../src/app/store';
import { requestCode, setPasswordWithCode, signOut } from '../../../src/storage/account';
import { stubServer } from '../../storage/serverStub';
import { giveFamilyPin } from '../../helpers/familyPin';
import type { ServerStub } from '../../storage/serverStub';
import { PARENT, STRANGER } from '../../worker/harness';

const PASSWORD = 'correct horse battery';
const SAME_MESSAGE = 'That email or password is not right.';

async function open(): Promise<ReturnType<typeof userEvent.setup>> {
  render(
    <MemoryRouter initialEntries={['/home']}>
      <App />
    </MemoryRouter>,
  );
  await screen.findByRole('button', { name: 'Sign in' });
  return userEvent.setup();
}

async function withAccount(): Promise<ServerStub> {
  const stub = stubServer();
  await requestCode(PARENT);
  await setPasswordWithCode(PARENT, stub.server.lastCode(), PASSWORD);
  await signOut();
  await giveFamilyPin();
  useAppStore.getState().setAccount({ status: 'checking' });
  return stub;
}

async function trySignIn(user: ReturnType<typeof userEvent.setup>, email: string, password: string) {
  await user.clear(screen.getByLabelText('Email'));
  await user.type(screen.getByLabelText('Email'), email);
  await user.clear(screen.getByLabelText('Password'));
  await user.type(screen.getByLabelText('Password'), password);
  await user.click(screen.getByRole('button', { name: 'Sign in' }));
}

describe('SignIn', () => {
  it('marks its fields for the password manager', async () => {
    stubServer();
    await open();
    const email = screen.getByLabelText('Email');
    const password = screen.getByLabelText('Password');
    expect(email.getAttribute('autocomplete')).toBe('username');
    expect(email.getAttribute('type')).toBe('email');
    expect(password.getAttribute('autocomplete')).toBe('current-password');
    expect(password.getAttribute('type')).toBe('password');
  });

  it('signs in and lands on the start screen', async () => {
    await withAccount();
    const user = await open();
    await trySignIn(user, PARENT, PASSWORD);
    await waitFor(() => expect(useAppStore.getState().account.status).toBe('signedIn'));
    // The guard lets go, then the router sends /home to the start screen.
    await waitFor(() => expect(screen.queryByLabelText('Password')).toBeNull());
    expect(await screen.findByRole('heading', { name: 'Sprout' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Sign/ })).toBeNull();
  });

  it('gives a wrong password and an unlisted email the same message', async () => {
    await withAccount();
    const user = await open();
    await trySignIn(user, PARENT, 'wrong password!');
    expect((await screen.findByRole('alert')).textContent).toBe(SAME_MESSAGE);
    await trySignIn(user, STRANGER, PASSWORD);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Sign in' })).toHaveProperty('disabled', false));
    expect(screen.getByRole('alert').textContent).toBe(SAME_MESSAGE);
    expect(useAppStore.getState().account.status).toBe('signedOut');
  });

  it('says to wait 15 minutes after five wrong passwords', async () => {
    await withAccount();
    const user = await open();
    for (let i = 0; i < 5; i += 1) {
      await trySignIn(user, PARENT, 'wrong password!');
      await waitFor(() => expect(screen.getByRole('button', { name: 'Sign in' })).toHaveProperty('disabled', false));
    }
    const text = screen.getByRole('alert').textContent ?? '';
    expect(text).toContain('15 minutes');
    expect(text).toContain('Forgot password');
  });

  it('says so in plain words when there is no network, and frees the button', async () => {
    const stub = await withAccount();
    const user = await open();
    stub.goOffline();
    await trySignIn(user, PARENT, PASSWORD);
    expect((await screen.findByRole('alert')).textContent).toContain('No internet connection');
    expect(screen.getByRole('button', { name: 'Sign in' })).toHaveProperty('disabled', false);
  });

  it('opens the same set-password steps from both links', async () => {
    stubServer();
    const user = await open();
    await user.click(screen.getByRole('button', { name: 'First time here' }));
    expect(screen.getByRole('heading', { name: 'Set a password' })).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Back to sign in' }));
    await user.click(screen.getByRole('button', { name: 'Forgot password' }));
    expect(screen.getByRole('heading', { name: 'Set a password' })).toBeTruthy();
  });
});
