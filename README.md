# Lumia International Spa — Website

Plain HTML/CSS/JS static site. No build step, no framework, no npm install —
edit the files directly and deploy.

## Structure

```
index.html          Home
services.html        Services
about.html            About Us
appointment.html      Book an appointment
css/style.css         All shared styling (hover states, animations, mobile layout)
js/main.js            All page behavior (GSAP scroll animations, carousels, booking wizard)
assets/img/           Photos, named for what they show (not tracked by page)
```

Each page's own `style="..."` attributes hold its layout and colors directly;
`style.css` only supplies what inline styles can't (hover/focus states,
keyframes, and the mobile-responsive overrides).

Fonts (Comfortaa, Material Symbols) and GSAP/ScrollTrigger load from CDN links
in each page's `<head>`/before `</body>` — nothing to install or update.

## Before going live

`js/main.js` holds the spa's WhatsApp number:

```js
const WHATSAPP_NUMBER = '919019663937';
```

This is the number the "Request appointment" button on the booking page sends
guests to on WhatsApp, with their booking details pre-filled in the message.

## Deploying

Live on **Cloudflare Pages** at https://lumiainternationalspa.com, built from
this repo's `master` branch — push and it redeploys, no build command. The
GitHub Pages workflow in `.github/workflows/deploy.yml` still runs in parallel
and publishes the same commit to the `github.io` URL.

One difference between the two hosts: Cloudflare Pages 308-redirects
`/services.html` to `/services`, GitHub Pages does not. The internal links stay
written as `services.html` so both hosts work; on Cloudflare that costs one
redirect per navigation. The `<link rel="canonical">` tags and `sitemap.xml`
use the extension-less form, which is what Cloudflare actually serves — so
Google indexes the Cloudflare copy and treats the GitHub Pages one as a
duplicate of it.

### Files that only matter to the host

```
_headers        Cloudflare-only: security headers + cache lifetimes. Ignored elsewhere.
robots.txt      Points crawlers at the sitemap.
sitemap.xml     The four pages. Update <lastmod> when content changes materially.
favicon.svg     The one source for the icon; the PNGs below are rendered from it.
favicon-32.png  Fallback for browsers without SVG icon support.
apple-touch-icon.png   iOS home-screen icon (180x180).
assets/img/og-cover.jpg  1200x630 link preview, shown when the site is shared on WhatsApp.
```

Photos are **not** content-hashed, so `_headers` gives browsers a one-day
cache and Cloudflare's edge a long one (the edge is purged on every deploy).
To force an instant refresh of a changed photo, rename the file.

The `DaySpa` record in `index.html`'s `<head>` is what Google reads for local
search. It deliberately carries no `streetAddress` or `postalCode`, because the
site itself never states one — if you add an address to the footer, add it
there too, or the two sources will disagree.
