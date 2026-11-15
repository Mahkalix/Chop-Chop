import {useState} from 'react';
import Link from '@docusaurus/Link';
import {Bars, Metric} from './components';
import {
  date, duration, elapsed, issueUrl, openIssueStatus, openStatuses,
  repo, snapshot, type Issue,
} from './data';
import styles from './project.module.css';

const sourceLabels = {
  dependency: 'Dépendance GitHub',
  project: 'GitHub Project',
  label: 'Label GitHub',
};

export function Backlog({issues, compact = false}: {issues: Issue[]; compact?: boolean}) {
  const [selected, setSelected] = useState('');
  const rows = issues.flatMap((issue) => {
    const status = openIssueStatus(issue);
    return status ? [{issue, status}] : [];
  }).sort((a, b) => b.issue.created.localeCompare(a.issue.created) || b.issue.number - a.issue.number);

  const visible = rows.filter(({status}) => !selected || status.key === selected);
  const counts = Object.entries(openStatuses).map(([key, label]) => ({
    key, label, count: rows.filter(({status}) => status.key === key).length,
  }));
  return <>
    {compact ? <div className={styles.metricGrid}>
      <Metric label="Issues ouvertes" value={rows.length} />
      {counts.map(({key, label, count}) => <Metric key={key} label={label} value={count} />)}
    </div> : <div className={styles.panel}>
      <h3>{rows.length} issues ouvertes par statut</h3>
      <Bars rows={counts.map(({key, label, count}) => ({
        key, count, label: <button type="button" className={styles.chartFilter} aria-pressed={selected === key}
          disabled={count === 0 && selected !== key} onClick={() => setSelected(selected === key ? '' : key)}>{label}</button>,
      }))} />
      <p className={styles.muted}>Sélectionner un statut pour filtrer la liste des tickets.</p>
    </div>}
    <p className={styles.muted}>Une issue ouverte peut être à faire, en cours ou en attente. « À préciser » signale un statut de suivi qui reste à confirmer.</p>
    {compact ? <p><Link to="/gestion-de-projet#backlog">Voir les tickets encore ouverts</Link></p> : <>
      {selected && <p><button type="button" className={styles.action} onClick={() => setSelected('')}>Tous les statuts</button></p>}
      {visible.length ? <table className={styles.table}>
        <thead><tr><th scope="col">Issue ouverte</th><th scope="col">Suivi</th><th scope="col">Affectation</th>
          <th scope="col">Ouverture et ancienneté</th></tr></thead>
        <tbody>{visible.map(({issue, status}) => <tr key={issue.number}>
          <th scope="row"><a href={issueUrl(issue.number)}>#{issue.number} {issue.title}</a>
            {issue.labels.length > 0 && <div className={styles.muted}>{issue.labels.join(' · ')}</div>}</th>
          <td>{openStatuses[status.key]}{status.source && <div className={styles.muted}>{sourceLabels[status.source]}
            {status.source === 'project' && issue.project?.status ? ` · ${issue.project.status}` : ''}</div>}</td>
          <td>{issue.assignees.join(', ') || 'Sans responsable'}</td>
          <td>{date(issue.created)} · {duration(elapsed(issue.created, snapshot.syncedAt))}</td>
        </tr>)}</tbody>
      </table> : <p>Aucune issue ouverte dans cette sélection.</p>}
      <p className={styles.muted}>Tickets les plus récents en premier. L’ancienneté est calculée à la date de synchronisation.
        {' '}<a href={`${repo}/issues?q=is%3Aissue+is%3Aopen`}>Voir les tickets ouverts sur GitHub</a>.</p>
    </>}
  </>;
}
