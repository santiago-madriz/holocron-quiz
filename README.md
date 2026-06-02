# Holocron Quiz

A static Star Wars fan quiz with 120 curated questions, dark themed UI, Wookieepedia image/source enrichment, local monthly visit counters, and optional Google Analytics 4 tracking.

## Run Locally

```sh
python3 -m http.server 4177
```

Open `http://localhost:4177/`.

## Wiki Images

Each quiz question includes a `wikiTitle`. The app calls Wookieepedia's MediaWiki API with `pageimages`, `extracts`, and `info`, then displays the returned thumbnail, short source note, and canonical source link.

## Analytics

The page always tracks local monthly visits in the visitor's browser. For global monthly visitors, configure GA4 through deploy-time runtime config instead of editing committed source files.

For local development, copy `config.example.json` to `config.json` and add a GA4 Measurement ID there. `config.json` is ignored by git.

```json
{
  "analytics": {
    "gaMeasurementId": "G-..."
  }
}
```

For GitHub Pages deployments, set a repository variable named `GA_MEASUREMENT_ID`. The Pages workflow generates `config.json` at deploy time.

The app emits `page_view`, `quiz_view`, `question_answered`, `quiz_reset`, and `quiz_completed` events when GA4 is configured.

## Secret Safety

This is a static client app, so shipped config is visible to visitors. Do not put real secrets in `config.json`, `.env`, source files, or GitHub Pages artifacts. See `SECURITY.md` for the repo rules and scan command.
