const { createServer } = require('./app');

const PORT = process.env.PORT || 3000;
createServer().listen(PORT, () => {
  console.log(`Voting system API running on http://localhost:${PORT}`);
});
