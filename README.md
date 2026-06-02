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

The page always tracks local monthly visits in the visitor's browser. For global monthly visitors, add a GA4 Measurement ID in `index.html`:

```js
window.HOLOCRON_CONFIG = {
  gaMeasurementId: "G-XXXXXXXXXX"
};
```

The app emits `page_view`, `quiz_view`, `question_answered`, `quiz_reset`, and `quiz_completed` events when GA4 is configured.
