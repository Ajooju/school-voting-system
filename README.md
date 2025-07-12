# School Voting System

This is a simple web-based voting system for schools. It uses Node.js with Express for the backend and Vue 3 for a lightweight frontend. Data is stored in a JSON file for simplicity. A Dockerfile is provided for easy deployment.

## Running locally

1. Install Node.js (version 18 or newer).
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the server:
   ```bash
   npm start
   ```
4. Open your browser to `http://localhost:3000`.

## Docker

To run with Docker:

```bash
docker build -t school-voting-system .
docker run -p 3000:3000 school-voting-system
```

The application will be available on port 3000.
