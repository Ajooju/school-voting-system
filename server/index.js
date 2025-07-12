const fs = require('fs');
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');

const DATA_FILE = path.join(__dirname, 'data.json');

function loadData() {
  if (!fs.existsSync(DATA_FILE)) {
    return { candidates: [] };
  }
  return JSON.parse(fs.readFileSync(DATA_FILE));
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

const app = express();
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '../client')));

app.post('/api/candidates', (req, res) => {
  const data = loadData();
  const id = data.candidates.length + 1;
  const candidate = { id, name: req.body.name, votes: 0 };
  data.candidates.push(candidate);
  saveData(data);
  res.json(candidate);
});

app.post('/api/vote', (req, res) => {
  const data = loadData();
  const candidate = data.candidates.find(c => c.id === req.body.candidateId);
  if (!candidate) return res.status(404).json({ error: 'Candidate not found' });
  candidate.votes += 1;
  saveData(data);
  res.json({ success: true });
});

app.get('/api/results', (req, res) => {
  const data = loadData();
  res.json(data.candidates);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
