# SVG Vector Lab launch checklist

## 1. Domain

- Keep `https://svgvectorlab.com` as the canonical origin.
- Attach both the apex domain and `www` to the Cloudflare Pages project.
- Redirect `www.svgvectorlab.com` to `https://svgvectorlab.com` with a permanent redirect.
- Redirect the public `pages.dev` address to the canonical domain if it remains accessible.
- Confirm HTTPS is active for every attached hostname.

## 2. Hosting

- Push the production branch to GitHub.
- In Cloudflare, create a Pages project and import the GitHub repository.
- Set the production branch to `main`.
- Use `exit 0` as the one-time dashboard build setting and choose the repository root—the directory containing `index.html`—as the output directory.
- After the Git integration is connected, do not run a deploy command. A push to `main` automatically creates the next production deployment; other enabled branches receive preview deployments.
- Confirm HTTPS is active and test all routes listed in `sitemap.xml`.
- Confirm the custom 404 page and the security headers are served.

## 3. Analytics

- In Cloudflare, open Workers & Pages, select the project, then open Metrics.
- Select Enable under Web Analytics.
- Cloudflare will inject its analytics beacon on the next deployment; do not paste a token into the repository when using the Pages one-click setup.
- Make one normal Git push after enabling analytics, then verify page views in the Web Analytics dashboard.
- Review the production Privacy Policy and keep the Cloudflare disclosure accurate.
- Cloudflare Web Analytics covers aggregate page and performance metrics. It does not currently provide custom product events, so editor actions such as SVG exports and path conversions require a separate product-analytics decision later.

## 4. Search and sharing

- Open the production canonical URL and verify the title, description, canonical URL, and social preview.
- Verify `robots.txt` and `sitemap.xml` are publicly reachable.
- Add the domain property to Google Search Console.
- Submit `/sitemap.xml` in Search Console.
- Request indexing for the home page and guide hub.
- Test `docs/og-card.png` with the social-sharing debuggers used by the platforms you care about.

## 5. Policy review

- Review `privacy/index.html` and `terms/index.html` for the actual hosting, analytics, advertising, business identity, and jurisdiction used at launch.
- Configure Cloudflare Email Routing (or another mailbox provider) so `contact@svgvectorlab.com` receives mail.
- Confirm that the Cloudflare Web Analytics disclosure matches the production configuration.
- Configure a consent platform that meets the requirements for every region where ads or analytics require consent.

The included policy pages are a practical starting point, not legal advice.

## 6. AdSense

- Apply only after the custom domain is live, useful, and receiving genuine visitors.
- Add the site in AdSense and use the supplied verification method.
- Configure Google's Privacy & messaging consent flow or another Google-certified CMP before serving ads where required.
- Wait for site approval before adding live ad units.
- Copy `ads.txt.example` to `ads.txt` and replace the sample publisher ID with the exact AdSense value.
- Verify `https://svgvectorlab.com/ads.txt` and the AdSense ads.txt status.
- Start with one or two responsive ad units away from editor controls.
- Never click your own ads, request clicks, or purchase low-quality traffic.

## 7. Final quality check

- Run all tests:

  ```powershell
  node --test tests/path-data.test.mjs tests/site-content.test.mjs
  ```

- Test the editor on desktop and mobile browsers.
- Open, edit, and export multiple real SVG files.
- Verify local autosave and clear-site-data behavior.
- Check keyboard navigation, focus visibility, page zoom, and color contrast.
- Keep a backup of the original source and exported artwork.
