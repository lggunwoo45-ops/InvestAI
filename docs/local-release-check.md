# Local Release Check

Run all commands from `frontend`.

## Install and validate

```powershell
npm install
npm run test:proxy
npm run lint
npm run typecheck
npm run test -- --maxWorkers=1
npm run build
```

## Preview the production build

```powershell
npm run preview
```

The preview command serves only the built static frontend. It does not launch the news or DART proxy.

Optional local services must run in separate terminals:

```powershell
npm run news:proxy

# In another terminal; set only in the server process environment.
$env:DART_API_KEY="your_local_key"
npm run dart:proxy
```

For a future deployed beta, replace the localhost base URLs with approved HTTPS proxy URLs at build time. The deployed equivalent still requires two separately hosted, reviewed proxy services; static hosting cannot safely hold `DART_API_KEY` or fetch arbitrary RSS on behalf of the browser.

Before sharing, complete [`beta-share-checklist.md`](beta-share-checklist.md) and review [`deployment-foundation.md`](deployment-foundation.md). Do not commit local `.env` files or release a build from a dirty working tree.
