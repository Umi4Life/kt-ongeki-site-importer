# kt-ongeki-site-importer
Import scores from https://ongeki-net.com to Kamaitachi

## Features
- [x] Import recent scores
- [x] Import PBs

## Installation
### With a userscript manager

1. Install a userscript manager (e.g. Greasemonkey or Tampermonkey).
2. Click [here](https://github.com/Umi4Life/kt-ongeki-site-importer/raw/master/docs/kt-ongeki-site-importer.user.js).

### With a bookmarklet
(view this site from <https://Umi4Life.github.io/kt-ongeki-site-importer/>)

1. Bookmark this link by dragging it to the bookmarks bar: [Kamaitachi ONGEKI Site Importer](javascript:void(function(d){if(['ongeki-net.com'].includes(d.location.host))document.body.appendChild(document.createElement('script')).src='https://Umi4Life.github.io/kt-ongeki-site-importer/kt-ongeki-site-importer.min.js?t='+Math.floor(Date.now()/60000)})(document);).

Raw text:
```
javascript:void(function(d){if(['ongeki-net.com'].includes(d.location.host))document.body.appendChild(document.createElement('script')).src='https://Umi4Life.github.io/kt-ongeki-site-importer/kt-ongeki-site-importer.min.js?t='+Math.floor(Date.now()/60000)})(document);
```

## Usage
1. Go to ONGEKI-NET ([Japan](https://ongeki-net.com/)) and log in.
2. Set up your API key following the instructions you see on the page.
3. ALWAYS IMPORT RECENT SCORES FIRST.
4. Jump to recent scores page, and click the "Import recent scores" button.
5. To backfill all PBs, jump to the PBs page and click the "Import all PBs" button.

## Development
1. Edit files in `src/ongeki-inporter`
2. run `npm run build` in terminal
3. Userscript will be output to `docs/kt-ongeki-site-importer.user.js`

## TODO
- [] switch to bundlemonkey for bundling typescript to userscript