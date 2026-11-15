export const phases = {
  conception: 'Conception',
  back: 'Back-end',
  design: 'Design',
  game: 'Gameplay',
  application: 'Application et mise en ligne',
};

export function issuePhase(issue) {
  const title = issue.title.toLowerCase();
  if (/^\[(figma|da)\]/.test(title)) return 'design';
  if (/^\[(archi|produit|discussion équipe)\]/.test(title)) return 'conception';
  if (/^\[(back|bug api|fix)\]/.test(title)) return 'back';
  if (/^\[game\]/.test(title) && !/pages/.test(title)) return 'game';
  if ([19, 56, 57, 58].includes(issue.number)) return 'game';
  return 'application';
}

export function linkedIssues(pull, issues) {
  const matches = pull.body?.matchAll(/\b(?:fix(?:e[sd])?|close[sd]?|resolve[sd]?)\s+#(\d+)/gi) ?? [];
  const known = new Set(issues.map(({number}) => number));
  return [...new Set(Array.from(matches, ([, number]) => Number(number)).filter((number) => known.has(number)))];
}

export function pullPhase(pull, issues, linked = linkedIssues(pull, issues)) {
  const issue = issues.find(({number}) => number === linked[0]);
  if (issue) return issue.phase;
  if (/game\)|phaser|kitchen|livraisons/.test(pull.title.toLowerCase())) return 'game';
  if (/api and bdd|recipes-ingredients|player and session|meilleur score par joueur|monorepo for api/.test(pull.title.toLowerCase())) return 'back';
  return 'application';
}

export function normalizeReviews(reviews, opened, ended) {
  return reviews.filter((review) =>
    ['APPROVED', 'CHANGES_REQUESTED', 'COMMENTED'].includes(review.state) &&
    review.submitted_at >= opened && (!ended || review.submitted_at <= ended) &&
    review.user?.type === 'User')
    .map(({id, submitted_at, state}) => ({id, at: submitted_at, state}))
    .sort((a, b) => a.at.localeCompare(b.at));
}

export function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length ? (sorted[middle] + sorted[Math.floor((sorted.length - 1) / 2)]) / 2 : null;
}

export const day = 86_400_000;
export const elapsed = (from, to) => (Date.parse(to) - Date.parse(from)) / day;

export const openStatuses = {
  todo: 'À faire',
  progress: 'En cours',
  review: 'En revue',
  blocked: 'Bloquée',
  unknown: 'À préciser',
};

const normalizedStatus = (value) => value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();

function recognizedStatus(value) {
  const status = normalizedStatus(value);
  if (/^(blocked|bloque[e]?)$/.test(status)) return 'blocked';
  if (/^(in progress|en cours)$/.test(status)) return 'progress';
  if (/^(in review|en revue|to review|review requested)$/.test(status)) return 'review';
  if (/^(todo|to do|a faire|backlog|ready)$/.test(status)) return 'todo';
  return null;
}

export function openIssueStatus(issue) {
  if (issue.closed) return null;
  if (issue.blockers.some(({open}) => open)) return {key: 'blocked', source: 'dependency'};
  if (issue.project?.status && !issue.project.archived) {
    return {key: recognizedStatus(issue.project.status) ?? 'unknown', source: 'project'};
  }
  const labels = (issue.labels ?? []).map(recognizedStatus);
  for (const key of ['blocked', 'review', 'progress', 'todo']) {
    if (labels.includes(key)) return {key, source: 'label'};
  }
  return {key: 'unknown', source: null};
}

export function issueStatus(issue) {
  if (issue.project?.archived) return 'Archivée dans le Project';
  const open = openIssueStatus(issue);
  if (open?.key === 'blocked') return openStatuses.blocked;
  const status = issue.project?.status;
  if (status && /^(done|termine[e]?|complete[d]?|fini[e]?)$/.test(normalizedStatus(status))) {
    return 'Terminée dans le Project';
  }
  if (open && open.key !== 'unknown') return openStatuses[open.key];
  return issue.closed ? 'Fermée sur GitHub' : (status || 'Ouverte sur GitHub');
}

export function labelCounts(issues, pulls, catalog) {
  const labels = new Map(catalog.map(({name, color, description}) => [name,
    {name, color, description, opened: 0, closed: 0, pulls: 0},
  ]));
  const row = (name) => {
    if (!labels.has(name)) labels.set(name, {name, color: null, description: null, opened: 0, closed: 0, pulls: 0});
    return labels.get(name);
  };
  for (const issue of issues) {
    for (const label of new Set(issue.labels)) row(label)[issue.closed ? 'closed' : 'opened']++;
  }
  for (const pull of pulls) {
    for (const label of new Set(pull.labels)) row(label).pulls++;
  }
  return [...labels.values()].map((item) => ({...item, issues: item.opened + item.closed}))
    .sort((a, b) => b.issues - a.issues || a.name.localeCompare(b.name, 'fr'));
}

export function matchesPullLabel(pull, label, issues) {
  return pull.labels.includes(label) || pull.linkedIssues.some((number) => issues.get(number)?.labels.includes(label));
}

export function longestIntervals(items, start, end, limit = 3) {
  return items.flatMap((item) => {
    const from = start(item);
    const to = end(item);
    const days = from && to ? elapsed(from, to) : NaN;
    return Number.isFinite(days) && days >= 0 ? [{item, days}] : [];
  }).sort((a, b) => b.days - a.days).slice(0, limit);
}
