# Security Notes

This is a static GitHub Pages app. Anything shipped in HTML, CSS, JavaScript, or `config.json` is public to every visitor.

## Rules

- Do not commit `.env`, `.env.*`, `config.json`, key files, tokens, passwords, or service-account material.
- Use `config.example.json` and `.env.example` only for shape/documentation.
- Use repository variables for public client values such as a GA4 Measurement ID.
- Use repository secrets only for server-side deploy steps. Never write a real secret into the Pages artifact.
- If a feature needs a private API key, add a backend or serverless proxy and keep the key there.
- Before pushing, run:

```sh
git grep -n -I -E 'AIza|AKIA|ASIA|ghp_|github_pat_|xox[baprs]-|sk-[A-Za-z0-9]|-----BEGIN (RSA|OPENSSH|PRIVATE)|password|passwd|secret|token|api[_-]?key|client[_-]?secret|credential|authorization|bearer' HEAD
```

Expected false positives today are Star Wars quiz text containing the word `secret` and CSS property names such as `mask-image`.
