import {Bars, Metric, Section} from './components';
import {calendarDay, date, day, duration, elapsed, issueStatus, issueUrl, median, phases, snapshot, type Issue, type Phase} from './data';
import styles from './project.module.css';

export function Overview({issues}: {issues: Issue[]}) {
  const closed = issues.filter((issue) => issue.closed);
  const done = issues.filter((issue) => issueStatus(issue) === 'Terminée dans le Project');
  const blocked = issues.filter((issue) => !issue.closed && issueStatus(issue) === 'Bloquée');
  const withStatus = issues.filter((issue) => issue.project?.status && !issue.project.archived);
  const hasPoints = withStatus.length > 0 && withStatus.every((issue) => issue.project?.points != null);
  const sum = (scope: Issue[]) => scope.reduce((total, issue) => total + (issue.project?.points ?? 0), 0);
  return <>
    <div className={styles.metricGrid}>
      <Metric label="Issues ouvertes" value={issues.length - closed.length} note={`${blocked.length} signalée(s) bloquée(s)`} />
      <Metric label="Issues fermées" value={closed.length} note={`Sur ${issues.length} issues dans la sélection`} />
      <Metric label="Avancement Projects v2" value={withStatus.length ? hasPoints
        ? `${sum(done)} / ${sum(withStatus)} pts`
        : `${done.length} / ${withStatus.length} issues` : 'Indisponible'} note={withStatus.length
        ? 'Issues actives avec statut renseigné' : 'Champs du Project non disponibles pour cette sélection'} />
      <Metric label="Délai de clôture · médiane" value={duration(median(closed.map((issue) => elapsed(issue.created, issue.closed!))))}
        note={`${closed.length} issues fermées · durée calendaire`} />
    </div>
    {withStatus.length > 0 && <div className={styles.metricGrid}>
      {['À faire', 'En cours', 'Terminée dans le Project'].map((status) =>
        <Metric key={status} label={status} value={withStatus.filter((issue) => issueStatus(issue) === status).length} />)}
    </div>}
    <div className={styles.panel}>
      <h3>Issues par phase</h3>
      <Bars rows={(Object.keys(phases) as Phase[]).map((phase) => {
        const scope = issues.filter((issue) => issue.phase === phase);
        const closed = scope.filter((issue) => issue.closed).length;
        return {key: phase, label: phases[phase], count: scope.length, detail: `${closed} fermées / ${scope.length}`};
      })} />
    </div>
    <details className={styles.panel}>
      <summary>Consulter les {issues.length} issues et leurs statuts</summary>
      <ul>{issues.map((issue) => <li key={issue.number}>
        <a href={issueUrl(issue.number)}>#{issue.number} {issue.title}</a> · {issueStatus(issue)}
        {issue.closed && issue.reason === 'not_planned' ? ' · fermeture « non planifiée »' : ''}
      </li>)}</ul>
    </details>
  </>;
}

export function Sprints({issues, selected}: {issues: Issue[]; selected: string}) {
  const sprints = snapshot.project?.sprints.filter((sprint) => !selected || sprint.id === selected) ?? [];
  const assigned = issues.some((issue) => issue.project?.sprint);
  return <Section id="sprints" title="Itérations">
    {sprints.length && assigned ? <>
      <p>Les chiffres reprennent les affectations actuelles. Une issue est comptée à sa dernière clôture
        marquée « terminée », lorsqu’elle intervient pendant les dates du sprint.</p>
      <div className={styles.two}>{sprints.map((sprint) => {
        const end = new Date(Date.parse(sprint.startDate) + day * sprint.duration).toISOString().slice(0, 10);
        const members = issues.filter((issue) => issue.project?.sprint === sprint.id && !issue.project.archived);
        const done = members.filter((issue) => issue.closed && issue.reason === 'completed' &&
          calendarDay(issue.closed) >= sprint.startDate && calendarDay(issue.closed) < end);
        const points = done.length && done.every((issue) => issue.project?.points != null)
          ? done.reduce((sum, issue) => sum + (issue.project?.points ?? 0), 0) : null;
        return <div className={styles.panel} key={sprint.id}>
          <h3>{sprint.title}</h3>
          <p>Dès le {date(sprint.startDate)} · {sprint.duration} jours</p>
          <Bars rows={[
            {key: 'scope', label: 'Issues affectées', count: members.length},
            {key: 'done', label: 'Marquées terminées pendant le sprint', count: done.length},
          ]} />
          <p>{points === null ? `Débit observé · ${done.length} issues` : `Points estimés des issues terminées · ${points} pts`}</p>
          <div className={styles.links}>{members.map((issue) => <a key={issue.number} href={issueUrl(issue.number)}>#{issue.number}</a>)}</div>
        </div>;
      })}</div>
    </> : <p>Aucune itération exploitable dans l’instantané pour cette sélection.</p>}
    <p className={styles.muted}>Mesurer l’engagement initial, les reports, un burndown ou un flux cumulé exige un historique des statuts, des estimations et des affectations.</p>
  </Section>;
}
