# Road to Porsche

A small React (Vite) savings tracker: pick a Porsche, enter what you've saved and your monthly contribution, and see a gauge, milestones and an estimated arrival date. Values are kept in the browser's localStorage.

Live site: https://darkry10.github.io/RoadToPorsche/

## Layout

- `app/` — the React source. Edit this.
- `index.html`, `assets/`, `favicon.svg` at the repo root — the **built** site, generated automatically. Don't edit these by hand.

## Run locally

```bash
cd app
npm install
npm run dev
```

## Deploy

GitHub Pages is set to **Deploy from a branch → main / root**. Every push that changes `app/` runs `.github/workflows/build-site.yml`, which builds the app and commits the result to the repo root; Pages then publishes it.
