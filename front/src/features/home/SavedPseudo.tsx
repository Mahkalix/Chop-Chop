import { PseudoSchema } from '@chopchop/shared';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { requestProfile } from '../auth/profileApi';

export function SavedPseudo({ token, name, onSave }: {
  token: string;
  name: string;
  onSave: (name: string) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const pending = useRef<AbortController | null>(null);
  useEffect(() => () => pending.current?.abort(), []);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current || draft === null) return;
    const parsed = PseudoSchema.safeParse(draft);
    if (!parsed.success) {
      setMessage('Utilise 2 à 16 caractères : lettres, chiffres, espaces, _ ou -.');
      return;
    }
    const controller = new AbortController();
    pending.current = controller;
    setSaving(true);
    setMessage('');
    try {
      const profile = await requestProfile(token, controller.signal, parsed.data, 'PATCH');
      if (controller.signal.aborted || !profile) return;
      onSave(profile.pseudo);
      setDraft(null);
      setMessage('Pseudo mis à jour.');
    } catch (error) {
      if (!controller.signal.aborted) setMessage(error instanceof Error ? error.message : 'Impossible de modifier ton pseudo. Réessaie.');
    } finally {
      pending.current = null;
      if (!controller.signal.aborted) setSaving(false);
    }
  }

  return <form onSubmit={save}>
    <label>Ton pseudo<input value={draft ?? name} readOnly={draft === null || saving}
      maxLength={16} aria-describedby="pseudo-status" onChange={event => setDraft(event.target.value)} /></label>
    {draft === null
      ? <button type="button" onClick={() => { setDraft(name); setMessage(''); }}>Modifier le pseudo</button>
      : <>
        <button type="submit" disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer'}</button>
        <button type="button" disabled={saving} onClick={() => { setDraft(null); setMessage(''); }}>Annuler</button>
      </>}
    <p id="pseudo-status" aria-live="polite">{message || 'Ce pseudo apparaît dans le classement.'}</p>
  </form>;
}
