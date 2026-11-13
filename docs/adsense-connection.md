# AdSense connection — 2026-11-13

## Observable completion criteria

- Existing InvestAI routes continue to load, with the publisher verification meta tag in the delivered HTML.
- The account root `https://lggunwoo45-ops.github.io/` serves a real, useful public entry page, and `/ads.txt` serves the matching publisher record as text.
- AdSense confirms ownership and shows an explicitly observed review status. A deployed meta tag alone is not approval.
- Ad requests stay off until review, the service privacy/contact disclosures and consent setup are ready. Existing paid-plan previews remain previews.

## Verified state

- The logged-in AdSense onboarding screen exposes publisher ID `pub-6900369987335133` and says payment information was confirmed. No additional personal verification or ad approval is inferred.
- The production application is at `/InvestAI/`. The account root returned 404, and no `lggunwoo45-ops.github.io` repository was visible through the connected GitHub account at preparation time.
- Browser screen capture/control timed out. No site was submitted to AdSense in this session.
- This change adds only the official ownership meta tag to the app. It makes no ad requests, adds no tracking cookies, and does not enable Auto ads.

## Root publication

GitHub's connected tools can edit the existing repository but do not expose repository creation or Pages configuration. If the root repository is still absent:

1. Create a **public** repository named exactly `lggunwoo45-ops.github.io` under `lggunwoo45-ops`. Do not publish any personal documents or credentials.
2. Copy the contents of this repository's `site-root/` directory into that repository's root. These are the three files `index.html`, `ads.txt`, and `.nojekyll`; no application build or personal records are included.
3. In its Settings → Pages, use Deploy from a branch → `main` → `/ (root)`.
4. Verify the root and `/ads.txt` return 200. Follow the page links into the existing application and inspect both narrow and desktop widths. The existing `/InvestAI/` deployment remains independent.

The copy in `frontend/public/ads.txt` serves `/InvestAI/ads.txt`; **it does not satisfy domain-root ads.txt discovery by itself**.

## AdSense account steps after the root is live

1. Add `lggunwoo45-ops.github.io` as the site, without `/InvestAI/`.
2. Select the meta-tag verification method and confirm the published tag matches this account.
3. Complete the publisher's privacy/contact disclosures before requesting review; this preparation page's data explanation is not represented as a complete service privacy policy. The currently published app still says its support intake channel is in preparation.
4. Request review only after the public root and the policy pages are ready. Record Google's actual status and any reason returned.
5. Before enabling ads, configure applicable consent messages and deliberate placements. Do not automatically enable site-wide Auto ads: application views, preview tiers, eventual verified paid entitlements and sensitive account/record screens need separate placement rules. Never refresh ads on chart ticks or solicit clicks.

The root HTML is a useful service introduction and original reading guide, not a forwarding-only page. It links to current app features and accurately distinguishes unpaid beta/plan preview from a paid service. It intentionally contains no invented business registration, support email, privacy officer, testimonials or performance claims.

## Official references

- https://support.google.com/adsense/answer/7584263?hl=ko — meta tag, root ads.txt, verification and review are separate steps.
- https://support.google.com/adsense/answer/12170421?hl=en — public-suffix platform subdomains can be added as sites; github.io is on https://publicsuffix.org/list/public_suffix_list.dat. This eligibility does not guarantee site approval.
- https://support.google.com/adsense/answer/1348695?hl=ko — privacy disclosures for Google/third-party advertising cookies and ad personalization controls.
- https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site — user-site repository naming and publishing.
