const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');

const testDbFile = path.join(__dirname, 'tmp-db.json');
process.env.DATA_FILE = testDbFile;
process.env.ADMIN_TOKEN = 'test-admin';

const { createServer } = require('../src/app');

function resetDb() {
  if (fs.existsSync(testDbFile)) fs.unlinkSync(testDbFile);
}

async function api(baseUrl, method, endpoint, body, headers = {}) {
  const res = await fetch(`${baseUrl}${endpoint}`, {
    method,
    headers: { 'content-type': 'application/json', ...headers },
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await res.json();
  return { status: res.status, data };
}

test.beforeEach(() => {
  resetDb();
});

test.after(() => {
  resetDb();
});

test('admin can run complete multi-ballot election flow', async () => {
  const server = createServer();
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  const created = await api(baseUrl, 'POST', '/admin/elections', { title: 'Student Council 2026' }, { 'x-admin-token': 'test-admin' });
  assert.equal(created.status, 201);
  const electionId = created.data.id;

  const ballot = await api(baseUrl, 'POST', `/admin/elections/${electionId}/ballots`, { title: 'President', options: ['Alice', 'Bob'] }, { 'x-admin-token': 'test-admin' });
  assert.equal(ballot.status, 201);

  await api(baseUrl, 'POST', `/admin/elections/${electionId}/voters`, { voters: ['grade10-001'] }, { 'x-admin-token': 'test-admin' });
  await api(baseUrl, 'POST', `/admin/elections/${electionId}/status`, { status: 'open' }, { 'x-admin-token': 'test-admin' });

  const vote = await api(baseUrl, 'POST', `/elections/${electionId}/votes`, {
    voterId: 'grade10-001',
    ballotId: ballot.data.id,
    optionId: ballot.data.options[0].id
  });
  assert.equal(vote.status, 201);

  const results = await api(baseUrl, 'GET', `/admin/elections/${electionId}/results`, null, { 'x-admin-token': 'test-admin' });
  assert.equal(results.status, 200);
  assert.equal(results.data.ballots[0].totalVotes, 1);

  server.close();
});
