import {pageInfoQuery, pages, restRoot} from './github.mjs';

const fields = {
  status: /^(status|statut)$/,
  priority: /^(priority|priorite)$/,
  start: /^(start( date)?|debut|date de debut)$/,
  finish: /^(target( date)?|due date|end date|fin|echeance|date (de fin|cible))$/,
  points: /^(estimate|estimation|points|story points)$/,
};

const fieldType = {
  status: 'name', priority: 'name', start: 'date', finish: 'date', points: 'number',
};

const fieldName = 'field { ... on ProjectV2FieldCommon { id } }';
const selections = `
  ... on ProjectV2ItemFieldSingleSelectValue { name ${fieldName} }
  ... on ProjectV2ItemFieldDateValue { date ${fieldName} }
  ... on ProjectV2ItemFieldNumberValue { number ${fieldName} }
  ... on ProjectV2ItemFieldIterationValue { iterationId ${fieldName} }
`;

const normalize = (name) => name.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();

export async function readProject(api, token, repository, number) {
  const [owner] = repository.split('/');
  const query = async (query, variables) => {
    const {data, errors} = await api(`${restRoot}/graphql`, {
      token, method: 'POST', body: JSON.stringify({query, variables}),
    });
    if (errors?.length || !data) {
      throw new Error('Lecture GraphQL du Project impossible. Vérifier le jeton et l’accès au Project.');
    }
    return data;
  };

  const {user} = await query(`query($owner: String!, $number: Int!) {
    user(login: $owner) { projectV2(number: $number) { id public } }
  }`, {owner, number});
  const project = user?.projectV2;
  if (!project?.public) {
    throw new Error('Project indisponible ou privé. Les champs d’un Project privé sont exclus du JSON public.');
  }

  const boardFields = await pages(async (after) => {
    const {node} = await query(`query($id: ID!, $after: String) {
      node(id: $id) { ... on ProjectV2 { fields(first: 50, after: $after) {
        ${pageInfoQuery}
        nodes {
          ... on ProjectV2FieldCommon { id name dataType }
          ... on ProjectV2IterationField {
            configuration { iterations { id title startDate duration } completedIterations { id title startDate duration } }
          }
        }
      } } }
    }`, {id: project.id, after});
    return node.fields;
  });

  const entries = await pages(async (after) => {
    const {node} = await query(`query($id: ID!, $after: String) {
      node(id: $id) { ... on ProjectV2 { items(first: 25, after: $after) {
        ${pageInfoQuery}
        nodes { id isArchived
          content {
            ... on Issue { number repository { nameWithOwner isPrivate } }
            ... on PullRequest { number repository { nameWithOwner isPrivate } }
          }
          type
          fieldValues(first: 25) { ${pageInfoQuery} nodes { ${selections} } }
        }
      } } }
    }`, {id: project.id, after});
    return node.items;
  });

  const iterations = boardFields.filter(({dataType}) => dataType === 'ITERATION');
  const iteration = iterations.find(({name}) => /sprint|iteration/.test(normalize(name))) ?? iterations[0];
  const sprints = iteration ? [...iteration.configuration.completedIterations, ...iteration.configuration.iterations] : [];
  const mapping = Object.fromEntries(Object.entries(fields).map(([key, pattern]) => [
    key, boardFields.find(({name}) => pattern.test(normalize(name)))?.id,
  ]));

  const items = new Map();
  for (const item of entries) {
    if (!item.content || item.content.repository.isPrivate ||
        normalize(item.content.repository.nameWithOwner) !== normalize(repository)) continue;
    const extra = item.fieldValues.pageInfo.hasNextPage ? await pages(async (after) => {
      const {node} = await query(`query($id: ID!, $after: String) {
        node(id: $id) { ... on ProjectV2Item {
          fieldValues(first: 50, after: $after) { ${pageInfoQuery} nodes { ${selections} } }
        } }
      }`, {id: item.id, after});
      return node.fieldValues;
    }, item.fieldValues.pageInfo.endCursor) : [];
    const values = new Map([...item.fieldValues.nodes, ...extra].filter((value) => value.field)
      .map((value) => [value.field.id, value]));
    const result = Object.fromEntries(Object.entries(mapping).map(([key, id]) => [
      key, values.get(id)?.[fieldType[key]] ?? null,
    ]));
    items.set(item.content.number, {
      ...result, sprint: values.get(iteration?.id)?.iterationId ?? null, archived: item.isArchived,
    });
  }
  return {items, sprints, fields: boardFields.map(({name}) => name)};
}
