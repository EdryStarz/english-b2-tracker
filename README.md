# English B2 Tracker

A local-first study planner for a 12-week English B1-to-B2 roadmap.

**Status: Prototype.** Tracks study activity; it does not certify language level.

## Features

- Daily tasks, a 12-week roadmap and weekly reflections
- Grammar, vocabulary, speaking and listening practice sections
- Progress dashboard, calendar and an error log
- Focus timer and a Week 8 checkpoint
- IndexedDB persistence and JSON backup/import
- CSV export, an installable PWA manifest and a service worker

## Run locally

Requires Node.js 22.13 or newer.

```bash
npm ci
npm run dev
```

Open `http://localhost:3000`. For a production build:

```bash
npm run build
npm start
```

Set your study start date in Settings. The initial grammar, vocabulary,
speaking and listening entries are examples, not recorded personal results.

## Check

```bash
npm run lint
npx tsc --noEmit
```

Production build, lint and TypeScript checks passed during source publication.
The runtime dependencies passed `npm audit --omit=dev`; the ESLint development
dependency chain still has five high-severity audit findings. Review these
before using the development tools with untrusted inputs.

## Architecture and data

Next.js App Router, React and TypeScript. `app/data.ts` defines the study plan;
`app/page.tsx` implements the interface and `app/db.ts` stores progress in
IndexedDB. `public/` contains the PWA manifest, icons and service worker.

Progress stays in the current browser profile. Export a JSON backup before
clearing browser data or switching devices. There is no account or cloud sync.
Offline availability depends on assets already cached after visiting the app;
the service worker is not a guarantee that every route or asset is available.

This source checkout runs independently of the original hosting service. It
does not include deployment credentials, hosting configuration or personal
study records.
