import {useState} from 'react';
import {calendarDay, date, elapsed, issueStatus, issueUrl, phases, snapshot, type Issue} from './data';
import {Milestones, Section} from './components';
import styles from './project.module.css';

type Timeline = {start: string; end: string};
type Scale = {min: string; max: string};

function strip({start, end}: Timeline, {min, max}: Scale) {
  const days = Math.max(1, elapsed(min, max) + 1);
  const left = 100 * Math.max(0, elapsed(min, start)) / days;
  const right = 100 * Math.min(days, elapsed(min, end) + 1) / days;
  return {left: `${left}%`, width: `${Math.max(0, right - left)}%`};
}

function TimelineRow({issue, scale}: {issue: Issue; scale: Scale}) {
  const planned = issue.project?.start && issue.project?.finish && issue.project.start <= issue.project.finish
    ? {start: issue.project.start, end: issue.project.finish}
    : null;
  const actual = {start: calendarDay(issue.created), end: calendarDay(issue.closed ?? snapshot.syncedAt)};
  const late = issue.project?.finish && actual.end > issue.project.finish;
  const status = issueStatus(issue);
  return <tr>
    <th scope="row"><a href={issueUrl(issue.number)}>#{issue.number} {issue.title}</a>
      <div className={styles.status}>{phases[issue.phase]} · {status}</div></th>
    <td>{date(issue.project?.start ?? null)} → {date(issue.project?.finish ?? null)}{late && <strong> · Échéance dépassée</strong>}</td>
    <td>{date(issue.created)} → {issue.closed ? date(issue.closed) : 'Toujours ouverte'}</td>
    <td className={styles.timeline} aria-hidden="true">
      {planned && <div className={styles.track}>
        <span className={`${styles.bar} ${styles.planned}`} style={strip(planned, scale)} />
      </div>}
      <div className={styles.track}>
        <span className={`${styles.bar} ${issue.closed ? styles.ended : styles.pending}`} style={strip(actual, scale)} />
      </div>
    </td>
  </tr>;
}

const filters = {
  all: 'Toutes les issues', open: 'Issues ouvertes', closed: 'Issues fermées',
};

export function Planning({issues, phase}: {issues: Issue[]; phase: Parameters<typeof Milestones>[0]['phase']}) {
  const [scope, setScope] = useState<keyof typeof filters>('all');
  const [expanded, setExpanded] = useState(false);
  const scoped = issues.filter((issue) => scope === 'all' || Boolean(issue.closed) === (scope === 'closed'));
  const ordered = [...scoped].sort((a, b) =>
    Object.keys(phases).indexOf(a.phase) - Object.keys(phases).indexOf(b.phase) ||
    a.created.localeCompare(b.created));
  const shown = expanded ? ordered : ordered.slice(0, 12);
  const ends = scoped.flatMap((issue) => [
    calendarDay(issue.created), calendarDay(issue.closed ?? snapshot.syncedAt), issue.project?.start, issue.project?.finish,
  ]).filter((value): value is string => Boolean(value)).sort();
  const scale = {min: ends[0], max: ends[ends.length - 1]};
  return <Section id="planning" title="Planning">
    <h3>Repères par phase</h3>
    <p>Les phases regroupent les sujets de travail. Elles se chevauchent dans le temps.</p>
    <Milestones phase={phase} />
    <h3>Gantt des issues</h3>
    <p>Bleu pour le planning déclaré, vert pour une issue fermée et ocre pour une issue ouverte.
      La période observée va de l’ouverture de l’issue à sa clôture ou à la synchronisation.</p>
    <div className={styles.controls}><div className={styles.field}>
      <label htmlFor="project-planning-zoom">Zoom sur le planning</label>
      <select id="project-planning-zoom" value={scope} onChange={(event) => setScope(event.target.value as keyof typeof filters)}>
        {Object.entries(filters).map(([id, label]) => <option value={id} key={id}>{label}</option>)}
      </select>
    </div></div>
    {shown.length ? <>
      <p className={styles.muted}>Échelle du {date(scale.min)} au {date(scale.max)} · {shown.length} sur {scoped.length} issues.</p>
      <table className={styles.table}>
        <thead><tr><th scope="col">Issue et statut</th><th scope="col">Dates prévues</th><th scope="col">Dates observées</th>
          <th scope="col" aria-hidden="true">Chronologie</th></tr></thead>
        <tbody>{shown.map((issue) => <TimelineRow key={issue.number} issue={issue} scale={scale} />)}</tbody>
      </table>
      {scoped.length > 12 && <button type="button" className={styles.action} aria-expanded={expanded}
        onClick={() => setExpanded(!expanded)}>{expanded ? 'Voir les 12 premières' : `Afficher les ${scoped.length} issues`}</button>}
    </> : <p>Aucune issue ne correspond à cette sélection.</p>}
  </Section>;
}
