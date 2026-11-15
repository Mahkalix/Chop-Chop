import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { HomePseudo } from '../src/features/home/HomePseudo';
import { KitchenPreview } from '../src/features/home/KitchenPreview';

const mocks = vi.hoisted(() => ({ profile: vi.fn(), auth: { session: { access_token: 'token-1' }, loading: false } }));
vi.mock('../src/features/auth/AuthProvider', () => ({ useAuth: () => mocks.auth }));
vi.mock('../src/features/auth/profileApi', () => ({ requestProfile: mocks.profile }));
beforeEach(() => { mocks.profile.mockReset(); vi.stubEnv('MODE', 'test'); sessionStorage.clear(); });
afterEach(() => { cleanup(); vi.unstubAllEnvs(); });

it('saves a new pseudo with PATCH and uses the profile returned by the API', async () => {
  sessionStorage.setItem('pseudo', 'Draft');
  mocks.profile.mockResolvedValueOnce({ id: 'user', pseudo: 'SavedChef' })
    .mockResolvedValueOnce({ id: 'user', pseudo: 'NewChef' });
  render(<HomePseudo />);
  await screen.findByDisplayValue('SavedChef');
  expect((screen.getByRole('textbox') as HTMLInputElement).readOnly).toBe(true);
  expect(sessionStorage.getItem('pseudo')).toBe('SavedChef');
  fireEvent.click(screen.getByRole('button', { name: 'Modifier le pseudo' }));
  fireEvent.change(screen.getByRole('textbox'), { target: { value: ' NewChef ' } });
  fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));
  await screen.findByText('Pseudo mis à jour.');
  expect(mocks.profile).toHaveBeenLastCalledWith('token-1', expect.any(AbortSignal), 'NewChef', 'PATCH');
  expect(sessionStorage.getItem('pseudo')).toBe('NewChef');
});

it('preserves the saved pseudo when the API rejects a rename', async () => {
  mocks.profile.mockResolvedValueOnce({ id: 'user', pseudo: 'SavedChef' })
    .mockRejectedValueOnce(new Error('Ce pseudo est déjà pris.'));
  render(<HomePseudo />);
  fireEvent.click(await screen.findByRole('button', { name: 'Modifier le pseudo' }));
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Taken' } });
  fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));
  await screen.findByText('Ce pseudo est déjà pris.');
  expect(sessionStorage.getItem('pseudo')).toBe('SavedChef');
  fireEvent.click(screen.getByRole('button', { name: 'Annuler' }));
  expect(screen.getByDisplayValue('SavedChef')).toBeTruthy();
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
