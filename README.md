# TaskFlow — React + TypeScript + Vite

Todo app UI (React 19, Tailwind 4, Vite). All data lives in the NestJS backend
in `../todo-backend`. Only the refresh token is persisted in the browser (see
[Auth & session](#auth--session)).

## Running

The app needs the backend API running:

```bash
# terminal 1 — backend (see todo-backend/README.md for first-time setup)
cd ../todo-backend && docker compose up -d && npm run migration:run && npm run start:dev

# terminal 2 — frontend
npm install
npm run dev
```

Open http://localhost:5173.

Vite proxies `/api/*` to `http://localhost:3000` (see `vite.config.ts`), so the
frontend talks to the API without CORS concerns during development.

To point at a different backend (e.g. a deployed one), set:

```bash
VITE_API_URL=https://api.example.com/api npm run build
```

## API usage

The UI talks to these backend endpoints (`src/lib/*-api.ts`):

| Feature            | Call                                                     |
| ------------------ | -------------------------------------------------------- |
| List/filter/search | `GET /api/v1/todo?status=&q=`                            |
| Stats tiles        | `GET /api/v1/todo/stats`                                 |
| Create             | `POST /api/v1/todo`                                      |
| Edit / star        | `PATCH /api/v1/todo/:id`                                 |
| Delete             | `DELETE /api/v1/todo/:id`                                |
| Bulk status/delete | `PATCH /api/v1/todo/bulk/status`, `DELETE /api/v1/todo/bulk` |
| Profile            | `GET` / `PUT /api/v1/profile`                            |
| Login / signup     | `POST /api/v1/auth/login`, `POST /api/v1/auth/signup`    |
| Session refresh    | `POST /api/v1/auth/refresh`                              |
| Current user       | `GET /api/v1/auth/me`                                    |

Filtering, search, and sorting are done server-side; the client shows a
debounced (300 ms) search and re-fetches after every mutation so the UI always
reflects saved data. API failures surface in an alert banner with a Retry button.

## Auth & session

- The short-lived **access token is kept in memory**.
- The **refresh token is persisted in `localStorage`** so a page reload can
  restore the session.
- On startup the app calls `GET /auth/me`; if the access token is expired it
  automatically calls `POST /auth/refresh` and retries the request.
- Concurrent 401s share a single refresh request, because the backend rotates
  the refresh token on every use.
- Logging out clears both tokens.

> For a production app, prefer storing the refresh token in an `httpOnly`
> cookie instead of `localStorage` to reduce XSS exposure.

## Scripts

```bash
npm run dev      # dev server with HMR
npm run build    # type-check + production build
npm run lint     # ESLint
npm run preview  # preview the production build
```
