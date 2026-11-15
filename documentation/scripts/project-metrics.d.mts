export const phases: {
  conception: string;
  back: string;
  design: string;
  game: string;
  application: string;
};
export const day: number;
export function elapsed(from: string, to: string): number;
export function median(values: number[]): number | null;
type StatusIssue = {
  project: {status: string | null; archived: boolean} | null;
  blockers: {open: boolean}[];
  closed: string | null;
  labels?: string[];
};
export function issueStatus(issue: StatusIssue): string;
export const openStatuses: {todo: string; progress: string; review: string; blocked: string; unknown: string};
export function openIssueStatus(issue: StatusIssue):
  null | {key: keyof typeof openStatuses; source: 'dependency' | 'project' | 'label' | null};

type Tagged = {labels: string[]};
type TrackedIssue = Tagged & {closed: string | null};
type LinkedPull = Tagged & {linkedIssues: number[]};
type Label = {name: string; color: string | null; description: string | null};

export function labelCounts(issues: TrackedIssue[], pulls: Tagged[], catalog: Label[]):
  (Label & {opened: number; closed: number; pulls: number; issues: number})[];
export function matchesPullLabel(pull: LinkedPull, label: string, issues: Map<number, Tagged>): boolean;
export function longestIntervals<T>(items: T[], start: (item: T) => string | null | undefined,
  end: (item: T) => string | null | undefined, limit?: number): {item: T; days: number}[];
