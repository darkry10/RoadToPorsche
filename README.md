# Road to Porsche

A small React (Vite) savings tracker: pick a Porsche, enter what you've saved and your monthly contribution, and see a gauge, milestones and an estimated arrival date. Values are kept in the browser's localStorage.

Live site: https://darkry10.github.io/RoadToPorsche/

## Run locally

```bash
npm install
npm run dev
```

## Deploy

Every push to `main` builds the site and publishes it to GitHub Pages via `.github/workflows/deploy.yml`.

One-time setup: in the repo go to **Settings → Pages → Build and deployment → Source** and choose **GitHub Actions**.
