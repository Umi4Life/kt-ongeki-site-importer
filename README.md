# kt-ongeki-site-importer

Import scores from [https://ongeki-net.com](https://ongeki-net.com) to Kamaitachi

## Features

- Import recent scores
- Import PBs

## Installation

### With a userscript manager

1. Install a userscript manager (e.g. Greasemonkey or Tampermonkey).
2. Click [here](https://github.com/Umi4Life/kt-ongeki-site-importer/raw/master/docs/kt-ongeki-site-importer.user.js).

### With a bookmarklet

(view this site from [https://Umi4Life.github.io/kt-ongeki-site-importer/](https://Umi4Life.github.io/kt-ongeki-site-importer/))

1. Bookmark this link by dragging it to the bookmarks bar: [Kamaitachi ONGEKI Site Importer](javascript:void(function(d){if(['ongeki-net.com'].includes(d.location.host))document.body.appendChild(document.createElement('script')).src='https://Umi4Life.github.io/kt-ongeki-site-importer/kt-ongeki-site-importer.min.js?t='+Math.floor(Date.now()/60000)})(document);).

Raw text:

```
javascript:void(function(d){if(['ongeki-net.com'].includes(d.location.host))document.body.appendChild(document.createElement('script')).src='https://Umi4Life.github.io/kt-ongeki-site-importer/kt-ongeki-site-importer.min.js?t='+Math.floor(Date.now()/60000)})(document);
```

## Usage

1. Go to ONGEKI-NET ([International](https://www.youtube.com/watch?v=dQw4w9WgXcQ), [Japan](https://ongeki-net.com/)) and log in.
2. Set up your API key following the instructions you see on the page.
3. ALWAYS IMPORT RECENT SCORES FIRST.
4. Jump to recent scores page, and click the "Import recent scores" button.
5. Note that recent import cannot grab platinum score, you'll need to backfill all PBs to update those.
6. To backfill all PBs, jump to the PBs page and click the "Import all PBs" button.

## Reporting issues

If something goes wrong during an import, please report it on [GitHub Issues](https://github.com/Umi4Life/kt-ongeki-site-importer/issues) with the details below.

### 1. Copy the error from the console

1. On ONGEKI-NET, open DevTools (**F12** or right-click → **Inspect**).
2. Open the **Console** tab and turn on **Preserve log** (so logs stay after clicks/navigation).
3. Run the import again until it fails.
4. Select and copy the error lines (and any lines above them that mention `kt-ongeki-site-importer` or `Parse error`).

### 2. Write steps to reproduce

List, in order:

- Which button you clicked (recent scores or import all PBs).
- Which ONGEKI-NET page you were on.

### 3. Optional: save the page HTML

For me to reproduce errors better:

1. When opened the song scores, select all genre
2. Then click on basic, save html
3. Click on advanced, save html
4. And so on until lunatic
5. Attach the html file to the GitHub issue (or zip it if GitHub rejects the upload).

### 4. Submit the issue

1. Check [existing issues](https://github.com/Umi4Life/kt-ongeki-site-importer/issues) for duplicates.
2. Open a **[new issue](https://github.com/Umi4Life/kt-ongeki-site-importer/issues/new)**.
3. Paste your **console log** and **steps to reproduce**, and attach the **HTML file** if you saved one.

## Development

### Prerequisites

- Node.js 18+
- A userscript manager in your browser (Tampermonkey, Violentmonkey, or Greasemonkey)

### Setup

```bash
npm install
npm run generate:lookups   # refresh Tachi chart ID maps (also runs before build)
npm run build
```

The bundled userscript is written to `docs/kt-ongeki-site-importer.user.js`. A minified bookmarklet build is also emitted to `docs/kt-ongeki-site-importer.min.js`.

### Install locally (Firefox)

1. Install a userscript manager add-on (Violentmonkey or Tampermonkey are common on Firefox).
2. Run `npm run build`.
3. Install `docs/kt-ongeki-site-importer.user.js` in your userscript manager (open the file or use your manager's "install from file" flow).
4. Open [ONGEKI-NET](https://ongeki-net.com/ongeki-mobile/home), set your API key, and test an import.

### Edit loop

Source lives under `src/ongeki-importer/`. The project uses [bundlemonkey](https://github.com/mkobayashime/bundlemonkey) via `scripts/bundle.js` (Windows path workaround included).

| Command | Purpose |
| --- | --- |
| `npm run generate:lookups` | Regenerate Tachi `inGameID` maps from [zkldi/Tachi](https://github.com/zkldi/Tachi) seeds |
| `npm run verify:lookups` | Regenerate lookups and fail if `tachi-chart-lookups.ts` would change (run before opening a PR) |
| `npm test` | Run unit tests |
| `npm run test:watch` | Run unit tests in watch mode |
| `npm run build` | Production bundle to `docs/` |
| `npm run watch` | Rebuild on save and copy output to clipboard |
| `npm run watch:remote` | Rebuild on save using a one-time stub that `@require`s `.dev/` output |
| `npm run typecheck` | Run `tsc --noEmit` |

CI runs `generate:lookups`, `test`, `typecheck`, and `build` on every push and pull request to `master` (see [`.github/workflows/ci.yml`](.github/workflows/ci.yml)). On `master`, CI also commits refreshed lookups and the rebuilt `docs/` bundle when Tachi seeds change (weekly schedule, manual **Run workflow**, or any push). Pull requests must pass `verify:lookups` so committed lookups stay in sync. The only external dependency for refresh is the public Tachi seed JSON; commits use the built-in `github-actions[bot]` token.

**Recommended workflow**

1. Run `npm run watch`.
2. Edit files in `src/ongeki-importer`.
3. On save, paste the clipboard contents into your userscript manager editor and save.
4. Reload the ONGEKI-NET tab to test.

For `watch:remote`, paste the stub once, then allow your userscript manager to load local files (`file://`). If remote watch is awkward in your browser, use `npm run watch` + paste instead.

### Project layout

```
src/ongeki-importer/
  index.user.ts       # userscript entry + metadata
  app/                # bootstrap, router, shared context
  features/           # import workflows (recent scores, PBs, API key)
  domain/             # types, errors, pure parsers
  infrastructure/     # HTTP clients, local storage
  ui/                 # DOM widgets
  config/             # constants, generated Tachi chart lookups
```

### Known limitations

- **ブツメツビーターズ** Re:MASTER is the only white chart without a Tachi `inGameID`; it is matched via `songTitle` + `Re:MASTER` instead.
- Tachi chart lookups refresh automatically on `master` via CI; new white-chart / Re:MASTER entries are picked up without a manual release step.

