# URL Shortener

A simple full-stack URL shortener with a React frontend and an Express backend. Paste a long URL, generate a short link, and use it to redirect visitors to the original destination.

## Tech stack

- Frontend: React
- Backend: Express.js / Node.js
- Database: Add your preferred database (for example, MongoDB or PostgreSQL) to persist links.

## Features

- Create short URLs from long links
- Redirect short links to their original URLs
- Validate submitted URLs
- Copy generated short links
- Optional: track visit counts and link creation dates

## Project structure

```text
url-shortener/
├── client/             # React frontend
│   ├── src/
│   └── package.json
├── server/             # Express API
│   ├── index.js
│   └── package.json
└── README.md
```

## Getting started

### Prerequisites

- Node.js 18 or later
- npm

### Install dependencies

Install the frontend and backend dependencies separately:

```bash
cd client
npm install

cd ../server
npm install
```

### Environment variables

Create a `.env` file in the `server` directory:

```env
PORT=5000
BASE_URL=http://localhost:5000
```

Add database connection variables here if your backend uses a database.

### Run the project

Start the Express server:

```bash
cd server
npm run dev
```

In another terminal, start React:

```bash
cd client
npm start
```

The frontend typically runs at `http://localhost:3000` and the API at `http://localhost:5000`.

## Suggested API endpoints

| Method | Endpoint | Description |
| --- | --- | --- |
| `POST` | `/api/shorten` | Create a shortened URL |
| `GET` | `/api/urls/:code` | Retrieve short-link details |
| `GET` | `/:code` | Redirect to the original URL |

Example request:

```json
POST /api/shorten
{
  "url": "https://example.com/a/very/long/link"
}
```

Example response:

```json
{
  "shortUrl": "http://localhost:5000/abc123",
  "code": "abc123"
}
```

## License

This project is available for learning and personal use.
