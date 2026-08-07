# ShortCut

ShortCut is a full-stack URL shortener built with React, Vite, Express, and Node.js. Paste an HTTP or HTTPS URL, generate a compact link, copy it, inspect its metadata through the API, or follow it back to the original destination.

## Project structure

```text
.
|-- client/             # React + Vite frontend
|-- server/             # Express API and tests
|-- scripts/            # Root dev and install helpers
|-- AGENTS.md           # Contributor guide
`-- package.json        # Root scripts
```

## Requirements

- Node.js 20.19 or newer
- npm

Install dependencies from the repository root:

```bash
npm install
npm run install:all
```

## Commands

Run these from the repository root:

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the API and frontend together |
| `npm start` | Start only the Express API |
| `npm test` | Run the backend API tests |
| `npm run build` | Build the production frontend bundle |
| `npm run install:all` | Install the client and server dependencies |

## Configuration

The backend reads these optional environment variables:

| Variable | Default | Description |
| --- | --- | --- |
| `PORT` | `3000` | Express listening port |
| `BASE_URL` | `http://localhost:3000` | Public origin used in generated short URLs |

The frontend uses `VITE_API_URL` when the API is not available through the default Vite proxy:

```env
VITE_API_URL=http://localhost:3000/api
```

## API

Responses use either `{ "data": ... }` or `{ "error": "..." }`.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/health` | Health check |
| `GET` | `/api/urls` | List the 10 most recent links |
| `POST` | `/api/urls` | Create a short URL from `{ "url": "https://example.com" }` |
| `GET` | `/api/urls/:shortCode` | Read a stored link record |
| `DELETE` | `/api/urls/:shortCode` | Delete a stored short URL |
| `GET` | `/:shortCode` | Redirect to the original URL |

Invalid URLs return `400`. Unknown short codes return `404`.

## Testing

The backend uses Node's built-in `node:test` runner. Run the suite with:

```bash
npm test
```

The tests start the Express app on an ephemeral port and exercise the HTTP contract end to end.

## Persistence

URL records are stored in memory. Restarting the API clears all links, so add a persistent datastore before using this in production.
