# IndexNow handoff

The ownership prerequisite is ready for the next deployment:

- Key: `5faea639e3354710b502ca7777d1449a`
- Published key URL: `https://svgvectorlab.com/5faea639e3354710b502ca7777d1449a.txt`
- Submission endpoint: `https://api.indexnow.org/indexnow`

Cloudflare publishes `public/`, so the key file will be available at the site root after the changes deploy. It must load publicly and contain only the key before a submission is made.

## Prepared request

Preview the JSON request without making a network call:

```powershell
node scripts/submit-indexnow.mjs
```

By default, the request contains every URL currently listed in `public/sitemap.xml`. This is appropriate for the initial sitewide launch. After a normal content update, pass only the URLs that were added, updated, redirected, or deleted:

```powershell
node scripts/submit-indexnow.mjs https://svgvectorlab.com/ https://svgvectorlab.com/guides/
```

Once the deployment is live, send the request by adding `--send`:

```powershell
node scripts/submit-indexnow.mjs --send
```

The script first verifies the production key file, then sends the prepared JSON request. HTTP 200 is success; the first request may return HTTP 202 while IndexNow validates the key. Do not repeatedly submit unchanged URLs.
