import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { useAppStore } from '../../../src/app/store';
import SetPassword from '../../../src/screens/account/SetPassword';
import { settle, stubServer } from '../../storage/serverStub';
import { PARENT, STRANGER } from '../../worker/harness';

const PASSWORD = 'correct horse battery';

function open(initialEmail = '') {
  const onDone = vi.fn();
  const onBack = vi.fn();
  render(<SetPassword initialEmail={initialEmail} onBack={onBack} onDone={onDone} />);
  return { user: userEvent.setup(), onDone, onBack };
}

async function askForCode(user: ReturnType<typeof userEvent.setup>, email: string) {
  await user.type(screen.getByLabelText('Email'), email);
  await user.click(screen.getByRole('button', { name: 'Email me a code' }));
  await screen.findByRole('heading', { name: 'Check your email' });
  await settle();
}

async function fill(user: ReturnType<typeof userEvent.setup>, code: string, password: string, again: string) {
  for (const [label, value] of [
    ['Code from the email', code],
    ['New password', password],
    ['New password again', again],
  ] as const) {
    await user.clear(screen.getByLabelText(label));
    await user.type(screen.getByLabelText(label), value);
  }
  await user.click(screen.getByRole('button', { name: 'Save password and sign in' }));
}

describe('SetPassword', () => {
  it('emails a code, then saves the password and signs in', async () => {
    const stub = stubServer();
    const { user, onDone } = open();
    await askForCode(user, PARENT);
    await fill(user, stub.server.lastCode(), PASSWORD, PASSWORD);
    await vi.waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
    expect(useAppStore.getState().account).toMatchObject({ status: 'signedIn', email: PARENT });
  });

  it('shows the same next screen for an unlisted email, and sends nothing', async () => {
    const stub = stubServer();
    const { user } = open();
    await askForCode(user, STRANGER);
    expect(screen.getByText(/If that email is on the family list/)).toBeTruthy();
    expect(stub.server.mailer.sent).toHaveLength(0);
  });

  it('marks its fields for the password manager and the code keyboard', async () => {
    stubServer();
    const { user } = open();
    await askForCode(user, PARENT);
    const code = screen.getByLabelText('Code from the email');
    expect(code.getAttribute('autocomplete')).toBe('one-time-code');
    expect(code.getAttribute('inputmode')).toBe('numeric');
    expect(screen.getByLabelText('New password').getAttribute('autocomplete')).toBe('new-password');
    expect(screen.getByLabelText('New password again').getAttribute('autocomplete')).toBe('new-password');
  });

  it('checks the code shape, the length and the match before calling the server', async () => {
    const stub = stubServer();
    const { user, onDone } = open();
    await askForCode(user, PARENT);
    const before = stub.calls.length;

    await fill(user, '12345', PASSWORD, PASSWORD);
    expect(screen.getByRole('alert').textContent).toBe('The code is six digits.');
    await fill(user, '123456', 'too short', 'too short');
    expect(screen.getByRole('alert').textContent).toContain('at least 10 characters');
    await fill(user, '123456', PASSWORD, `${PASSWORD}x`);
    expect(screen.getByRole('alert').textContent).toBe('The two passwords do not match.');

    expect(stub.calls.length).toBe(before);
    expect(onDone).not.toHaveBeenCalled();
  });

  it('refuses a wrong code, frees the button, and then accepts the right one', async () => {
    const stub = stubServer();
    const { user, onDone } = open();
    await askForCode(user, PARENT);
    const right = stub.server.lastCode();
    await fill(user, right === '000000' ? '000001' : '000000', PASSWORD, PASSWORD);
    expect((await screen.findByRole('alert')).textContent).toContain('That code is not right');
    expect(screen.getByRole('button', { name: 'Save password and sign in' })).toHaveProperty('disabled', false);
    expect(onDone).not.toHaveBeenCalled();
    await fill(user, right, PASSWORD, PASSWORD);
    await vi.waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
  });

  it('says so when there is no network, and stays on the email step', async () => {
    stubServer().goOffline();
    const { user } = open();
    await user.type(screen.getByLabelText('Email'), PARENT);
    await user.click(screen.getByRole('button', { name: 'Email me a code' }));
    expect((await screen.findByRole('alert')).textContent).toContain('No internet connection');
    expect(screen.getByRole('button', { name: 'Email me a code' })).toHaveProperty('disabled', false);
  });

  it('starts with the email typed on the sign-in screen and can go back', async () => {
    stubServer();
    const { user, onBack } = open(PARENT);
    expect(screen.getByLabelText('Email')).toHaveProperty('value', PARENT);
    await user.click(screen.getByRole('button', { name: 'Back to sign in' }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
