export const restRoot = 'https://api.github.com';
export const repository = 'Mahkalix/Chop-Chop';
export const pageInfoQuery = 'pageInfo { hasNextPage endCursor }';

export async function request(url, options = {}) {
  const {token, method = 'GET', body} = options;
  const response = await fetch(url, {
    method, body, signal: AbortSignal.timeout(25_000), redirect: 'error',
    headers: {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'chop-chop-project-dashboard',
      'X-GitHub-Api-Version': '2026-03-10',
      ...(token ? {Authorization: `Bearer ${token}`} : {}),
      ...(body ? {'Content-Type': 'application/json'} : {}),
    },
  });
  if (!response.ok) {
    const quota = response.headers.get('x-ratelimit-remaining') === '0' ? ' (quota épuisé)' : '';
    throw new Error(`GitHub HTTP ${response.status}${quota} sur ${new URL(url).pathname}`);
  }
  return {data: await response.json(), links: response.headers.get('link')};
}

export async function readList(path, token, select = (data) => data) {
  const url = new URL(path, `${restRoot}/repos/${repository}/`);
  url.searchParams.set('per_page', '100');
  const rows = [];
  let next = url.href;
  while (next) {
    if (new URL(next).origin !== restRoot) throw new Error('Lien de pagination GitHub inattendu.');
    const {data, links} = await request(next, {token});
    rows.push(...select(data));
    next = links?.match(/<([^>]+)>; rel="next"/)?.[1];
  }
  return rows;
}

export async function pages(getConnection, start = null) {
  const rows = [];
  let after = start;
  do {
    const connection = await getConnection(after);
    rows.push(...connection.nodes.filter(Boolean));
    after = connection.pageInfo.hasNextPage ? connection.pageInfo.endCursor : null;
  } while (after);
  return rows;
}

export async function mapBatches(rows, action) {
  const results = [];
  for (let index = 0; index < rows.length; index += 4) {
    results.push(...await Promise.all(rows.slice(index, index + 4).map(action)));
  }
  return results;
}
