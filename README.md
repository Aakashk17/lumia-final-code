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

Any static host works — Cloudflare Pages, Netlify, GitHub Pages, or a plain
web server. Point it at this folder's root (`index.html` is the homepage) with
no build command.
