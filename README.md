# School Voting System

A full-featured, web-based school voting system backend with a lightweight admin/voter UI.

## Features

- Create and manage **multiple elections**.
- Add **multiple ballots** per election (e.g., President, Treasurer, Referendum).
- Register allowed voters per election.
- Admin control for election lifecycle (`draft` → `open` → `closed`).
- One-vote-per-voter-per-ballot enforcement.
- Real-time result aggregation per ballot option.

## Quick Start

```bash
npm install
npm start
```

Open: `http://localhost:3000`

Default admin token:

- `school-admin-secret`
- Override with: `ADMIN_TOKEN=your-token npm start`

## API Overview

### Admin endpoints (require `x-admin-token` header)

- `POST /admin/elections` - create election
- `GET /admin/elections` - list all elections
- `POST /admin/elections/:id/ballots` - add ballot with options
- `POST /admin/elections/:id/voters` - register voters
- `POST /admin/elections/:id/status` - set status (`draft|open|closed`)
- `GET /admin/elections/:id/results` - election tallies

### Voter/Public endpoints

- `GET /elections` - list elections and ballots
- `GET /elections/:id` - detailed election
- `POST /elections/:id/votes` - cast vote

## Example Admin Flow

1. Create election.
2. Add one or more ballots.
3. Add allowed voter IDs.
4. Open election.
5. Voters cast votes by ballot.
6. Close election and view results.

## Test

```bash
npm test
```
