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

A clear title helps, for example: `Import recent scores fails with Parse error`.

## Development

1. Edit files in `src/ongeki-importer`
2. Run `npm run build` in terminal
3. Userscript will be output to `docs/kt-ongeki-site-importer.user.js`

## TODO

- switch to bundlemonkey for better bundling

