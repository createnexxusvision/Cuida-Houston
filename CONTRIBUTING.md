# Contributing

1. Branch from `main`, open a pull request, fill in the template.
2. Run `npm test`, `npm run typecheck` and `npm run build` before pushing.
3. Check both `/es` and `/en` for any UI change. Every new string goes in both `apps/web/messages/*.json`.
4. Pathway content: every step needs a `source_url`. Set `verified_on` only if you checked that source on that date.
5. Never commit `.env` or any service role key.
