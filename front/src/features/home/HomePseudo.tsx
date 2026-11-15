import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { requestProfile } from '../auth/profileApi';
import { isLocalDemo } from '../game/localDemo';
import { SavedPseudo } from './SavedPseudo';

type Lookup = { token: string; name: string | null; error: boolean };
export function HomePseudo() {
  const { session, loading } = useAuth();
  const token = isLocalDemo() ? undefined : session?.access_token;
  const [draft, setDraft] = useState(() => sessionStorage.getItem('pseudo') ?? '');
  const [lookup, setLookup] = useState<Lookup | null>(null);
  const [attempt, setAttempt] = useState(0);
  const current = lookup?.token === token ? lookup : null;
  const checking = !isLocalDemo() && (loading || (!!token && !current));
  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    void requestProfile(token, controller.signal).then(profile => {
      if (controller.signal.aborted) return;
      setLookup({ token, name: profile?.pseudo ?? null, error: false });
      if (profile) sessionStorage.setItem('pseudo', profile.pseudo);
    }).catch(() => {
      if (!controller.signal.aborted) setLookup({ token, name: null, error: true });
    });
    return () => controller.abort();
  }, [token, attempt]);
  if (!checking && token && current?.name) {
    return <SavedPseudo key={token} token={token} name={current.name} onSave={name => {
      setLookup({ token, name, error: false });
      setDraft(name);
      sessionStorage.setItem('pseudo', name);
    }} />;
  }
  const locked = checking || !!current?.error;
  return <div>
    <label>{current?.name ? 'Ton pseudo' : 'Ton prénom ou pseudo'}<input placeholder={checking ? 'Chargement du profil…' : 'Ex. Alex'} value={current?.name ?? draft} readOnly={locked} aria-describedby="pseudo-status" maxLength={16} onChange={event => { setDraft(event.target.value); sessionStorage.setItem('pseudo', event.target.value); }} /></label>
    <p id="pseudo-status" style={{ fontSize: 12, textAlign: 'left', margin: '6px 0 0' }}>
      {checking ? 'Vérification du profil…' : current?.error ? 'Profil indisponible. Ton pseudo ne peut pas être vérifié.' : isLocalDemo() ? 'Pseudo utilisé uniquement pour cet essai local.' : 'Ton pseudo sera confirmé avant ta première partie.'}
    </p>
    {current?.error && <button type="button" onClick={() => { setLookup(null); setAttempt(value => value + 1); }}>Réessayer</button>}
  </div>;
}
