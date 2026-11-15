import assert from 'node:assert/strict';
import test from 'node:test';
import {elapsed, issuePhase, issueStatus, median, normalizeReviews, pullPhase} from './project-metrics.mjs';
import {pages} from './github.mjs';

test('median remains unavailable without observations and works on unsorted values', () => {
  assert.equal(median([]), null);
  assert.equal(median([8, 15, 1]), 8);
  assert.equal(median([5, 1]), 3);
});

test('elapsed days use offsets rather than local clock changes', () => {
  assert.equal(elapsed('2026-10-25T01:30:00+02:00', '2026-10-25T02:30:00+01:00'), 2 / 24);
});

test('only submitted human reviews within the pull lifetime affect review metrics', () => {
  const start = '2026-11-06T08:00:00Z';
  const end = '2026-11-06T18:00:00Z';
  const row = (id, submitted_at, state, type = 'User') => ({id, submitted_at, state, user: {type}});
  assert.deepEqual(normalizeReviews([], start, end), []);
  assert.deepEqual(normalizeReviews([
    row(1, '2026-11-06T19:00:00Z', 'APPROVED'),
    row(2, '2026-11-06T15:00:00Z', 'APPROVED'),
    row(3, '2026-11-06T14:00:00Z', 'PENDING'),
    row(4, '2026-11-06T10:00:00Z', 'COMMENTED', 'Bot'),
    row(5, '2026-11-06T11:00:00Z', 'CHANGES_REQUESTED'),
    row(6, '2026-11-06T07:00:00Z', 'COMMENTED'),
  ], start, end).map(({id}) => id), [5, 2]);
});

test('without project fields, a reopened issue stays open and a closure is factual', () => {
  const base = {project: null, blockers: []};
  assert.equal(issueStatus({...base, closed: null, reason: 'reopened'}), 'Ouverte sur GitHub');
  assert.equal(issueStatus({...base, closed: '2026-11-15', reason: 'not_planned'}), 'Fermée sur GitHub');
  assert.equal(issueStatus({...base, closed: null, blockers: [{open: true}]}), 'Bloquée');
  assert.equal(issueStatus({...base, closed: null, project: {status: 'À faire', archived: false}}), 'À faire');
});

test('phase follows a linked issue and preserves separate conception and design lanes', () => {
  const issues = [{number: 8, phase: 'back'}];
  assert.equal(issuePhase({number: 5, title: '[Figma] Maquettes'}), 'design');
  assert.equal(issuePhase({number: 3, title: '[Archi] Choix technique'}), 'conception');
  assert.equal(pullPhase({title: 'Implementation', body: 'Closes #8'}, issues), 'back');
});

test('pagination walks from a supplied cursor until the last page', async () => {
  const seen = [];
  const result = await pages(async (after) => {
    seen.push(after);
    if (after === 'first') return {nodes: [2, null], pageInfo: {hasNextPage: true, endCursor: 'last'}};
    return {nodes: [3], pageInfo: {hasNextPage: false}};
  }, 'first');
  assert.deepEqual(seen, ['first', 'last']);
  assert.deepEqual(result, [2, 3]);
});

test('the Projects collector declines a private board before reading its fields', async () => {
  const {readProject} = await import('./github-project.mjs');
  let calls = 0;
  const api = async () => {
    calls++;
    return {data: {user: {projectV2: {id: 'private-board', public: false}}}};
  };
  await assert.rejects(readProject(api, 'test', 'owner/repo', 3), /privé/);
  assert.equal(calls, 1);
});

test('Projects enrichment maps known fields and excludes other or private repositories', async () => {
  const {readProject} = await import('./github-project.mjs');
  const connection = (nodes) => ({nodes, pageInfo: {hasNextPage: false}});
  const item = (number, nameWithOwner, isPrivate = false) => ({
    content: {number, repository: {nameWithOwner, isPrivate}}, id: String(number), isArchived: false,
    fieldValues: connection([{name: 'Done', field: {id: 'status'}}]),
  });
  const data = [
    {user: {projectV2: {id: 'public-board', public: true}}},
    {node: {fields: connection([{id: 'status', name: 'Status', dataType: 'SINGLE_SELECT'}])}},
    {node: {items: connection([item(1, 'Owner/Repo'), item(2, 'owner/unrelated'), item(3, 'owner/repo', true)])}},
  ];
  const result = await readProject(async () => ({data: data.shift()}), 'test', 'owner/repo', 3);
  assert.deepEqual(result.fields, ['Status']);
  assert.deepEqual([...result.items], [[1, {
    status: 'Done', priority: null, start: null, finish: null, points: null, sprint: null, archived: false,
  }]]);
});

test('labels preserve overlap, avoid duplicates and keep unused catalogue entries', async () => {
  const {labelCounts} = await import('./project-metrics.mjs');
  const rows = labelCounts([
    {labels: ['frontend', 'backend', 'frontend'], closed: null},
    {labels: ['frontend'], closed: '2026-11-15'},
  ], [{labels: ['backend']}], [{name: 'testing', color: 'abcdef', description: 'Tests'}]);
  assert.deepEqual(rows.map(({name, issues, opened, closed, pulls}) => [name, issues, opened, closed, pulls]), [
    ['frontend', 2, 1, 1, 0], ['backend', 1, 1, 0, 1], ['testing', 0, 0, 0, 0],
  ]);
});

test('review cohorts require a direct label or an explicit reference to a known issue', async () => {
  const {linkedIssues, matchesPullLabel} = await import('./project-metrics.mjs');
  const issues = new Map([[8, {number: 8, labels: ['backend']}], [9, {number: 9, labels: ['design']}]]);
  const linked = linkedIssues({body: 'Refs #9\nCloses #8\nFIXES #8\nResolves #99'}, [...issues.values()]);
  assert.deepEqual(linked, [8]);
  const pull = {labels: ['frontend'], linkedIssues: linked};
  assert.equal(matchesPullLabel(pull, 'backend', issues), true);
  assert.equal(matchesPullLabel(pull, 'frontend', issues), true);
  assert.equal(matchesPullLabel(pull, 'design', issues), false);
});

test('delay examples exclude missing or invalid intervals and return the longest first', async () => {
  const {longestIntervals} = await import('./project-metrics.mjs');
  const rows = [
    {from: '2026-11-05', to: '2026-11-06'},
    {from: '2026-11-05', to: null},
    {from: '2026-11-05', to: '2026-11-04'},
    {from: '2026-11-05', to: '2026-11-09'},
  ];
  assert.deepEqual(longestIntervals(rows, (row) => row.from, (row) => row.to, 2).map(({days}) => days), [4, 1]);
});

test('a future open issue without labels or a Project assignment remains visible with unknown status', async () => {
  const {openIssueStatus} = await import('./project-metrics.mjs');
  const issue = {number: 100, closed: null, blockers: [], project: null, labels: []};
  assert.deepEqual(openIssueStatus(issue), {key: 'unknown', source: null});
  assert.deepEqual(openIssueStatus({...issue, labels: ['frontend', 'backlog']}), {key: 'todo', source: 'label'});
  assert.deepEqual(openIssueStatus({...issue, labels: ['in progress']}), {key: 'progress', source: 'label'});
  assert.deepEqual(openIssueStatus({...issue, labels: ['to review']}), {key: 'review', source: 'label'});
  assert.equal(openIssueStatus({...issue, closed: '2026-11-17T08:00:00Z'}), null);
  assert.deepEqual(openIssueStatus({...issue, reason: 'reopened'}), {key: 'unknown', source: null});
});

test('a declared Project status takes priority over labels unless a dependency is open', async () => {
  const {openIssueStatus} = await import('./project-metrics.mjs');
  const issue = {closed: null, blockers: [], labels: ['in progress'], project: {status: 'À faire', archived: false}};
  assert.deepEqual(openIssueStatus(issue), {key: 'todo', source: 'project'});
  assert.deepEqual(openIssueStatus({...issue, blockers: [{open: true}]}), {key: 'blocked', source: 'dependency'});
});
