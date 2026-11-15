import rawSnapshot from './snapshot.json';
import {day, elapsed, issueStatus, median, phases} from '../../scripts/project-metrics.mjs';

export {day, elapsed, issueStatus, median, phases};
export {labelCounts, longestIntervals, matchesPullLabel, openIssueStatus, openStatuses} from '../../scripts/project-metrics.mjs';
export type Phase = keyof typeof phases;

type ProjectFields = {
  status: string | null;
  priority: string | null;
  start: string | null;
  finish: string | null;
  points: number | null;
  sprint: string | null;
  archived: boolean;
};

type Blocker = {number: number; title: string; open: boolean};

export type Issue = {
  number: number;
  title: string;
  phase: Phase;
  created: string;
  closed: string | null;
  reason: string | null;
  assignees: string[];
  labels: string[];
  project: ProjectFields | null;
  blockers: Blocker[];
};

export type Pull = {
  number: number;
  title: string;
  phase: Phase;
  created: string;
  closed: string | null;
  merged: string | null;
  draft: boolean;
  requested: number;
  labels: string[];
  linkedIssues: number[];
  reviews: {id: number; at: string; state: string}[];
  project: ProjectFields | null;
};

type Snapshot = {
  version: number;
  syncedAt: string;
  supplementalAt?: string;
  project: null | {fields: string[]; sprints: {id: string; title: string; startDate: string; duration: number}[]};
  issues: Issue[];
  pulls: Pull[];
  labels: {name: string; color: string | null; description: string | null}[];
  ci: {id: number; at: string; event: string; status: string; conclusion: string | null}[];
  commits: {sha: string; at: string}[];
};

// Accept snapshots generated before the catalogue, cross-links and CI were collected.
const stored = rawSnapshot as Partial<Pick<Snapshot, 'ci' | 'labels'>> &
  Omit<Snapshot, 'labels' | 'ci' | 'pulls'> &
  {pulls: (Omit<Pull, 'labels' | 'linkedIssues'> & Partial<Pick<Pull, 'labels' | 'linkedIssues'>>)[]};
export const snapshot: Snapshot = {
  ...stored,
  labels: stored.labels ?? [],
  ci: stored.ci ?? [],
  pulls: stored.pulls.map(({labels, linkedIssues, ...pull}) =>
    ({...pull, labels: labels ?? [], linkedIssues: linkedIssues ?? []})),
};
export const repo = 'https://github.com/Mahkalix/Chop-Chop';
export const projectUrl = 'https://github.com/users/Mahkalix/projects/3/views/1';
export const issueUrl = (number: number) => `${repo}/issues/${number}`;
export const pullUrl = (number: number) => `${repo}/pull/${number}`;
export const labelUrl = (label: string) => `${repo}/issues?${new URLSearchParams({q: `is:issue label:${JSON.stringify(label)}`})}`;
export const reviewUrl = (number: number, id: number) => `${pullUrl(number)}#pullrequestreview-${id}`;

export const milestones = [
  {phase: 'conception', title: 'Cadrage et cas d’utilisation', issues: [1, 2, 3, 4], pulls: [], summary: 'Cas d’utilisation, périmètre des fonctionnalités et choix techniques.'},
  {phase: 'back', title: 'API, profils et classement', issues: [8, 9, 70], pulls: [25, 38, 84], summary: 'Socle API et base, sessions joueur puis vérification du service Render.'},
  {phase: 'design', title: 'Maquettes et direction artistique', issues: [5, 6], pulls: [], summary: 'Maquettes d’interface, charte graphique et ressources visuelles.'},
  {phase: 'game', title: 'De la cuisine Phaser aux trois niveaux', issues: [19, 85], pulls: [35, 39, 46], summary: 'Déplacements, interactions et cuisson intégrés. Les trois niveaux sont documentés en essai local, avec retour équipe attendu.'},
  {phase: 'application', title: 'Intégration, mise en ligne et recette', issues: [50, 72], pulls: [32, 37, 36, 52], summary: 'Documentation mise en ligne, session et classement intégrés dans le front. La recette sur les services réels est suivie dans #72.'},
] satisfies {phase: Phase; title: string; issues: number[]; pulls: number[]; summary: string}[];

const parisDay = new Intl.DateTimeFormat('sv-SE', {timeZone: 'Europe/Paris', dateStyle: 'short'});
const dateLabel = new Intl.DateTimeFormat('fr-FR', {timeZone: 'Europe/Paris', dateStyle: 'medium'});
const timestampLabel = new Intl.DateTimeFormat('fr-FR', {timeZone: 'Europe/Paris', dateStyle: 'long', timeStyle: 'short'});

export const calendarDay = (value: string) => value.length === 10 ? value : parisDay.format(new Date(value));
export const date = (value: string | null) => value ? dateLabel.format(new Date(value)) : 'Non renseigné';
export const syncedAt = timestampLabel.format(new Date(snapshot.syncedAt));
export const supplementalAt = snapshot.supplementalAt ? timestampLabel.format(new Date(snapshot.supplementalAt)) : null;

export function duration(value: number | null) {
  if (value === null) return 'Non disponible';
  if (value < 1 / 24) return `${Math.round(value * 1440)} min`;
  if (value < 1) return `${(value * 24).toLocaleString('fr-FR', {maximumFractionDigits: 1})} h`;
  return `${value.toLocaleString('fr-FR', {maximumFractionDigits: 1})} j`;
}

export function inPeriod(values: (string | null)[], from: string, to: string) {
  return (!from && !to) || values.some((value) => {
    if (!value) return false;
    const key = calendarDay(value);
    return (!from || key >= from) && (!to || key <= to);
  });
}
