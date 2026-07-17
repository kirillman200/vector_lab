# Security policy

SVG Vector Lab processes artwork locally in the browser and does not intentionally upload SVG files to a server.

## Reporting a vulnerability

Send security reports to [contact@svgvectorlab.com](mailto:contact@svgvectorlab.com?subject=SVG%20Vector%20Lab%20security%20report). Include the affected URL or file, reproduction steps, expected impact, and any safe proof of concept. Do not include confidential artwork, credentials, or personal data.

Please allow reasonable time to investigate before publicly disclosing an unresolved vulnerability.

## Deployment boundary

Only files inside `public/` are deployable. Repository metadata, development configuration, tests, and documentation must remain outside that directory. Run `node scripts/check-live-security.mjs` after production deployments to confirm private paths return 404.
