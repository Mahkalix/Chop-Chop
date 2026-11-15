import type {ReactNode} from 'react';
import useBrokenLinks from '@docusaurus/useBrokenLinks';
import {issueUrl, milestones, phases, pullUrl, type Phase} from './data';
import styles from './project.module.css';

export function Section({id, title, children}: {id: string; title: string; children: ReactNode}) {
  useBrokenLinks().collectAnchor(id);
  return <section id={id} className={styles.section} aria-labelledby={`${id}-title`}>
    <h2 id={`${id}-title`}>{title}</h2>{children}
  </section>;
}

export function Metric({label, value, note}: {label: string; value: string | number; note?: string}) {
  return <div className={styles.metric}>{label}<strong>{value}</strong>{note && <small>{note}</small>}</div>;
}

export function Bars({rows}: {rows: {label: ReactNode; key: string; count: number; detail?: string}[]}) {
  const max = Math.max(1, ...rows.map(({count}) => count));
  return <ul className={styles.charts}>{rows.map(({label, key, count, detail}) =>
    <li className={styles.chartRow} key={key}>
      <span>{label}</span>
      <span className={styles.track} aria-hidden="true"><span className={styles.bar}
        style={{width: `${100 * count / max}%`}} /></span>
      <strong>{detail ?? count}</strong>
    </li>,
  )}</ul>;
}

export function Milestones({phase}: {phase?: Phase | ''}) {
  return <ul className={styles.milestones}>{milestones.filter((item) => !phase || item.phase === phase).map((item) =>
    <li key={item.phase}>
      <small>{phases[item.phase]}</small>
      <h3>{item.title}</h3>
      <p>{item.summary}</p>
      <div className={styles.links}>
        {item.issues.map((number) => <a key={number} href={issueUrl(number)}>Issue #{number}</a>)}
        {item.pulls.map((number) => <a key={number} href={pullUrl(number)}>PR #{number}</a>)}
      </div>
    </li>,
  )}</ul>;
}
