# Marketplace Moguls Services website

Static HTML, CSS and JavaScript site for the 3PL warehouse in Bolingbrook, IL. It uses a small PHP backend for form email and the price admin. The plan is to convert it to WordPress once the design is final.

## Pages

| File | Page |
| --- | --- |
| `index.html` | Home |
| `services.html` | Services and Pricing |
| `bundles.html` | Variety Pack and Bundle Building (with bundle form) |
| `grocery.html` | Grocery and CPG |
| `calculator.html` | Cost Calculator (with Request Exact Quote) |
| `quote.html` | Get a Quote and Contact |
| `admin.html` | Price and settings editor (not linked, set to noindex) |

## Where prices live

All prices are stored in `data/prices.json`. Business details such as the phone, address and the inbox that receives form emails are in `data/settings.json`. None of these values are fixed in the page code. Every page and the calculator read them when the page loads.

You can edit them at `/admin.html`. The admin is protected by a password:

1. On the server, create `api/config.local.php`. It is ignored by git, so the password never ends up on GitHub:
   ```php
   <?php define('MM_ADMIN_PASSWORD', 'pick a long password');
   ```
2. Make sure PHP can write to the `data/` folder.
3. Open `/admin.html`, enter the password, edit and save.

Leave any price empty and the site shows "Price coming soon" or "Custom quote" in its place. Variety packs show as base price plus building fee (for example $2.50 + $0.90); both parts are editable in the admin.

## Form emails

The quote form, bundle form and calculator all post to `api/send.php`. That script emails the submission to `quoteRecipient` from `data/settings.json`, with the customer's address set as Reply To. It uses PHP `mail()`, which most shared hosts support. Set `MM_FROM_EMAIL` in `api/config.php` (or in `config.local.php`) to an address on your own domain so the messages don't go to spam.

## Warehouse video

The home page shows a 16 second warehouse clip made from two Pexels stock videos. See `assets/video/README.md` for how to swap in your own footage. The clip plays muted on a loop, only while it is on screen, and has a pause button. The Variety Packs page has a second video slot (`assets/video/grocery-pack.mp4`); until that file exists, the page shows the 3D pack animation instead.

## Run locally

```
php -S localhost:8000
```

Then open http://localhost:8000. Opening the HTML files directly from disk will not load prices, because browsers block `fetch` on `file://`.

## Design notes

Before building, I looked at what makes people decide a site was made by AI, and avoided those patterns:

* No purple or blue gradients, no glassmorphism, no particle or blob backgrounds. The palette comes from the logo: orange, charcoal and a warm cardboard tone.
* No Inter everywhere. Headings use Barlow Condensed (it reads like warehouse signage), body text uses Barlow, and labels and prices use IBM Plex Mono.
* Not every section is a centered stack of three rounded icon cards. Sections use rows, tables, numbered lists and a timeline.
* No fake testimonials, logo strips or invented stats. Every number on the site comes from the brief.
* Copy is specific: real prices, a real address, the 24 hour promise. No buzzwords, no hyphens and no em dashes.
* Every button and form actually does something.

The 3D effects use CSS 3D transforms only, with no WebGL library:

* Home: a warehouse with a pallet rack, a moving conveyor and an outbound pallet. It tilts as you move the pointer.
* Variety packs: single products slide together into a shrink wrapped pack.
* Calculator: a carton that resizes in 3D as you type the product size.
* Price and fact panels lean slightly toward the pointer.

All motion stops for visitors who have reduced motion turned on in their system settings.

## WordPress conversion

When the design is final:

* The header and footer become `header.php` and `footer.php`. Each page becomes a page template.
* `data/prices.json` and `data/settings.json` move to an options page in the WordPress dashboard. The front end script can read the same JSON shape from a small REST endpoint.
* `api/send.php` becomes a `wp_mail` handler, so an SMTP plugin can deliver the email.
