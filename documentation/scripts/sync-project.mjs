import {existsSync} from 'node:fs';
import {readFile, rename, writeFile} from 'node:fs/promises';
import {readProject} from './github-project.mjs';
import {mapBatches, readList, repository, request} from './github.mjs';
import {issuePhase, linkedIssues, normalizeReviews, pullPhase} from './project-metrics.mjs';

const output = new URL('../src/project/snapshot.json', import.meta.url);
const temporary = new URL(`${output.href}.${process.pid}.tmp`);
const restToken = process.env.CHOP_REPO_TOKEN;
const projectToken = process.env.CHOP_PROJECT_TOKEN;
const repoUrl = `https://github.com/${repository}`;
const logins = (users) => users.filter(({type}) => type === 'User').map(({login}) => login);

async function readIssues(items, project) {
  const issues = items.filter((item) => !item.pull_request);
  return mapBatches(issues, async (issue) => {
    const blockers = issue.state === 'open'
      ? await readList(`issues/${issue.number}/dependencies/blocked_by`, restToken)
      : [];
    return {
      number: issue.number, title: issue.title, phase: issuePhase(issue),
      created: issue.created_at, closed: issue.closed_at, reason: issue.state_reason,
      assignees: logins(issue.assignees), labels: issue.labels.map(({name}) => name),
      project: project?.items.get(issue.number) ?? null,
      blockers: blockers.filter(({html_url}) => html_url.startsWith(`${repoUrl}/issues/`))
        .map(({number, title, state}) => ({number, title, open: state === 'open'})),
    };
  });
}

async function readPulls(items, issues, project) {
  return mapBatches(items, async (pull) => {
    const reviews = await readList(`pulls/${pull.number}/reviews`, restToken);
    const linked = linkedIssues(pull, issues);
    return {
      number: pull.number, title: pull.title, phase: pullPhase(pull, issues, linked),
      labels: pull.labels.map(({name}) => name), linkedIssues: linked,
      created: pull.created_at, closed: pull.closed_at, merged: pull.merged_at,
      draft: pull.draft, requested: pull.requested_reviewers.length + pull.requested_teams.length,
      reviews: normalizeReviews(reviews.filter(({user}) => user?.login !== pull.user?.login),
        pull.created_at, pull.closed_at),
      project: project?.items.get(pull.number) ?? null,
    };
  });
}

function serialize(snapshot) {
  const properties = Object.entries(snapshot).map(([key, value]) => {
    const serialized = Array.isArray(value) && value.length
      ? '[\n' + value.map((row) => '    ' + JSON.stringify(row)).join(',\n') + '\n  ]'
      : JSON.stringify(value);
    return '  ' + JSON.stringify(key) + ': ' + serialized;
  });
  return '{\n' + properties.join(',\n') + '\n}\n';
}

async function sync() {
  const project = projectToken ? await readProject(request, projectToken, repository, 3) : null;
  if (!project && existsSync(output) && JSON.parse(await readFile(output, 'utf8')).project) {
    throw new Error('Un instantané Projects v2 existe déjà. Fournir CHOP_PROJECT_TOKEN pour le remplacer.');
  }
  const [rawIssues, rawPulls, rawCommits, rawLabels, rawCi] = await Promise.all([
    readList('issues?state=all', restToken),
    readList('pulls?state=all', restToken),
    readList('commits?sha=main', restToken),
    readList('labels', restToken),
    readList('actions/workflows/ci.yml/runs', restToken, (data) => data.workflow_runs),
  ]);
  if (!rawIssues.length || !rawPulls.length || !rawCommits.length) {
    throw new Error('Les données récupérées sont incomplètes.');
  }
  const issues = await readIssues([...new Map(rawIssues.map((item) => [item.number, item])).values()], project);
  const pulls = await readPulls([...new Map(rawPulls.map((item) => [item.number, item])).values()], issues, project);
  const commits = [...new Map(rawCommits.map((item) => [item.sha, item])).values()]
    .map(({sha, commit}) => ({sha, at: commit.committer.date}));
  const labels = rawLabels.map(({name, color, description}) => ({name, color, description}))
    .sort((a, b) => a.name.localeCompare(b.name));
  const ci = [...new Map(rawCi.map((run) => [run.id, run])).values()]
    .map(({id, created_at, event, status, conclusion}) => ({id, at: created_at, event, status, conclusion}));
  const snapshot = {
    version: 2, syncedAt: new Date().toISOString(),
    project: project ? {fields: project.fields, sprints: project.sprints} : null,
    issues: issues.sort((a, b) => a.number - b.number),
    pulls: pulls.sort((a, b) => a.number - b.number),
    labels,
    commits,
    ci,
  };
  await writeFile(temporary, serialize(snapshot));
  await rename(temporary, output);
  console.info(`Instantané mis à jour : ${issues.length} issues, ${pulls.length} PR, ${commits.length} commits.`);
}

sync().catch((error) => {
  console.error(`${error.message} L’instantané précédent est conservé.`);
  process.exitCode = 1;
});
