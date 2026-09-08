# SVG Vector Lab editorial context
- Zero-dependency browser SVG editor at https://svgvectorlab.com. Audience: designers/developers editing SVG source, shapes, paths and nodes. Clear technical English; exact SVG syntax with runnable examples.
- Canonical svgvectorlab.com; /sitemap.xml; /guides/ and /guides/<slug>/. Links / (editor), /svg-path-editor/, /svg-to-png/, /convert-shapes-to-paths/ and targeted guides.
- Local import/sanitization/edit/export, localStorage autosave, SVG and PNG exports. Never imply uploads, account sync or unsupported preservation of all SVG features.
- Repository-backed static HTML, no CMS/Hygraph or package.json. public/guides/<slug>/index.html is each article. Use a recent guide template; shared /content.css, header/footer composition, byline/editorial-policy, advertising support and social image /docs/og-card-1200x630.png.
- Update public/guides/index.html, public/sitemap.xml and public/llms.txt plus directly related route registries/tests if required. Article/TechArticle and Breadcrumb JSON-LD, distinct title/description/canonical, OG/Twitter fields including image alt, published/modified dates and visible byline/date.
- node --test tests/*.test.mjs; node --check src/worker.mjs. No build. Cloudflare publishes public/ through src/worker.mjs; Git-integrated Workers Builds deploy after push.
- Git remote named main, tracked branch main/main (not origin). Wait for Git deployment and verify custom-domain URL before IndexNow.
- IndexNow node scripts/submit-indexnow.mjs <URL> previews; node scripts/submit-indexnow.mjs --send <URL> verifies live prerequisites and submits. Never log key values.

## Editorial operations
Initialized from repository evidence on 2026-09-08. Never use em dash punctuation. Read AGENTS.md when present. Use current web research and a targeted duplicate-topic check before publishing. Preserve unrelated changes; stage only exact article files and a newly created context file. Verify the article, title, description, canonical, headings, complete body, links, media, social metadata, structured data, index and sitemap on the custom domain. IndexNow is last: preview, verify live prerequisites without logging the ownership key, then explicitly send. HTTP 200 means submitted; HTTP 202 means key validation pending. Neither proves indexing.
