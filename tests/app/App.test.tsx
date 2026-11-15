import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import App from '../../src/app/App';

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

describe('App shell', () => {
  it('renders the start screen at /', () => {
    renderAt('/');
    expect(screen.getByRole('heading', { name: 'Sprout' })).toBeTruthy();
  });

  it('sends an unknown path back to the start screen', () => {
    renderAt('/no/such/page');
    expect(screen.getByRole('heading', { name: 'Sprout' })).toBeTruthy();
  });
});
