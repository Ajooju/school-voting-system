const http = require('http');
const fs = require('fs');
const path = require('path');
const store = require('./store');

const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'school-admin-secret';

function send(res, status, data, contentType = 'application/json') {
  res.writeHead(status, { 'Content-Type': contentType });
  res.end(contentType === 'application/json' ? JSON.stringify(data) : data);
}

function readBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      try { resolve(body ? JSON.parse(body) : {}); } catch { resolve({}); }
    });
  });
}

function isAdmin(req) {
  return req.headers['x-admin-token'] === ADMIN_TOKEN;
}

function createServer() {
  return http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    const method = req.method;

    if (method === 'GET' && url.pathname === '/health') return send(res, 200, { ok: true });
    if (method === 'GET' && url.pathname === '/') {
      const html = fs.readFileSync(path.join(__dirname, 'public', 'index.html'), 'utf8');
      return send(res, 200, html, 'text/html');
    }

    if (url.pathname.startsWith('/admin') && !isAdmin(req)) return send(res, 401, { error: 'Unauthorized admin token' });

    if (method === 'POST' && url.pathname === '/admin/elections') {
      const body = await readBody(req);
      if (!body.title) return send(res, 400, { error: 'title is required' });
      return send(res, 201, store.createElection(body));
    }

    if (method === 'GET' && url.pathname === '/admin/elections') return send(res, 200, store.listElections());

    const ballotMatch = url.pathname.match(/^\/admin\/elections\/([^/]+)\/ballots$/);
    if (method === 'POST' && ballotMatch) {
      const body = await readBody(req);
      if (!body.title || !Array.isArray(body.options) || body.options.length < 2) return send(res, 400, { error: 'title and at least 2 options are required' });
      const ballot = store.addBallot(ballotMatch[1], body);
      if (!ballot) return send(res, 404, { error: 'Election not found' });
      return send(res, 201, ballot);
    }

    const voterMatch = url.pathname.match(/^\/admin\/elections\/([^/]+)\/voters$/);
    if (method === 'POST' && voterMatch) {
      const body = await readBody(req);
      if (!Array.isArray(body.voters)) return send(res, 400, { error: 'voters array is required' });
      const election = store.updateElection(voterMatch[1], (target) => target.voters = [...new Set([...target.voters, ...body.voters])]);
      if (!election) return send(res, 404, { error: 'Election not found' });
      return send(res, 200, { voters: election.voters });
    }

    const statusMatch = url.pathname.match(/^\/admin\/elections\/([^/]+)\/status$/);
    if (method === 'POST' && statusMatch) {
      const body = await readBody(req);
      if (!['draft', 'open', 'closed'].includes(body.status)) return send(res, 400, { error: 'Invalid status' });
      const election = store.updateElection(statusMatch[1], (target) => (target.status = body.status));
      if (!election) return send(res, 404, { error: 'Election not found' });
      return send(res, 200, election);
    }

    const resultsMatch = url.pathname.match(/^\/admin\/elections\/([^/]+)\/results$/);
    if (method === 'GET' && resultsMatch) {
      const results = store.getResults(resultsMatch[1]);
      if (!results) return send(res, 404, { error: 'Election not found' });
      return send(res, 200, results);
    }

    if (method === 'GET' && url.pathname === '/elections') {
      return send(res, 200, store.listElections().map((e) => ({ id: e.id, title: e.title, description: e.description, status: e.status, ballots: e.ballots, startsAt: e.startsAt, endsAt: e.endsAt })));
    }

    const electionMatch = url.pathname.match(/^\/elections\/([^/]+)$/);
    if (method === 'GET' && electionMatch) {
      const election = store.getElection(electionMatch[1]);
      if (!election) return send(res, 404, { error: 'Election not found' });
      return send(res, 200, election);
    }

    const voteMatch = url.pathname.match(/^\/elections\/([^/]+)\/votes$/);
    if (method === 'POST' && voteMatch) {
      const body = await readBody(req);
      if (!body.voterId || !body.ballotId || !body.optionId) return send(res, 400, { error: 'voterId, ballotId, optionId are required' });
      const result = store.castVote(voteMatch[1], body);
      if (result.error) return send(res, 400, result);
      return send(res, 201, result.vote);
    }

    return send(res, 404, { error: 'Not found' });
  });
}

module.exports = { createServer };
