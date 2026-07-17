---
name: svg-vector-editor
description: Use SVG Vector Lab's browser tools to inspect, load, sanitize, and frame SVG artwork locally in the user's browser.
---

# Use SVG Vector Lab

Use this skill when a user wants to inspect or load SVG markup in SVG Vector Lab at https://svgvectorlab.com/.

## Browser tools

- `get_current_svg` returns the current sanitized SVG markup.
- `set_svg_markup` replaces the drawing with a complete SVG string after the editor sanitizes unsafe content.
- `load_sample_svg` restores the built-in sample artwork.
- `fit_svg_to_view` fits and centers the drawing in the editor canvas.

## Safety

Treat SVG supplied by users or websites as untrusted. The editor removes scripts, event-handler attributes, and unsafe URLs, but agents should still avoid inserting external resources unless the user requested them. Artwork and autosave data remain in the browser; there is no upload API or account system.
