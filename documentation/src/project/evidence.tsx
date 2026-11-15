import {useState} from 'react';
import {Bars, Metric} from './components';
import {
  duration, elapsed, issueUrl, labelCounts, labelUrl, longestIntervals, matchesPullLabel, median, pullUrl, repo,
  reviewUrl, snapshot, inPeriod, type Issue, type Pull,
} from './data';
import styles from './project.module.css';

const coreLabels = ['frontend', 'backend', 'gameplay', 'design', 'documentation', 'architecture', 'deployment'];

export function LabelBreakdown({issues, pulls, compact = false, selected = '', select}: {
  issues: Issue[]; pulls: Pull[]; compact?: boolean; selected?: string; select?: (label: string) => void;
}) {
  const [showAll, setShowAll] = useState(false);
  const rows = labelCounts(issues, pulls, snapshot.labels);
  const used = rows.filter((row) => row.issues > 0 || row.pulls > 0);
  const visible = compact ? rows.filter((row) => coreLabels.includes(row.name)) : showAll ? rows : used;
  const tagged = issues.filter((issue) => issue.labels.length > 0).length;
  const multiple = issues.filter((issue) => new Set(issue.labels).size > 1).length;
  const max = Math.max(1, ...visible.map(({issues}) => issues));
  const inactive = rows.length - used.length;
  return <>
    <p>{tagged} issues étiquetées sur {issues.length}. {multiple} portent plusieurs labels. Une issue est comptée une fois par label.</p>
    {visible.length ? <>
      <div className={styles.legend}><span><i className={styles.openSwatch} /> Ouvertes</span><span><i className={styles.closedSwatch} /> Fermées</span></div>
      <ul className={styles.charts}>
        {visible.map((row) => <li key={row.name} className={`${styles.chartRow} ${styles.labelRow}`}>
          <div className={styles.labelName}>
            <i aria-hidden="true" style={{background: row.color && /^[0-9a-f]{6}$/i.test(row.color) ? `#${row.color}` : undefined}} />
            {select
              ? <button type="button" aria-pressed={selected === row.name} title={row.description ?? undefined}
                onClick={() => select(row.name)}>{row.name}</button>
              : <a href={labelUrl(row.name)}>{row.name}</a>}
          </div>
          <div className={`${styles.track} ${styles.stacked}`} aria-hidden="true">
            <span className={styles.openSwatch} style={{width: `${100 * row.opened / max}%`}} />
            <span className={styles.closedSwatch} style={{width: `${100 * row.closed / max}%`}} />
          </div>
          <span className={styles.labelValue}><strong>{row.issues}</strong> {row.issues === 1 ? 'issue' : 'issues'}
            {!compact && <> · {row.opened} ouv. · {row.closed} ferm. · {row.pulls} PR <a href={labelUrl(row.name)}
              aria-label={`Issues GitHub avec le label ${row.name}`}>GitHub</a></>}</span>
        </li>)}
      </ul>
    </> : <p>Aucun label utilisé dans cette sélection.</p>}
    {!compact && <>
      <p className={styles.muted}>{used.length} labels utilisés dans cette sélection · {rows.length} labels au catalogue élargi aux labels observés.
        Les PR comptées par ligne portent directement ce label.</p>
      {inactive > 0 && <button type="button" className={styles.action} aria-expanded={showAll}
        onClick={() => setShowAll(!showAll)}>{showAll ? 'Masquer les labels sans résultat' : `Afficher aussi les ${inactive} labels sans résultat`}</button>}
      {selected && select && <button type="button" className={styles.action} onClick={() => select(selected)}>Retirer le filtre « {selected} »</button>}
    </>}
  </>;
}

export function Assignment({issues}: {issues: Issue[]}) {
  const groups = new Map<string, {total: number; open: number}>();
  for (const issue of issues) {
    for (const login of new Set(issue.assignees.length ? issue.assignees : ['Sans responsable'])) {
      const count = groups.get(login) ?? {total: 0, open: 0};
      count.total++;
      if (!issue.closed) count.open++;
      groups.set(login, count);
    }
  }
  const rows = [...groups].sort(([a], [b]) => a.localeCompare(b, 'fr')).map(([key, item]) =>
    ({key, label: key, count: item.total, detail: `${item.total} suivies · ${item.open} ouvertes`}));
  return <>
    {rows.length ? <Bars rows={rows} /> : <p>Aucune affectation dans cette sélection.</p>}
    <p className={styles.muted}>Affectations visibles sur GitHub à la synchronisation. Une issue partagée apparaît pour chaque responsable.</p>
  </>;
}

export function ReviewMetrics({pulls, compact = false}: {pulls: Pull[]; compact?: boolean}) {
  const reviewed = pulls.filter((pull) => pull.reviews.length);
  const merged = pulls.filter((pull) => pull.merged);
  const before = reviewed.map((pull) => elapsed(pull.created, pull.reviews[0].at));
  const after = merged.filter((pull) => pull.reviews.length)
    .map((pull) => elapsed(pull.reviews[0].at, pull.merged!));
  const cycle = merged.map((pull) => elapsed(pull.created, pull.merged!));
  const changes = reviewed.filter((pull) => pull.reviews.some(({state}) => state === 'CHANGES_REQUESTED'));
  return <div className={styles.metricGrid}>
    <Metric label="Première revue · médiane" value={duration(median(before))} note={`${reviewed.length} PR revues sur ${pulls.length}`} />
    <Metric label="Ouverture → fusion · médiane" value={duration(median(cycle))} note={`${merged.length} PR fusionnées`} />
    <Metric label="Première revue → fusion · médiane" value={duration(median(after))} note={`${after.length} PR revues et fusionnées`} />
    {!compact && <Metric label="PR avec demande de correction" value={changes.length} note={`Sur ${reviewed.length} PR avec revue`} />}
  </div>;
}

export function DelayExamples({issues, pulls, compact = false}: {issues: Issue[]; pulls: Pull[]; compact?: boolean}) {
  const limit = compact ? 1 : 3;
  const wait = longestIntervals(pulls, (pull) => pull.created, (pull) => pull.reviews[0]?.at, limit);
  const after = longestIntervals(pulls, (pull) => pull.reviews[0]?.at, (pull) => pull.merged, limit);
  const closed = longestIntervals(issues.filter((issue) => issue.reason === 'completed'),
    (issue) => issue.created, (issue) => issue.closed, limit);
  const open = longestIntervals(issues.filter((issue) => !issue.closed),
    (issue) => issue.created, () => snapshot.syncedAt, limit);
  const groups = [
    {title: 'Attente avant première revue', rows: wait.map(({item, days}) =>
      ({number: item.number, title: item.title, days, url: reviewUrl(item.number, item.reviews[0].id)}))},
    {title: 'De la première revue à la fusion', rows: after.map(({item, days}) =>
      ({number: item.number, title: item.title, days, url: pullUrl(item.number)}))},
    {title: 'Issues terminées restées ouvertes le plus longtemps', rows: closed.map(({item, days}) =>
      ({number: item.number, title: item.title, days, url: issueUrl(item.number)}))},
    {title: 'Plus anciennes issues encore ouvertes', rows: open.map(({item, days}) =>
      ({number: item.number, title: item.title, days, url: issueUrl(item.number)}))},
  ];
  return <>
    <div className={styles.two}>{groups.map(({title, rows}) => <div key={title} className={styles.panel}>
      <h3>{title}</h3>
      {rows.length ? <ol className={styles.delays}>{rows.map(({number, title, url, days}) =>
        <li key={number}><strong>{duration(days)}</strong><a href={url}>#{number} {title}</a></li>)}</ol> : <p>Aucun intervalle disponible.</p>}
    </div>)}</div>
    <p className={styles.muted}>Durées calendaires entre événements GitHub. « Terminées » reprend le motif de clôture GitHub. L’âge des issues ouvertes est arrêté à la synchronisation.</p>
  </>;
}

export function Checks({from = '', to = ''}: {from?: string; to?: string}) {
  const runs = snapshot.ci.filter(({at}) => inPeriod([at], from, to));
  const complete = runs.filter(({status}) => status === 'completed');
  const success = complete.filter(({conclusion}) => conclusion === 'success').length;
  const failures = complete.filter(({conclusion}) => conclusion === 'failure').length;
  return <>
    <p>{runs.length} exécutions du workflow CI · {success} réussies · {failures} en échec · {complete.length - success - failures} autres conclusions · {runs.length - complete.length} en cours ou en attente.</p>
    <p className={styles.muted}>Toutes branches, selon la date de lancement. GitHub Actions expose la conclusion du dernier essai par exécution.
      {' '}<a href={`${repo}/actions/workflows/ci.yml`}>Vérifier dans GitHub Actions</a>.</p>
  </>;
}

export function DelaysByLabel({issues, pulls, selected}: {issues: Issue[]; pulls: Pull[]; selected: string}) {
  const issueIndex = new Map(snapshot.issues.map((issue) => [issue.number, issue]));
  const rows = (selected ? [selected] : coreLabels).map((name) => {
    const closed = issues.filter((issue) => issue.labels.includes(name) && issue.reason === 'completed' && issue.closed);
    const reviewed = pulls.filter((pull) => pull.reviews.length && matchesPullLabel(pull, name, issueIndex));
    return {
      name, closed: closed.length, reviewed: reviewed.length,
      close: median(closed.map((issue) => elapsed(issue.created, issue.closed!))),
      review: median(reviewed.map((pull) => elapsed(pull.created, pull.reviews[0].at))),
    };
  });
  return <>
    <h3>Délais médians par label</h3>
    <p>Les effectifs accompagnent chaque médiane. Les issues retenues portent le motif « terminée ». Les PR proviennent du label direct ou d’une issue déclarée liée à la clôture.</p>
    <table className={styles.table}>
      <thead><tr><th scope="col">Label GitHub</th><th scope="col">Ouverture → clôture d’une issue</th><th scope="col">Ouverture → première revue d’une PR</th></tr></thead>
      <tbody>{rows.map(({name, closed, reviewed, close, review}) => <tr key={name}>
        <th scope="row"><a href={labelUrl(name)}>{name}</a></th>
        <td>{duration(close)} · {closed} issues</td>
        <td>{duration(review)} · {reviewed} PR</td>
      </tr>)}</tbody>
    </table>
  </>;
}
