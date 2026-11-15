import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { HomePseudo } from '../src/features/home/HomePseudo';
import { KitchenPreview } from '../src/features/home/KitchenPreview';

const mocks = vi.hoisted(() => ({ profile: vi.fn(), auth: { session: { access_token: 'token-1' }, loading: false } }));
vi.mock('../src/features/auth/AuthProvider', () => ({ useAuth: () => mocks.auth }));
vi.mock('../src/features/auth/profileApi', () => ({ requestProfile: mocks.profile }));
beforeEach(() => { mocks.profile.mockReset(); vi.stubEnv('MODE', 'test'); sessionStorage.clear(); });
afterEach(() => { cleanup(); vi.unstubAllEnvs(); });

it('locks the saved profile name instead of offering an ineffective rename', async () => {
  sessionStorage.setItem('pseudo', 'Draft');
  mocks.profile.mockResolvedValue({ id: 'user', pseudo: 'SavedChef' });
  render(<HomePseudo />);
  await screen.findByDisplayValue('SavedChef');
  expect((screen.getByRole('textbox') as HTMLInputElement).readOnly).toBe(true);
  expect(sessionStorage.getItem('pseudo')).toBe('SavedChef');
});
it('allows a draft only after confirming the player has no profile', async () => {
  let resolve!: (value: null) => void;
  mocks.profile.mockReturnValue(new Promise(done => { resolve = done; }));
  render(<HomePseudo />);
  expect((screen.getByRole('textbox') as HTMLInputElement).readOnly).toBe(true);
  await act(async () => resolve(null));
  await waitFor(() => expect((screen.getByRole('textbox') as HTMLInputElement).readOnly).toBe(false));
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'NewChef' } });
  expect(sessionStorage.getItem('pseudo')).toBe('NewChef');
});
it('keeps the field locked on profile failure and offers a retry', async () => {
  mocks.profile.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({ id: 'user', pseudo: 'Chef' });
  render(<HomePseudo />);
  fireEvent.click(await screen.findByRole('button', { name: 'Réessayer' }));
  await screen.findByDisplayValue('Chef');
  expect((screen.getByRole('textbox') as HTMLInputElement).readOnly).toBe(true);
});
it('updates preview stations and chef when changing levels', () => {
  const { container, rerender } = render(<KitchenPreview level={1} chef="Miso" />);
  expect(container.querySelector('image[href="/kitchen/sauce-counter.png"]')).toBeNull();
  rerender(<KitchenPreview level={3} chef="Pipa" />);
  expect(container.querySelector('image[href="/kitchen/sauce-counter.png"]')).not.toBeNull();
  expect(container.querySelector('image[href="/kitchen/tortilla-counter.png"]')).not.toBeNull();
  expect(container.querySelector('image[href="/menu/Pipa.png"]')).not.toBeNull();
});
