import {useState} from 'react';
import {Bars, Metric, Section} from './components';
import {ReviewMetrics} from './evidence';
import {calendarDay, date, duration, elapsed, issueUrl, pullUrl, repo, snapshot, type Pull} from './data';
import styles from './project.module.css';

export function Flow({pulls, from, to}: {pulls: Pull[]; from: string; to: string}) {
  const [expanded, setExpanded] = useState(false);
  const merged = pulls.filter((pull) => pull.merged);
  const requests = pulls.reduce((sum, pull) => sum + pull.reviews.filter(({state}) => state === 'CHANGES_REQUESTED').length, 0);
  const approvals = pulls.reduce((sum, pull) => sum + pull.reviews.filter(({state}) => state === 'APPROVED').length, 0);
  const open = pulls.filter((pull) => !pull.closed);
  const pending = open.filter((pull) => !pull.draft && (pull.requested > 0 || !pull.reviews.length));
  const activity = new Map<string, {created: number; merged: number; closed: number}>();
  for (const pull of pulls) {
    const events = [['created', pull.created], ['merged', pull.merged], ['closed', pull.merged ? null : pull.closed]] as const;
    for (const [event, at] of events) {
      if (!at) continue;
      const day = calendarDay(at);
      if ((from && day < from) || (to && day > to)) continue;
      const entry = activity.get(day) ?? {created: 0, merged: 0, closed: 0};
      entry[event]++;
      activity.set(day, entry);
    }
  }
  const sorted = [...pulls].sort((a, b) => b.created.localeCompare(a.created));
  const rows = expanded ? sorted : sorted.slice(0, 8);
  const max = Math.max(1 / 1440, ...rows.map((pull) => elapsed(pull.created, pull.closed ?? snapshot.syncedAt)));
  return <Section id="flux" title="Pull requests et revues">
    <p>Les filtres de phase, période, sprint et label s’appliquent aux PR. Le filtre de label retient les
      labels directs de la PR et ceux d’une issue qu’elle déclare fermer. Statut, responsable et priorité portent sur les issues.</p>
    <div className={styles.metricGrid}>
      <Metric label="PR ouvertes" value={open.length} note={`${pending.length} en attente de revue`} />
      <Metric label="PR fusionnées" value={merged.length} note={`${pulls.length - open.length - merged.length} fermées sans fusion`} />
      <Metric label="Approbations" value={approvals} note={`${requests} demandes de correction`} />
    </div>
    <h3>Délais de revue et de fusion</h3>
    <ReviewMetrics pulls={pulls} />
    <h3>Événements par jour actif</h3>
    {activity.size ? <Bars rows={[...activity.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([day, counts]) => ({
      key: day, label: date(day), count: counts.created + counts.merged + counts.closed,
      detail: `${counts.created} ouvertes · ${counts.merged} fusionnées · ${counts.closed} fermées sans fusion`,
    }))} /> : <p>Aucun événement PR dans cette sélection.</p>}
    <h3>Chronologie des PR</h3>
    <p>Le point bleu indique la première revue, l’ocre la première demande de correction. L’échelle s’arrête à la fermeture ou à la synchronisation.</p>
    {rows.length ? <>
      <table className={styles.table}>
        <thead><tr><th scope="col">PR</th><th scope="col">Première revue</th><th scope="col">Première correction demandée</th>
          <th scope="col">Issue de la PR</th><th scope="col" aria-hidden="true">Durée depuis l’ouverture</th></tr></thead>
        <tbody>{rows.map((pull) => {
          const first = pull.reviews[0];
          const correction = pull.reviews.find(({state}) => state === 'CHANGES_REQUESTED');
          const end = pull.closed ?? snapshot.syncedAt;
          const position = (value: string) => `${Math.min(100, 100 * elapsed(pull.created, value) / max)}%`;
          return <tr key={pull.number}>
            <th scope="row"><a href={pullUrl(pull.number)}>#{pull.number} {pull.title}</a><div>Ouverte le {date(pull.created)}</div>
              {pull.labels.length > 0 && <div>Labels · {pull.labels.join(', ')}</div>}
              {pull.linkedIssues.length > 0 && <div className={styles.links}>
                {pull.linkedIssues.map((number) => <a key={number} href={issueUrl(number)}>Issue #{number}</a>)}
              </div>}</th>
            <td>{first ? <a href={`${pullUrl(pull.number)}#pullrequestreview-${first.id}`}>{duration(elapsed(pull.created, first.at))}</a> : 'Aucune revue'}</td>
            <td>{correction ? <a href={`${pullUrl(pull.number)}#pullrequestreview-${correction.id}`}>{duration(elapsed(pull.created, correction.at))}</a> : 'Aucune'}</td>
            <td>{pull.merged ? `Fusionnée le ${date(pull.merged)}` : pull.closed ? `Fermée le ${date(pull.closed)}` : pull.draft ? 'Brouillon' : 'Ouverte'}</td>
            <td className={styles.timeline} aria-hidden="true"><div className={styles.track}>
              <span className={`${styles.bar} ${pull.merged ? styles.ended : ''}`} style={{width: position(end)}} />
              {first && <span className={`${styles.marker} ${styles.reviewMarker}`} style={{left: position(first.at)}} />}
              {correction && <span className={`${styles.marker} ${styles.changeMarker}`} style={{left: position(correction.at)}} />}
            </div></td>
          </tr>;
        })}</tbody>
      </table>
      {pulls.length > 8 && <button type="button" className={styles.action} aria-expanded={expanded}
        onClick={() => setExpanded(!expanded)}>{expanded ? 'Voir les 8 dernières PR' : `Afficher les ${pulls.length} PR`}</button>}
    </> : <p>Aucune PR ne correspond à cette sélection.</p>}
    <p className={styles.muted}>Les revues sont les soumissions humaines formelles, hors auteur et brouillons. Les durées sont calendaires.
      Les <a href={`${repo}/commits/main/`}>commits de main</a> documentent l’activité du dépôt. Pour cette période, {snapshot.commits.filter(({at}) => {
        const day = calendarDay(at);
        return (!from || day >= from) && (!to || day <= to);
      }).length} commits figurent dans l’instantané, toutes phases confondues.</p>
  </Section>;
}
