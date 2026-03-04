const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_FILE = process.env.DATA_FILE || path.join(__dirname, 'data', 'db.json');

function id() {
  return crypto.randomUUID();
}

function defaultState() {
  return { elections: [] };
}

function ensureDataFile() {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, JSON.stringify(defaultState(), null, 2));
}

function loadState() {
  ensureDataFile();
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

function saveState(state) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(state, null, 2));
}

function createElection(payload) {
  const state = loadState();
  const election = { id: id(), title: payload.title, description: payload.description || '', startsAt: payload.startsAt || new Date().toISOString(), endsAt: payload.endsAt || null, status: payload.status || 'draft', ballots: [], voters: [], votes: [], createdAt: new Date().toISOString() };
  state.elections.push(election);
  saveState(state);
  return election;
}

function addBallot(electionId, payload) {
  const state = loadState();
  const election = state.elections.find((e) => e.id === electionId);
  if (!election) return null;
  const ballot = { id: id(), title: payload.title, options: payload.options.map((label) => ({ id: id(), label })) };
  election.ballots.push(ballot);
  saveState(state);
  return ballot;
}

function listElections() { return loadState().elections; }
function getElection(id) { return loadState().elections.find((e) => e.id === id) || null; }

function updateElection(id, updater) {
  const state = loadState();
  const election = state.elections.find((e) => e.id === id);
  if (!election) return null;
  updater(election);
  saveState(state);
  return election;
}

function castVote(electionId, payload) {
  const state = loadState();
  const election = state.elections.find((e) => e.id === electionId);
  if (!election) return { error: 'Election not found' };
  if (election.status !== 'open') return { error: 'Election is not open' };
  if (!election.voters.includes(payload.voterId)) return { error: 'Voter is not registered for this election' };
  const ballot = election.ballots.find((b) => b.id === payload.ballotId);
  if (!ballot) return { error: 'Ballot not found in election' };
  if (!ballot.options.find((o) => o.id === payload.optionId)) return { error: 'Option not found in ballot' };
  if (election.votes.find((v) => v.voterId === payload.voterId && v.ballotId === payload.ballotId)) return { error: 'Voter has already voted on this ballot' };

  const vote = { id: id(), voterId: payload.voterId, ballotId: payload.ballotId, optionId: payload.optionId, votedAt: new Date().toISOString() };
  election.votes.push(vote);
  saveState(state);
  return { vote };
}

function getResults(electionId) {
  const election = getElection(electionId);
  if (!election) return null;
  return { electionId: election.id, title: election.title, status: election.status, ballots: election.ballots.map((ballot) => ({ id: ballot.id, title: ballot.title, totalVotes: election.votes.filter((v) => v.ballotId === ballot.id).length, options: ballot.options.map((option) => ({ id: option.id, label: option.label, votes: election.votes.filter((v) => v.ballotId === ballot.id && v.optionId === option.id).length })) })) };
}

module.exports = { createElection, addBallot, listElections, getElection, updateElection, castVote, getResults };
