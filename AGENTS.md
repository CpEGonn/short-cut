# Repository Guidelines

## Project Structure & Module Organization

ShortCut is split into two packages that are coordinated from the repository root.

- `client/`: React + Vite UI in `src/`, with `index.html` and `vite.config.js` at the package root.
- `server/`: Express API in `src/` and HTTP tests in `test/`.
- `scripts/`: root helpers such as `dev.mjs` and `install-all.mjs`.
- Root files like `package.json`, `README.md`, and `.gitignore` hold shared project setup.

## Build, Test, and Development Commands

Run commands from the repository root.

- `npm install`: install the root package metadata.
- `npm run install:all`: install the client and server dependencies.
- `npm run dev`: start the API and client together.
- `npm start`: start only the Express server.
- `npm test`: run the backend test suite.
- `npm run build`: produce the production client bundle.

## Coding Style & Naming Conventions

Use modern JavaScript with ESM in both packages. Keep modules small, route names descriptive, and filenames lowercase. Match the existing style in each package: two-space indentation, semicolon-free JavaScript, and component-style CSS class names such as `panel-heading` and `record-actions`.

## Testing Guidelines

Backend tests live in `server/test/*.test.js` and use Node's built-in `node:test` runner. Cover create, list, detail, redirect, delete, and invalid URL paths when API behavior changes. Keep tests black-box by hitting the Express app over HTTP.

## Commit & Pull Request Guidelines

Use short, imperative commits such as `feat: add redirect endpoint` or `test: cover invalid url handling`. Pull requests should summarize the change, list verification commands, and include screenshots for UI updates.

## Security & Configuration Tips

Do not commit `.env` files or secrets. Use `BASE_URL` for the public short-link origin and `VITE_API_URL` only when the client must talk to a non-default API host.
