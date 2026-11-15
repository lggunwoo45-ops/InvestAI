# AdSense connection — 2026-11-15

## Observable completion criteria

- Existing Market Copilot routes continue to load, with the publisher verification meta tag in the delivered HTML. The `/InvestAI/` path and storage/provider identifiers are compatibility identifiers, as specified in the project README.
- The account root `https://lggunwoo45-ops.github.io/` serves a real, useful public entry page, and `/ads.txt` serves the matching publisher record as text.
- AdSense confirms ownership and shows an explicitly observed review status. A deployed meta tag alone is not approval.
- Ad requests stay off until review, the service privacy/contact disclosures and consent setup are ready. Existing paid-plan previews remain previews.

## Verified state

- The logged-in AdSense onboarding screen exposes publisher ID `pub-6900369987335133` and says payment information was confirmed. No additional personal verification or ad approval is inferred.
- The production application is at `/InvestAI/`. The account root and `/ads.txt` now return 200. Both root and app contain the matching ownership meta tag.
- The user's November 15 AdSense screenshot confirms the site connection and review submission: it says all steps are completed and the site's advertising eligibility is under review. No advertising approval has been observed. Privacy disclosures remain an outstanding preparation item despite the submitted review.
- This change adds only the official ownership meta tag to the app. It makes no ad requests, adds no tracking cookies, and does not enable Auto ads.
- The public root repository was published at `3602cbc65ff0e0d507308f3ba7b9272c8d958e9d` before this contact update. It is a separate Pages site from the application deployment.
- The user reconfirmed **Market Copilot** as the public product name. Restore it in app wordmarks, titles, account copy, reports, notifications and mock-news labels; preserve URLs, member/device record keys and provider IDs.
- The user supplied the dedicated public support address `info.marketcop@gmail.com`. This update places it on the root page, app guide and plans page. It is independent of the existing AdSense login; never derive or publish the personal login address from that session.
- On November 15 the user requested approval preparation and answered that the public operator/business name is undecided. Do not invent an operator identity, named privacy officer or business registration.

## Public reading and disclosure preparation

- Six additional static pages: `/about/`, `/privacy/`, `/guides/` and three substantive guides covering price levels, missing data and records/costs. These are user-facing instructions, delivered as HTML without an app login or JavaScript dependency.
- The app's simple/mobile menu, expanded expert sidebar, user guide and login/signup form link to the public information. External guides open separately so typed account details stay in the app.
- Root navigation, canonical links, `robots.txt` and `sitemap.xml` cover the reading pages. Public-page tests check destinations, anchors, unique IDs, route existence, publisher identity and absence of ad scripts.
- Source audit: account IDs and credential/recovery hashes; 12-hour bearer sessions and pending edits in session storage; guest data/preferences in local storage; member records and monitoring in SQLite; optional email/Telegram tables. Current public email and Telegram delivery are not configured. Full-account erasure is not exposed by the current server API. Do not claim an automatic account deletion button or a verified retention schedule.
- Optional position connections also process public wallet/account identifiers or exchange API credentials in an encrypted vault, together with position/risk observations. The current Railway member server and attached volume were verified in Singapore (`asia-southeast1-eqsg3a`) on November 15; this does not establish every provider's processing location or log/backup retention.
- `/privacy/` is an honest current data-processing guide, including the Google cookie disclosures and opt-out links that would apply when ads are enabled. It explicitly does not claim to replace a completed service privacy policy. Operator identity/responsible contact, retention/erasure operations (including support mail and backups), provider roles and international-transfer details remain to be factually finalized. Ads remain disabled until this and applicable consent setup are ready.
- Browser audit of the current public app: Upbit BTC live market chart; market-to-analysis preserved `upbit-btc`/KRW, with three available timeframes and actual calculation output; news displayed 45 source-linked items. This verifies these journeys, not every indicator, all providers, account delivery or commercial readiness.

Rebuild static pages with `node tools/build-public-pages.mjs` after editing their source; run `node --test tools/public-pages.test.mjs`. Publish all generated public files together to avoid temporary broken links. Keep code, internal readiness notes and private operator details out of the root site's publication manifest.

## Root publication

The root repository and Pages configuration already exist. For future updates:

1. Check the current `lggunwoo45-ops/lggunwoo45-ops.github.io` revision before updating it. Do not publish any personal documents or credentials.
2. Copy the public contents of this repository's `site-root/` directory into that repository's root: HTML pages, `robots.txt`, `sitemap.xml`, `ads.txt` and `.nojekyll`. No application build, source tools or personal records are included. Preserve unrelated existing root-repository files.
3. Preserve its existing Settings → Pages configuration: Deploy from a branch → `main` → `/ (root)`.
4. Verify the root and `/ads.txt` return 200. Follow the page links into the existing application and inspect both narrow and desktop widths. The existing `/InvestAI/` deployment remains independent.

The copy in `frontend/public/ads.txt` serves `/InvestAI/ads.txt`; **it does not satisfy domain-root ads.txt discovery by itself**.

## AdSense account steps after the root is live

1. Add `lggunwoo45-ops.github.io` as the site, without `/InvestAI/`.
2. Select the meta-tag verification method and confirm the published tag matches this account.
3. Complete the publisher's privacy disclosures before requesting review; this preparation page's data explanation is not represented as a complete service privacy policy. The dedicated support address is now provided, but operator identity and service privacy disclosures still require factual confirmation.
4. Request review only after the public root and the policy pages are ready. Record Google's actual status and any reason returned.
5. Before enabling ads, configure applicable consent messages and deliberate placements. Do not automatically enable site-wide Auto ads: application views, preview tiers, eventual verified paid entitlements and sensitive account/record screens need separate placement rules. Never refresh ads on chart ticks or solicit clicks.

The root HTML is a useful service introduction and original reading guide, not a forwarding-only page. It links to current app features and accurately distinguishes unpaid beta/plan preview from a paid service. It contains the user-provided support email, without invented business registration, privacy officer, testimonials or performance claims.

## Official references

- https://support.google.com/adsense/answer/7584263?hl=ko — meta tag, root ads.txt, verification and review are separate steps.
- https://support.google.com/adsense/answer/12170421?hl=en — public-suffix platform subdomains can be added as sites; github.io is on https://publicsuffix.org/list/public_suffix_list.dat. This eligibility does not guarantee site approval.
- https://support.google.com/adsense/answer/1348695?hl=ko — privacy disclosures for Google/third-party advertising cookies and ad personalization controls.
- https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site — user-site repository naming and publishing.
