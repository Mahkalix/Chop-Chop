import {useState} from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import {inPeriod, issueStatus, matchesPullLabel, phases, projectUrl, repo, snapshot, supplementalAt, syncedAt, type Phase} from '../project/data';
import {Backlog} from '../project/backlog';
import {Section} from '../project/components';
import {Dependencies} from '../project/dependencies';
import {Assignment, Checks, DelayExamples, DelaysByLabel, LabelBreakdown} from '../project/evidence';
import {Flow} from '../project/flow';
import {Planning} from '../project/planning';
import {Overview, Sprints} from '../project/progress';
import styles from '../project/project.module.css';

const initial = {phase: '', status: '', person: '', label: '', priority: '', sprint: '', from: '', to: ''};
const choices = (values: (string | null | undefined)[]) =>
  [...new Set(values.filter((value): value is string => Boolean(value)))]
    .sort((a, b) => a.localeCompare(b, 'fr')).map((label) => [label, label]);

const issuesByNumber = new Map(snapshot.issues.map((issue) => [issue.number, issue]));

const options = {
  phase: Object.entries(phases),
  status: choices(snapshot.issues.map(issueStatus)),
  person: choices(snapshot.issues.flatMap(({assignees}) => assignees)),
  label: choices([...snapshot.labels.map(({name}) => name), ...snapshot.issues.flatMap(({labels}) => labels)]),
  priority: choices(snapshot.issues.map(({project}) => project?.priority)),
  sprint: snapshot.project?.sprints.map(({id, title}) => [id, title]) ?? [],
};

const labels = {phase: 'Phase', status: 'Statut', person: 'Responsable', label: 'Label GitHub', priority: 'Priorité', sprint: 'Sprint'};

export default function ProjectDashboard() {
  const [filters, setFilters] = useState(initial);
  const {phase, status, person, label, priority, sprint, from, to} = filters;
  const invalid = Boolean(from && to && from > to);
  const issues = invalid ? [] : snapshot.issues.filter((issue) =>
    (!phase || issue.phase === phase) && (!status || issueStatus(issue) === status) &&
    (!person || issue.assignees.includes(person)) && (!label || issue.labels.includes(label)) &&
    (!priority || issue.project?.priority === priority) && (!sprint || issue.project?.sprint === sprint) &&
    inPeriod([issue.created, issue.closed], from, to));
  const pulls = invalid ? [] : snapshot.pulls.filter((pull) =>
    (!phase || pull.phase === phase) && (!sprint || pull.project?.sprint === sprint) &&
    (!label || matchesPullLabel(pull, label, issuesByNumber)) &&
    inPeriod([pull.created, pull.closed, pull.merged], from, to));
  const update = (key: keyof typeof initial, value: string) => setFilters((state) => ({...state, [key]: value}));

  return <Layout title="Gestion de projet" description="Avancement, planning, revues et bilan du projet CHOP-CHOP.">
    <main className={styles.main}>
      <header className={styles.hero}>
        <h1>Gestion de projet</h1>
        <p>De la conception à la recette des trois niveaux. Retrouvez les étapes, les décisions et les traces du travail d’équipe.</p>
        <div className={styles.links}>
          <a href={projectUrl}>Ouvrir le Kanban GitHub</a>
          <Link to="/bilan-de-projet">Bilan de soutenance</Link>
        </div>
        <small>Dernière synchronisation le {syncedAt} · heure de Paris</small>
      </header>
      <nav className={`${styles.jump} ${styles.links}`} aria-label="Sections du tableau de bord">
        <a href="#vue">Avancement</a><a href="#backlog">Tickets ouverts</a><a href="#labels">Labels et répartition</a><a href="#flux">PR et revues</a>
        <a href="#delais">Délais les plus longs</a><a href="#planning">Planning</a><a href="#dependances">Dépendances</a>
        <a href="#sprints">Itérations</a><a href="#sources">Sources et définitions</a>
      </nav>
      {!snapshot.project && <p className={styles.panel}><strong>Données publiques du dépôt.</strong> Les champs du Kanban
        sont indisponibles dans cet instantané. Les dates prévues, priorités, estimations et itérations restent non renseignées.</p>}
      <Section id="vue" title="Avancement">
        <fieldset className={styles.filters}>
          <legend>Filtrer les données</legend>
          <div className={styles.controls}>
            {(Object.keys(options) as (keyof typeof options)[]).filter((key) => options[key].length > 0).map((key) =>
              <div key={key} className={styles.field}>
                <label htmlFor={`project-filter-${key}`}>{labels[key]}</label>
                <select id={`project-filter-${key}`} value={filters[key]} onChange={(event) => update(key, event.target.value)}>
                  <option value="">Tous</option>
                  {options[key].map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </div>)}
            <label>Du<input type="date" value={from} onChange={(event) => update('from', event.target.value)} /></label>
            <label>Au<input type="date" value={to} onChange={(event) => update('to', event.target.value)} /></label>
            <button type="button" onClick={() => setFilters(initial)}>Réinitialiser</button>
          </div>
        </fieldset>
        <p role="status">{invalid ? 'La date de début doit précéder la date de fin.' : `${issues.length} issues · ${pulls.length} PR dans la sélection`}</p>
        <Overview issues={issues} />
      </Section>
      <Section id="backlog" title="Tickets ouverts et backlog"><Backlog issues={issues} /></Section>
      <Section id="labels" title="Labels et répartition">
        <LabelBreakdown issues={issues} pulls={pulls} selected={label}
          select={(value) => update('label', label === value ? '' : value)} />
        <h3>Affectation des issues</h3>
        <Assignment issues={issues} />
      </Section>
      <Flow pulls={pulls} from={from} to={to} />
      <Section id="delais" title="Délais les plus longs">
        <DelayExamples issues={issues} pulls={pulls} />
        <DelaysByLabel issues={issues} pulls={pulls} selected={label} />
      </Section>
      <Dependencies issues={issues} />
      <Planning issues={issues} phase={phase as Phase | ''} />
      <Section id="ci" title="Vérifications automatisées">
        <Checks from={from} to={to} />
      </Section>
      <Sprints issues={issues} selected={sprint} />
      <Section id="sources" title="Sources et définitions">
        <p>Le <a href={projectUrl}>GitHub Project</a> centralise le pilotage. Les <a href={`${repo}/issues`}>issues</a>,
          {' '}<a href={`${repo}/pulls?q=is%3Apr`}>PR</a> et <a href={`${repo}/commits/main/`}>commits de main</a> retracent les événements.
          La période sélectionne les éléments ouverts ou fermés pendant la plage, selon les dates de Paris.</p>
        <p>Une fermeture GitHub peut correspondre à un regroupement ou à un abandon. La validation d’un parcours est présentée dans
          {' '}<Link to="/bilan-de-projet">le bilan</Link>, avec les preuves disponibles. Les durées mesurent le temps écoulé entre événements GitHub.</p>
        {supplementalAt && <p>Catalogue des labels, labels et liens des PR, et résultats CI vérifiés sur les pages publiques GitHub le {supplementalAt}.</p>}
        {snapshot.project && <p>Champs découverts dans Projects v2 · {snapshot.project.fields.join(', ')}.</p>}
      </Section>
    </main>
  </Layout>;
}
