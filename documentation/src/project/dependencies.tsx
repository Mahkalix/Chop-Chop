import {useState} from 'react';
import {Section} from './components';
import {issueUrl, type Issue} from './data';
import styles from './project.module.css';

function IssueNode({number, title, status, highlighted = false}: {
  number: number; title: string; status: string; highlighted?: boolean;
}) {
  return <div className={`${styles.graphNode} ${highlighted ? styles.graphHighlighted : ''}`}>
    <small>{status}</small>
    <a href={issueUrl(number)}>#{number} {title}</a>
  </div>;
}

export function Dependencies({issues}: {issues: Issue[]}) {
  const [activeOnly, setActiveOnly] = useState(false);
  const groups = issues.filter((issue) => issue.blockers.length > 0);
  const active = groups.reduce((sum, issue) => sum + issue.blockers.filter(({open}) => open).length, 0);
  const edges = groups.reduce((sum, issue) => sum + issue.blockers.length, 0);
  const visible = groups.map((issue) => ({
    issue, prerequisites: issue.blockers.filter(({open}) => !activeOnly || open),
  })).filter(({prerequisites}) => prerequisites.length);

  return <Section id="dependances" title="Graphe des dépendances">
    <p>Les flèches relient les prérequis au ticket qui en dépend. Le graphe reprend les liens déclarés sur les issues ouvertes de la sélection.</p>
    {!edges ? <p>Aucune dépendance déclarée dans cette sélection.</p> : <>
      <div className={styles.graphControls}>
        <p>{edges} {edges === 1 ? 'dépendance déclarée' : 'dépendances déclarées'} · {active} {active === 1 ? 'blocage actif' : 'blocages actifs'}</p>
        <label><input type="checkbox" checked={activeOnly} onChange={(event) => setActiveOnly(event.target.checked)} />
          {' '}Blocages actifs uniquement</label>
      </div>
      {visible.length ? <ul className={styles.graph}>
        {visible.map(({issue, prerequisites}) => {
          const wait = prerequisites.some(({open}) => open);
          return <li key={issue.number} className={styles.graphGroup}>
            <div>
              <span className={styles.graphColumn}>Prérequis</span>
              <ul className={styles.graphSources} aria-label={`Prérequis du ticket #${issue.number}`}>
                {prerequisites.map((blocker) => <li key={blocker.number}>
                  <IssueNode number={blocker.number} title={blocker.title}
                    status={blocker.open ? 'Encore ouvert' : 'Fermé'} highlighted={blocker.open} />
                  <span className={styles.graphBranch} aria-hidden="true" />
                </li>)}
              </ul>
            </div>
            <div className={styles.graphArrow} aria-hidden="true" />
            <div className={styles.graphTarget}>
              <span className={styles.graphColumn}>Ticket dépendant</span>
              <IssueNode number={issue.number} title={issue.title}
                status={wait ? 'Bloqué par un prérequis ouvert' : 'Prérequis déclarés fermés'} highlighted={wait} />
            </div>
          </li>;
        })}
      </ul> : <p>Aucun blocage actif dans cette sélection.</p>}
    </>}
  </Section>;
}
