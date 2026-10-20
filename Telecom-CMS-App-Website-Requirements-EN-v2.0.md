# Telecom CMS — Mobile App & Corporate Website
Draft v2.0 | 20 October 2026


## 1. Document Control & Reference Status


Field | Value

Document | CR-TELCO-2026-002 — Telecom CMS, mobile app and corporate website

Edition | Version 2.0, expanded English design/requirements draft

Date / owner | 20 October 2026 / named business and technical owners to be assigned

Audience | Product, content, marketing, mobile, web, backend, data, QA and operations

Scope status | Target requirements for estimation and approval; not proof that any capability is already implemented.

Relationship to previous version | Expands the Arabic Home Page/CMS proposal into an English multi-channel specification. Existing notification requirements are incorporated at product level.

Brand / examples | TELCO is a placeholder. Mockup values are illustrative. The concepts are not official MTN or Zain designs.

### Reference availability and completion gate


Reference | Available status | Handling

Earlier telecom app Home Page examples | Previously visible visual references | Used for general hierarchy and self-care patterns only.

MTN mobile CMS examples mentioned by the requester | Not received in the currently accessible attachments | No claim that their screens, fields or workflows were inspected.

MTN website CMS examples mentioned by the requester | Not received in the currently accessible attachments | Detailed mapping and any reference-specific gaps remain pending.

New Home Page concepts | Included in this package | Original illustrative proposals for comparison, not implementation screenshots.

NOTE: Reference review pending: this is a complete generic scope draft for the requested channels. Before claiming MTN-reference coverage, the team must receive the source examples, inventory their screens/modules, map them to requirement IDs and resolve documented gaps. Private screenshots and customer data must not be included in public deliverables.

Requirement levels: MUST is required release scope once approved; SHOULD is recommended; Proposed / TBC is a decision awaiting a named owner. Features dependent on absent operator services remain conditional scope, not assumed live capability.


## 2. Objectives, Scope & Channel Boundaries

Provide one governed CMS for reusable editorial content and approved presentation configuration across the telecom mobile app and corporate website. Give customers a clear view of their line and services while enabling teams to publish relevant content without changing financial or network records.


In scope | Target outcome

Shared CMS | Structured content, media, localization, audience rules, versioning, approval, scheduling, rollback and audit.

Mobile self-care app | Contextual Home Page, product/service discovery, account-summary presentation, approved navigation and links into operator journeys.

Public corporate website | Individuals/business pages, product/service pages, support, branches, campaigns, editorial pages, navigation, search and SEO.

Notifications and reporting | Campaigns, recipient upload, automatic event templates, dispatch outcomes, usage telemetry and content performance.

Authenticated web self-care | Optional channel: include only if confirmed; must reuse operator identity, authorization and live-data APIs.


Excluded unless separately approved | Boundary

Financial/network execution from CMS | Recharge, payments, subscription activation, number ownership, KYC and network provisioning remain operator services.

Replacing existing customer authentication | The current operator login and registration remain authoritative.

New SMS/email/USSD channels | Not implied by mobile push scope.

New billing engine, e-commerce fulfillment or partner wallet | CMS may promote/reference these services; operating them needs separate systems and contracts.

Unrestricted UI code injection | CMS chooses supported components/routes; it does not execute arbitrary scripts in the app or site.

Unlimited free hosting / guaranteed push receipt | Capacity and cost must be measured; delivery depends on provider, OS and device conditions.

Success measures: faster controlled content changes, accurate self-care information, improved discovery/conversion, reduced support friction, measurable campaign outcomes, and safe separation of customer data from editorial operations.


## 3. Mobile App Information Architecture


Area | CMS responsibilities | Operator source / business action

Home | Layout, greetings, section configuration, banners, quick actions and product shelves. | Verified line context, balance/bill, allowances, active plans and preferences.

Bundles | Category labels, editorial descriptions, images, order, collections and product references. | Catalogue IDs, final price/tax, availability, compatibility, eligibility, purchase and renewal.

Recharge & Payments | Explanations, help, approved method labels and journey entry points. | Payment authorization, top-up execution, bill settlement, confirmation and receipts.

Usage | Labels, unit presentation and explanatory content. | Consumption, remaining allowances, period boundaries and freshness.

My Line / Number Management | Guidance, supported service shortcuts and state-specific content. | Ownership, delegated lines, profile, line status and allowed changes.

Roaming | Destination content, travel tips and promoted eligible products. | Country availability, roaming status, pricing, activation and charging.

SIM / eSIM | Instructions, FAQs, entry cards and supported device information. | Identity verification, device compatibility, issuance, activation and request state.

Offers & Recommendations | Creative, placement, audience, validity and approved offer references. | Actual offer eligibility, final commercial terms and redemption.

Loyalty & Rewards | Programme pages, promotional cards and editorial presentation. | Points, tier, entitlement and redemption ledger.

Store / Devices | Product stories, image galleries, landing pages and merchandising. | Stock, final prices, checkout, delivery and order state.

Partner / Value-added Services | Approved partner cards, content and destination links. | Partner identity/SSO, subscription, charging and fulfillment.

Notifications / Inbox | Campaigns, templates, categories, preferences content and editorial messages. | Verified events, device binding, delivery and synchronized inbox if implemented.

Help / Branches / Settings | FAQ, articles, contact content, store information and legal documents. | Tickets, identity/security settings, consent records and account changes.

Conditional areas such as loyalty, store and eSIM are enabled only when their real services and approved journeys exist. Do not publish dead commercial buttons or imply availability from content alone.


## 4. Corporate Website Information Architecture


Website area | Required CMS management

Global shell | Header, country/language selector if applicable, customer-type navigation, search, account/app entry points and footer.

Website Home | Hero, campaign slots, top services, product shelves, benefits, support/branch entry points, app download and essential announcements.

Individuals / Consumer | Prepaid, postpaid, mobile data, home internet, bundles, roaming, add-ons and eligible product discovery.

Business / Enterprise | Business lines, connectivity, IoT/cloud/managed-service content only where offered, case studies and sales-contact journeys.

Product / Service Detail | Structured features, eligibility explanations, catalogue references, pricing source, terms, FAQs, related content and approved actions.

Offers / Campaign Landing Pages | Reusable responsive landing templates, audience/channel variants, scheduling, terms and trackable approved CTAs.

Help Centre | FAQ taxonomy, articles, guides, troubleshooting, contact options and approved ticket/complaint entry points.

Branch / Dealer Locator | Location records, hours, service tags, map reference, accessibility information and verified contact details.

About / Corporate | Company profile, leadership/editorial profiles, sustainability, careers, media centre and investor content where legally applicable.

News / Media / Documents | Versioned articles, categories, dates, accessible downloads and controlled document assets.

Legal / Privacy / Accessibility | Localized versioned notices, effective dates, cookie information and accessibility statements.

Search / Error / Maintenance Pages | Search results presentation, 404/410/maintenance content and navigation to useful alternatives.

Web self-care portal | Conditional scope: customer-authenticated pages and read/action journeys through operator APIs, not editable customer records.

### Shared vs channel-specific

Reuse approved content entities and media across app and web, with optional channel overrides. Do not force a desktop hero into an unsuitable mobile component. Each channel owns supported component rendering, navigation, responsive behavior and capability checks.


## 5. Source of Truth & Content Ownership


Data or behavior | Authoritative owner | CMS may manage

Customer/line identity and access | Operator identity/CRM and verified sessions | Labels, guidance and state-specific help; never arbitrary ownership edits.

Balance, validity and billing | BSS/OCS/Billing | Card presentation and supported field labels; not numeric balances.

Usage / active bundles | Usage and subscription services | Visual layout, unit explanations and empty-state content.

Final price, tax and eligibility | Approved commercial catalogue / charging systems | Product references, badges and editorial descriptions; revalidate before confirmation.

Loyalty points / rewards | Loyalty service | Programme content and approved reward promotion.

Payments / recharge / activation | Authorized transaction backends | Journey entry points and explanations; no execution through content edits.

Editorial copy / media / layout | CMS | Create, localize, target, approve, publish, version and expire.

Usage observations | Instrumented app/site with verified or approved anonymous identity | Authorized aggregate or individual reports under approved retention/access.

NOTE: Mandatory rule: an editor must never be able to change a customer balance, invent an allowance, bypass offer eligibility or silently change a contracted price by editing a card. If the organization makes CMS the official commercial catalogue, that requires a separately approved integration and pricing-governance workflow.

### Personal data and caching

Separate public content configuration from private customer data. Public CDN caching must not contain an account’s balance, line list, invoices or personal offers. Last-known content and last-known customer data have different expiration and security policies.


## 6. Mobile Home Page: Anatomy & Requirements


ID / component | Customer experience | CMS / live-data split

APP-H01 — Header & line selector | Brand, profile, notifications, authorized current line. | CMS brand assets/labels; line ownership and unread personal counts from backend.

APP-H02 — Greeting / context | Localized greeting, safe display name and prepaid/postpaid state. | Approved greeting template; real identity resolved from session.

APP-H03 — Account summary | Prepaid balance/validity or postpaid due amount/billing period. | CMS card configuration; financial values from operator systems.

APP-H04 — Allowances | Explicit remaining/total data, minutes and SMS with readable units. | Supported labels/appearance; actual quotas and period from usage APIs.

APP-H05 — Primary actions | Recharge/pay and usage details within immediate reach. | Approved action labels/routes; protected transaction journey remains native/backend.

APP-H06 — Active plan / empty state | Current package and expiry, or clear no-active-plan CTA. | CMS state templates; subscription truth from backend.

APP-H07 — Quick actions | A manageable set such as recharge, bundles, gift and roaming. | Editable order/icons/labels among supported routes and eligible services.

APP-H08 — Offer banner | Relevant creative after core account information. | CMS asset, title, body, audience, priority, valid window and route.

APP-H09 — Product shelf | Eligible recommended plans with details before purchase. | CMS references/order; pricing, eligibility and purchase confirmation from catalogue/backend.

APP-H10 — Loyalty / partners | Optional points, rewards and available partner services. | CMS presentation; points/entitlements and partner SSO remain authoritative.

APP-H11 — Help / service alerts | FAQ/contact and useful outage/maintenance notice. | CMS content and priority backed by an authorized operational source.

APP-H12 — Bottom navigation | Home, Bundles, Recharge/Pay, Offers, More as proposed. | Constrained labels/order among routes supported by the installed app.

The first screen should answer: which line is active, what is its balance/due amount, what remains, what plan is active, and how to recharge/pay. Promotional content must not bury these core tasks. Layout may adapt to screen size and account state while preserving these priorities.


## 7. Mobile Home States & Visual Directions


State | Required behavior

Guest | Public service discovery and login/register entry; no private profile, balance, points or personal notification count.

Prepaid | Balance, validity, active allowances and recharge.

Postpaid | Amount due, due date/billing context and payment; avoid prepaid terminology.

No active bundle | Honest empty state and explore-plans action; no fabricated usage bars.

Low balance / expiring plan | Contextual warning from trusted data, appropriate next action and limited emphasis.

Multiple authorized lines | Switch line context, clear incompatible cached private views and recalculate eligibility.

Suspended/inactive line | Approved explanation and recovery/help; hide unavailable commercial actions.

Offline / partial failure | Last known permitted data with freshness indicator, or a clear unavailable state; never convert an API failure into a zero balance.

### Three proposed visual directions


Concept | Design / use case

A — Yellow & Graphite | Bold, high-contrast prepaid Home. Yellow hero; graphite primary accents; simple white cards.

B — Mint & Teal | Calm postpaid Home. Soft green/teal hero; explicit amount due and Pay bill action.

C — Violet & Cyan | More expressive prepaid Home without an active plan; empty-state discovery and strong product promotion.

Full-size example screens are included in the final appendix and as standalone PNG files. TELCO is a placeholder, not the proposed legal brand. Colours, typography, iconography, terminology and accessibility must be approved against the operator’s actual brand system.

Weather/location or decorative seasonal hero content is optional. It needs a real source and a business purpose; precise device location is not required merely to decorate Home. Search may be added where it improves service discovery.


## 8. Corporate Website Home Page


Slot | Content and actions | Required rules

Utility / main navigation | Brand, language/market, Individuals/Business, search, help, account and app links. | Accessible keyboard/RTL menus; correct market and route; permissions for authenticated links.

Hero campaign | Image/video alternative, headline, short copy and one primary CTA. | Responsive crops/alt text; bounded media weight; scheduled validity and safe fallback.

Task shortcuts | Recharge, pay, explore bundles, usage/account sign-in, support. | Links into working approved web/native journeys, not editorial financial execution.

Product / service categories | Prepaid, postpaid, internet, roaming and other live services. | References to approved category/catalogue IDs; eligibility/pricing source respected.

Featured offers | Limited relevant offer cards and landing pages. | Correct terms, validity, audience, current prices and canonical detail pages.

Business / partner shelf | Business solutions or approved partner discovery. | Only genuinely offered services and configured market availability.

App download / digital benefits | App-store links, QR where appropriate, benefits and app screenshots. | Verified official destinations and accessible alternative text.

Support / branches / announcements | FAQ entry, locator, contact and essential operational notice. | Useful priority, updated records and approved source for service status.

Footer | Contact, corporate links, legal/privacy/cookies, social and accessibility. | Localized links, versioned legal pages and valid approved domains.

WEB-H01: the anonymous website Home is normally a public marketing/service-discovery page. It must not render personal financial data through a public cache. A separately scoped authenticated portal may add account widgets only after verified login and authorization.

### Responsive and publishing expectations

Provide desktop/tablet/mobile previews; preserve hero readability, valid click targets and useful navigation without horizontal body overflow. Publishing a common campaign across app/site should link its shared content entity while allowing suitable channel variants and previews.


## 9. CMS Workspace & Page Builder


ID | Required capability

CMS-01 | Central workspace: Dashboard, Pages/Navigation, Component Templates, Products/Offers, Media, Audience Rules, Notifications, Help/Branches, Analytics, Users/Roles, Audit and Settings.

CMS-02 | Page list with channel/site/market, language, owner, status, version, last update, published/scheduled dates and search/filter.

CMS-03 | Component palette, ordered page canvas, property panel and live device/browser preview. Add only components registered for the target channel and app version.

CMS-04 | Reorder optional sections, set visibility and audience, configure content and defaults, and preserve required account/navigation components according to product rules.

CMS-05 | Preview guest/prepaid/postpaid/no-plan/offline and other supported contexts with synthetic data; do not need unrestricted real customer impersonation.

CMS-06 | Draft, duplicate, compare changes, validate, submit, approve, schedule, publish, expire/unpublish and roll back without erasing history.

CMS-07 | Warn/block broken routes, unavailable assets, invalid fields, missing required locales, unsupported versions and conflicting mandatory placements.

CMS-08 | Show where reusable blocks/assets are used. Shared changes must show affected pages/channels and use the appropriate approval gate.

The UI should use a dark sidebar, clear content cards and a restrained operator-approved accent. Separate editorial controls from read-only integration values. State badges, change history, review notes and publish impact must be visible without implying a permission the user does not have.

### Dashboard, list views and operator controls


Workspace area | Required presentation and actions

Global shell | Role-filtered navigation; global search; selected environment/site/market/locale; user profile; pending approvals and system health. Persistent filters must never hide the active environment.

Campaign list | Name/ID, category, audience, distinct customers/devices, author, schedule/timezone, status and last update. Search/filter, inspect results, duplicate, cancel unsent work and explicit linked resend where permitted.

Content list | Page/block title, slug, channel, locale, owner, version, review state, publication/expiry date. Open editor, preview, compare and view history according to permission.

Customer directory | Masked phone/name and immutable customer ID; authorized lines, consent/preferences, last seen, device counts and token health. Search by number or subscriber ID; scoped profile, notification timeline and permitted session drill-down.

Staff administration | Create/invite, role and scope assignment, active/suspended state, last login, MFA status and session revocation. Separate staff accounts from customer identities; audit every grant.

Analytics dashboard | Date/timezone and channel/audience filters; KPI cards, time series, funnels, content tables and permitted exports. Display freshness, missing instrumentation and metric definitions beside results.

### Minimum dashboard KPI definitions


KPI | Calculation / interpretation

Content operations | Published pages and scheduled releases by channel/locale; pending reviews and validation failures. Counts reflect the selected site and time window.

Audience reach | Distinct eligible customers selected, eligible devices and provider-accepted customers are separate counts; none proves a person read the message.

Activity | DAU/WAU/MAU = distinct authenticated customer IDs with qualifying foreground activity in each explicit window. Sessions use a proposed 30-minute inactivity boundary and explicit session IDs.

Average screen duration | Sum of valid foreground screen intervals / number of measured screen visits. Show coverage and excluded/inferred intervals; background time is excluded.

Campaign CTR | Distinct tracked accepted delivery IDs opened / matching accepted delivery IDs. Label this as observed notification-open rate; report total opens separately.

Content CTR | Qualified tracked clicks / qualified visible impressions for the same content version and cohort; also show unique users and suppress undefined zero-denominator rates.

Conversion | Distinct confirmed completing customers / distinct eligible exposed or clicking customers in the explicitly chosen attribution window. Specify denominator, window and attribution rule.

Reliability | Accepted, failed, unknown and expired delivery counts; API error rate, queue delay, configuration failures and source-data freshness. Never present provider acceptance as device delivery.

Charts must use real measured values, explicit units, date/timezone, legend and accessible tabular alternatives. Empty data shows an empty state, not illustrative production statistics. Dashboard navigation and export actions obey the same permission scopes as the source records.


## 10. Structured Content Model & Fields


Entity | Minimum fields / behavior

Site / channel | Site/channel key, market, default/fallback locale, domain references, brand tokens and supported schema.

Page | Stable page ID/key, title, parent/path for web, channel/market, locales, template, audience, version/state and publication window.

Section instance | Stable section ID, component type/schema version, ordering/slot, enabled/required flags, audience rule, content references and fallback.

Localized content | Title, short/long copy, CTA labels, alt text and required locale coverage; approved variables only.

Media asset | Stable ID, type, dimensions, size, optimized variants, alt text, ownership/rights, expiry, tags and references.

Product/offer reference | Authoritative product/offer ID, editorial badge/description, display order, promotion window and commercial source mapping.

Route/action | Action ID, registered route or allowed HTTPS target, permitted parameters, authentication and supported app/channel version.

Audience rule | Verified traits, allowlisted predicates, priority, validity, defaults and rule version.

Workflow record | Creator/reviewer/publisher, reasons, diff, status, approval version and audit correlation.

Web SEO metadata | Localized slug/title/description, canonical/hreflang, indexability, structured-data fields and redirect history.

Validate through a versioned schema. Stable IDs survive copy changes and translation. Rich text must be sanitized and rendered through supported presentation rules; no arbitrary JavaScript/CSS or hidden authentication parameters in editorial content.


## 11. Product Catalogue, Offers & Commercial Journeys

- CAT-01: Synchronize or reference product IDs, category relationships, availability and displayable commercial facts through an agreed catalogue integration.

- CAT-02: Allow editorial merchandising: collections, ordering, cards, images, labels and localized explanations, without overriding a commercial source through free text.

- CAT-03: Before confirmation, fetch final price/tax, allowances, validity, compatibility, eligibility, auto-renewal and cancellation terms from the approved source.

- CAT-04: If a displayed cached value differs from current commercial data, update it clearly before the customer confirms. Visiting an offer must not itself purchase/charge.

- CAT-05: Separate editorial enablement from service operational availability. Do not publish an eSIM/roaming/partner action without a functioning and authorized journey.

- CAT-06: An official commercial-catalogue role, if desired, requires distinct pricing permissions, validation, audit and downstream propagation; it is not a normal content-editor capability.

### Offer fields and lifecycle

Internal name, offer/catalogue reference, channel/market, localized creative, audience, priority, start/end/timezone, disclosure/terms link, approved action, optional frequency cap and tracking IDs. Expired offers return a valid fallback or disappear without breaking navigation.

### Web/device-store boundary

CMS may manage category pages, device images and merchandising. Stock reservation, financing, checkout, order processing, tax and fulfillment require actual commerce services and are conditional scope. Separate a product-information page from a transactional order system.


## 12. Media, Banners & Editorial Libraries

- MED-01: Provide folders/tags/search, approved file types, size/dimension rules, accessible alt text, ownership/rights and asset usage reporting.

- MED-02: Support device-appropriate responsive image variants and lazy loading below the initial viewport. Video is optional and requires a suitable lightweight fallback.

- MED-03: Prevent deletion/replacement that breaks published references; support asset versions and show affected pages.

- MED-04: Banner fields include headline, supporting copy, creative, CTA, destination, audience, priority, schedule/timezone, min app version and fallback.

- MED-05: Configure bounded carousel length and rotation. Avoid aggressive auto-rotation, hidden essential information or mandatory interaction to access account tasks.

- MED-06: Validate file format/content and bounded processing. Do not accept executable content, unsafe SVG/scripts or arbitrary embedded third-party code as ordinary media.

Actual pixel ratios, maximum byte sizes and maximum items per slot are design/engineering decisions to confirm using target devices and measured network conditions, not untested fixed performance claims.


## 13. Audience Rules, Personalization & Experiments


Audience dimension | Source / constraint

Line type / status | Verified operator account context, including prepaid/postpaid, active/suspended and permitted delegates.

Product / lifecycle | Current plan, no active plan, expiring subscription and approved lifecycle state from backend.

Locale / market | Customer preference or approved public site selection with a safe fallback.

Platform / version | Supported app/platform capability, not an editor’s assumption that a new screen exists.

Region / roaming | Allowed operator context; precise device geolocation only if separately needed/approved.

Marketing preference | Verified consent/category preferences; distinguish transaction/security categories.

- AUD-01: Resolve private traits on the backend from verified identity; do not accept a client-chosen customer ID as authority.

- AUD-02: Define deterministic priority and conflict resolution, display caps and global/channel/segment fallbacks. An empty/unmatched target must never become an all-customer audience.

- AUD-03: Avoid personalized content before login. Re-evaluate on line/account change and commercial action; eligibility may change after a card was rendered.

- AUD-04: An optional A/B programme needs stable assignment, defined populations/outcomes, consent/retention decisions and versioned exposure IDs before activation.


## 14. Navigation, Component Registry & App Compatibility

- NAV-01: Maintain a versioned registry of app/web components and routes, permitted fields/parameters, accessibility behavior, authentication rules and fallback support.

- NAV-02: CMS may configure only already supported capabilities. New native screens or components require app implementation/release before they become publishable to compatible versions.

- NAV-03: Validate minAppVersion/schema constraints. Unsupported optional components are safely skipped or replaced; essential account tasks use approved fallbacks.

- NAV-04: Manage app bottom tabs and web menus within product constraints. Protect necessary account/authentication/legal routes from accidental removal.

- NAV-05: Allow approved native routes and verified HTTPS domains/App Links. Reject executable URLs and never pass passwords/session secrets in query strings.

- NAV-06: Deep links into private details require login then entity ownership verification; retain the intended destination only when safe after account changes.

### Example supported component types

```
account_summary | usage_summary | active_bundle
quick_actions | banner_carousel | product_shelf
loyalty_card | support_card | service_alert
web_hero | feature_grid | faq | article | branch_list
```

Registry examples are proposal names. Actual component contracts, availability and compatibility must be agreed between CMS, web and mobile teams.


## 15. Editorial Workflow, Localization & Release Control

```
Draft -> In Review -> Approved -> Scheduled / Published
Rejected -> Revised draft
Published -> Superseded / Archived
Approved / Published -> controlled rollback or unpublish
```

- WF-01: Use explicit roles and per-channel/locale/market ownership. Production author self-approval SHOULD be blocked for high-impact content or bulk campaigns under a configurable policy.

- WF-02: Review a versioned diff, page/device preview, target audience, required locales, assets, routes, schedule and affected shared pages.

- WF-03: Material edits to approved content invalidate approval. Publishing is atomic for the release set; preserve version history and a last-known-good rollback.

- WF-04: Store schedule timestamps in UTC and display an explicit IANA timezone. Validate overlapping campaigns and ambiguous/nonexistent local times.

- WF-05: Track translation status per locale. Required locale fields block publication unless an explicitly approved fallback policy applies.

- WF-06: Stage/sandbox previews use synthetic data and preview authorization; unpublished content must not leak into public search/cache.

- WF-07: Publishing/expiry invalidates relevant cache/search indexes through reliable processes; expose publication progress, errors and recovery state.


## 16. Customer Context, Devices & Preferences

- ID-01: Reuse operator login/registration and immutable customer/line IDs. Customer accounts are separate from CMS staff accounts.

- ID-02: Support switching among only authorized lines. Refresh private account content and clear incompatible cached data when context changes.

- ID-03: Register installation ID and FCM token after verified login; update rotated tokens and last-seen/platform/app version/permission state.

- ID-04: Logout disconnects the relevant device/customer binding; other authorized devices remain active. Account switch must not expose previous customer history.

- ID-05: Denying notifications must not block app login or payments. Permission state and category preferences affect notification eligibility.

- ID-06: Customer support views use masking and scoped permissions. Individual telemetry drill-down and exports require separate authorization; operators cannot edit balances from these screens.

Phone number is a contact/search attribute and can change. It is not a safe permanent identity key. A number file import resolves to verified customer IDs; it must not create accounts or transfer ownership.


## 17. Campaign Notifications, Uploads & Scheduling


ID | Required capability

PUSH-01 | Compose versioned campaigns with title/body, locale, category, approved destination, internal notes and preview.

PUSH-02 | Select all eligible customers, specific numbers/customers, a verified segment, or CSV/XLSX audience upload.

PUSH-03 | Normalize numbers as strings; map columns, deduplicate by customer ID, reject mismatched IDs/numbers and report invalid/unmatched/no-device/preference-excluded entries.

PUSH-04 | Preview final distinct customer and eligible device counts before confirmation; permit explicit sending to the accepted subset only, with no empty-audience fallback broadcast.

PUSH-05 | Support Send Now or future schedule with timezone, approval, permitted editing/cancellation and clear queue status.

PUSH-06 | Freeze reviewed content/customer-ID snapshot. Re-evaluate active devices and current eligibility at dispatch; show any audience drift.

PUSH-07 | Resend creates a new linked campaign and follows approval; preserve the original results and selected customers. Unknown outcomes require controlled acknowledgement before repeating.

PUSH-08 | Provide per-recipient/device results, export under permission and a separate audit trail for uploads, approvals, sends and exports.

Proposed first-release import defaults: CSV/XLSX, up to 10,000 rows and 5 MB, subject to measured plan capacity and business approval. Escape spreadsheet formula prefixes in exports; protect uploads and remove source files according to retention. These are proposed limits, not proof of current hosting capacity.


## 18. Automatic Events & Reliable Delivery Flow


Event | Trusted trigger / recipient

recharge_completed | Confirmed recharge credit; affected line/customer.

bundle_activated / bundle_expiring | Confirmed activation or an authoritative expiry/reminder rule.

allowance_low / allowance_exhausted | Approved threshold event from actual usage services.

invoice_due / invoice_paid | Billing due rule or confirmed settlement.

payment_failed / refund_completed | Final confirmed failure or actual completed refund; not an unknown financial result.

transfer_received | Optional wallet/transfer integration: actual recipient of a confirmed posted transfer, never implicitly the initiating customer.

request_updated / security_alert | Verified request/account-security event with an approved category/template.

### Required automatic flow

- 1. Operator backend confirms the business state and resolves the correct recipient identity.

- 2. Persist the business state and unique notification Outbox event atomically where feasible.

- 3. An authenticated backend worker submits the same event ID on retries to the notification service.

- 4. The service validates source/schema and acknowledges only after durable storage; matching duplicates return the stored event, conflicting reuse is rejected.

- 5. Select the approved/versioned template and eligible recipient devices; no_devices is a recorded outcome, not a fallback broadcast.

- 6. Create duplicate-resistant per-device work, claim it atomically and send through FCM with bounded recovery/retry policy.

- 7. Record accepted/failed/unknown separately from app-observed receipt/open; on tap, authenticate and authorize the target entity.

- 8. Push failure must not reverse, repeat or mark successful a financial/network action.

Retry known temporary failures with backoff, jitter, TTL and Retry-After. Unregistered tokens deactivate. Timeouts after submission may be unknown; do not blindly replay. Campaign traffic must not indefinitely starve transactional events. A synchronized message inbox, if required, needs its own server-side storage and ownership contract.


## 19. Analytics, Metric Definitions & Event Inventory


Metric family | Definition and required interpretation

Content exposure | home_view/page_view, section visibility and versioned banner impressions. Loading an off-screen card is not an impression.

Engagement | Clicks, CTA CTR, product-detail opens and navigation by content/version/channel/audience. Use matching time cohorts and distinct-count definitions.

Conversion | Purchase/recharge/payment started vs confirmed. Successful completion is confirmed by backend, not a click event.

Usage sessions | Authenticated active users, sessions, foreground duration, screen sequence, time per screen and approved named actions.

Notification performance | Queued, sending, accepted, failed, unknown, expired/cancelled/no_devices; observed received/opened as separate evidence.

Operational quality | CMS/configuration failures, unsupported components, API errors, stale-data age, render latency and queue depth.

Website discovery | Search usage/results, landing page engagement, form completion and supported SEO performance integrations.

- ANA-01: Use a maintained screen/action catalogue and versioned event schema. Every in-scope screen/action has an instrumentation and QA owner.

- ANA-02: Proposed impression threshold: at least 50% visible for one continuous second in foreground; deduplicate for content/version/pageViewId. Confirm this policy before measurement.

- ANA-03: Measure screen time by incremental foreground intervals with a monotonic clock, close/checkpoint on navigation/background, and avoid double-counting checkpoints.

- ANA-04: Batch events, queue transient offline work, retry stable event IDs and deduplicate ingestion. Bound local/server retention and document inferred endings or missing coverage.

- ANA-05: Derive private customer/line identity from verified authentication. Exclude passwords, OTP/PIN, field values, card details, session credentials and full routing tokens.

- ANA-06: Filter by date/timezone, channel, locale, market, line type, app version, content/version and permitted customer/session. Paginate history and audit exports.

- ANA-07: Show N/A for uninstrumented receipt/open or analytics metrics; observed events are not complete financial/audit evidence.

### Minimum event identifiers

```
eventId, occurredAt, receivedAt, channel, pageViewId
sessionId, screenId, actionId, sectionId, contentVersion
platform, appVersion, locale, approved result/errorCode
Identity: server-derived customerId / lineId when authenticated
```

Notification acceptance is provider acknowledgement, not device receipt. Rates must use consistent notification/delivery IDs and cohorts. Example acceptance ratio: accepted / (accepted + failed + unknown), excluding queued/in-flight/cancelled/expired; unknown remains visibly separate. Observed opens/receipts use tracked delivery IDs against the same accepted cohort.


## 20. Staff Users, Roles & Access Matrix


Role | Responsibility

Super Admin | CMS users, roles, integrations, environments and privileged CMS operations; no implied operator financial authority.

Content Editor | Draft/localize pages, copy, media, FAQ and reusable editorial blocks.

Product / Catalogue Manager | Product references, collections and approved merchandising; pricing authority is separately governed.

Marketing Manager | Campaign creative, audience rules, banners, notifications and promotion performance.

Approver / Publisher | Review, approve, schedule, publish/unpublish and rollback under separation-of-duties policy.

Support | Scoped customer/device/help records and permitted operational actions.

Analyst | Authorized aggregate reporting; individual sessions/raw exports need explicit grants.


Permission | Admin | Editor | Product | Marketing | Publisher | Support | Analyst

Draft content | Yes | Yes | Scoped | Scoped | Granted | No | No

Edit commercial source values | External | No | External | No | No | No | No

Configure audiences/campaigns | Yes | Granted | Scoped | Yes | Review | No | No

Approve/publish/rollback | Policy | No | No | No | Policy | No | No

View identifiable customer data | Scoped | No | No | Granted | Granted | Masked | Granted

Individual usage timeline | Granted | No | No | Granted | No | Granted | Granted

Export personal/raw data | Granted | No | No | Granted | No | No | Granted

Manage users/secrets/settings | Yes | No | No | No | No | No | No

View audit | Yes | Own | Own | Own | Review | Own | Granted

Roles are configurable by site/channel/market/locale/team. Granted requires an explicit additional permission; External means authority outside ordinary editorial roles. Enforce authorization on APIs, not only hidden controls. Individual staff identities, suspension/session re-evaluation and MFA for privileged production access are required under the chosen identity architecture.


## 21. Website SEO, Search, Forms & Legal Content

- WEB-01: Manage localized slugs, SEO titles/descriptions, canonical URLs, hreflang and approved structured data. Validate uniqueness and route collisions.

- WEB-02: Produce correct XML sitemaps/robots/indexability behavior. Exclude drafts, previews and private/self-care pages from public indexes and shared caches.

- WEB-03: Manage redirects for moved/retired pages, avoiding loops/chains where possible. Support deliberate 404/410/maintenance responses with useful recovery navigation.

- WEB-04: Search published authorized content and live catalogue sources. Support tags, synonyms, locale and editorial featured results; do not expose unpublished/private records.

- WEB-05: Use responsive images and accessible alt text, semantic headings, usable keyboard/RTL navigation and approved web-performance budgets.

- WEB-06: Contact/lead forms use approved schemas, server-side validation, abuse controls, privacy notice, scoped staff access and a defined CRM/ticket destination. CMS does not silently create a telecom account.

- WEB-07: Version legal/privacy/terms content and effective dates. Binding acceptance is recorded by an identity/consent service against the text version, not merely a page-view counter.

- WEB-08: Consent/tag behavior follows approved market policy. Optional marketing tags/third-party embeds must not bypass that policy through arbitrary content insertion.


## 22. Integration Architecture & Data Contracts

Recommended pattern: mobile/site clients use a company BFF/API layer for authenticated context and business actions. The BFF resolves CMS configuration/content and operator systems such as BSS, OCS, CRM, Billing, Catalogue, Loyalty and Support. Headless public delivery APIs may serve non-personal published content under an approved cache/auth design; management APIs and secrets are never exposed to clients.


Contract | Minimum data / behavior

Content delivery | Channel/site/pageKey, locale, approved audience context, config/schema version, supported capabilities, component tree and content references.

Private account summary | Verified customer/line ID, state/type, currency, balance/due, allowances, plan references, freshness/error fields.

Catalogue/eligibility | Product IDs, final price/tax/units/validity, eligibility reason and approved transaction journey.

Device registration | Installation ID, verified customer/line binding, token, platform/app version, locale, permission/preferences and last-seen.

Business events | Immutable event ID/type, verified recipient, UTC occurrence time, entity reference and allowlisted typed payload; durable ack and idempotency.

Analytics ingestion | Bounded event batches with stable IDs, schema validation, derived identity, accepted/deduplicated counts and documented failures.

Publishing/webhooks | Versioned publication event, impacted pages/assets/indexes, cache invalidation, retry and observable status.

### Illustrative Home configuration — not a deployed endpoint

```
{
  "schemaVersion": 1,
  "pageKey": "home",
  "channel": "app",
  "locale": "en",
  "contentVersion": "home-v12",
  "minAppVersion": "TBC",
  "sections": [
    {
      "id": "account",
      "type": "account_summary",
      "required": true,
      "source": "operator_api"
    },
    {
      "id": "offers",
      "type": "banner_carousel",
      "contentRef": "campaign-123",
      "routeId": "offers"
    }
  ]
}
```

Actual endpoint names, authentication, quotas, schemas, error codes and compatibility guarantees require engineering agreement. Event integration should use authenticated service identities or signed/replay-protected requests; no shared signing secret in the mobile app.


## 23. Non-Functional, Security & Resilience Requirements


ID | Requirement / proposed target

NFR-01 | Accessible English LTR and Arabic RTL across approved desktop/mobile viewports, with keyboard focus, readable contrast and meaningful labels.

NFR-02 | Use CDN/media optimization for public content, version/ETag-based delivery and reliable publication invalidation. Never put private account data into a public cache key.

NFR-03 | Use loading/partial-failure states per component, last-valid compatible content config, bounded private-data cache and clear last-updated indicators.

NFR-04 | Proposed common CMS filtered-view p95 <= 2 seconds at an agreed representative load. Confirm devices, data volume and network assumptions by test.

NFR-05 | Proposed transactional-event durable acknowledgement p95 <= 2 seconds and normal dispatch start p95 <= 10 seconds at agreed load; not a device-receipt SLA.

NFR-06 | Bound uploads, parsing, page/component counts, payload size, API concurrency, telemetry and retries. Validate real free-tier/storage/compute capacity before committing to scale.

NFR-07 | Use HTTPS, protected secrets, scoped service access, input/route/media validation, replay protection, staff authentication and backend-enforced roles.

NFR-08 | Observe version/config errors, slow pages/APIs, cache freshness, failed publication, queue age, rejected events and unknown delivery outcomes; correlate IDs without logging secrets.

NFR-09 | Test low-end devices, slow/offline networks, old app versions, API/CMS failure, account switch, publish interruption and rollback.

NFR-10 | Free services are a budget preference, not unlimited capacity. New paid dependencies, quota increases or changed service targets require an explicit commercial decision.


## 24. Audit, Retention & Data Governance

- GOV-01: Audit staff authentication/security changes, role grants, content/media changes, audience imports/exports, approvals, publication, schedules, rollback, notification actions and integration settings.

- GOV-02: Audit records include actor/effective role, entity/version, action, result, UTC time, reason and correlation ID. Keep meaningful before/after differences without private keys or sensitive payloads.

- GOV-03: Normal editorial users cannot modify historical audit records. Restrict and audit access to identifiable customers, sessions and bulk exports.

- GOV-04: Approve retention and deletion for raw telemetry, aggregates, source files, campaign/delivery evidence, lead forms, logs and backups. Remove unnecessary uploaded numbers/files after the agreed period.

- GOV-05: Proposed planning defaults: raw usage 14 days, aggregates 90 days, audit/operational evidence 180 days; business/data owner and operations must approve feasible final values.

- GOV-06: Maintain market/channel ownership, asset rights, legal text versions, customer-data removal handling and incident procedures. This draft does not assert legal approval for a particular jurisdiction.


## 25. Delivery Phases, Migration & Rollout


Phase | Scope / release gate

1 — Foundations and contracts | Confirm source examples, brand, app/web scope, identities, catalogue/API ownership, roles, component registry and event/metric definitions.

2 — Core editorial and Home | CMS pages/media/locales/workflow; app Home core widgets via real APIs; website shell/Home/product/help pages; routes, compatibility and fallback.

3 — Campaigns and transactions | Audience import/approval/scheduling, versioned templates, device binding, authenticated event ingestion/Outbox and reliable delivery.

4 — Measurement and optional services | Core analytics first; detailed sessions, personalization, loyalty/eSIM/roaming/store/partners only according to available services and approved scope.

5 — Verification and gradual release | Acceptance/security/load tests, employee pilot, limited customer rollout, monitoring, runbooks and named release approval.

- Deploy backward-compatible services/schemas before dependent app versions; preserve existing content, customers and notification history.

- Map and validate imported content/URLs/media/locales; use redirect plans and a reversible publication strategy for website migration.

- Separate test/prod content, identity, credentials and device audiences; sample/test messages never target customers unintentionally.

- Use independent controls to pause content publication, campaign dispatch, automatic notifications or analytics ingestion without stopping core payments/service access.

- Rollback preserves business events/audit and restores last-good content. Already submitted push messages may not be retractable.


## 26. Acceptance Criteria & Coverage


ID | Testable acceptance condition | Requirements

AC-01 | An editor publishes a supported app Home content change without a new app binary; the result respects locale/audience/version and appears after reliable cache refresh. | CMS-03/06; WF-07

AC-02 | Changing a card cannot alter balance, invoice amount, allowance, plan entitlement or final price in operator systems. | Section 5; CAT-03/06

AC-03 | Guest/prepaid/postpaid/no-plan/low-balance/expiring/offline states show appropriate values, labels/actions and privacy behavior. | APP-H01..12; Section 7

AC-04 | Authorized line switch refreshes private widgets and offers; unauthorized line IDs and previous-customer details are denied. | ID-01/02; AUD-01

AC-05 | Unsupported app component/version uses a defined fallback without breaking essential account tasks. | NAV-01/02/03

AC-06 | Core account information is visible before promotional content; phone layouts do not cause outer horizontal overflow on approved viewports. | Section 6; NFR-01

AC-07 | Website Home, consumer/business/product/help/corporate templates render the approved published content in correct locale and responsive layout. | Sections 4/8; WEB-05

AC-08 | Draft/private website pages are not publicly indexed or cached; canonical, hreflang, sitemap and redirects match approved page state. | WEB-01/02/03

AC-09 | Search returns only published/authorized records and valid catalogue results; a moved page follows the redirect plan. | WEB-03/04

AC-10 | Required translations, media constraints, routes and review rules block invalid publication with useful feedback. | CMS-07; MED-01; WF-02/05

### Acceptance criteria — continued


ID | Testable acceptance condition | Requirements

AC-11 | Material edits invalidate approval; author self-approval is blocked where configured; rollback restores last-good content with audit. | WF-01/03/04

AC-12 | Catalogue price/eligibility changes are revalidated and shown before purchase confirmation; no content click directly charges a customer. | CAT-02/03/04

AC-13 | CSV/XLSX numbers are normalized/mapped/deduplicated; mismatches and exclusions are reported; empty results never become a broadcast. | PUSH-02/03/04

AC-14 | Scheduled campaigns respect timezone/approval; cancellation stops unsent work; resend creates a linked new record and preserves history. | PUSH-05/06/07

AC-15 | A confirmed operator event notifies only the resolved recipient devices; notification failure does not repeat/reverse the business operation. | Section 18

AC-16 | Duplicate/retried events do not create duplicate logical work; conflicting IDs and invalid/replayed service requests are rejected. | Section 18; Section 22

AC-17 | Known temporary failures back off, invalid tokens deactivate, and uncertain provider submission becomes unknown under the agreed policy. | Section 18; NFR-08

AC-18 | Token rotation and device logout update bindings; other devices remain active; denying push permission does not block login/payment. | ID-03/04/05

AC-19 | Notification opens and deep links require authentication and ownership where needed; invalid destinations cannot execute arbitrary URLs. | NAV-05/06

AC-20 | Usage events cover the approved screen/action inventory; foreground time excludes background, and offline replay deduplicates. | ANA-01/03/04

### Acceptance criteria — continued


ID | Testable acceptance condition | Requirements

AC-21 | Impressions follow the agreed visibility threshold; CTR/conversion/acceptance/open metrics use documented matching cohorts and IDs. | ANA-02/07; Section 19

AC-22 | Uninstrumented receipt/open metrics show N/A; failed page/API requests do not invent balances, prices or usage. | APP-H03/04; ANA-07

AC-23 | Role/field/channel/market limits are enforced through direct APIs as well as UI; identifiers/exports are masked or denied as configured. | Section 20; GOV-03

AC-24 | Lead forms validate and reach the agreed CRM/ticket target with appropriate access/consent behavior; legal acceptance is version-bound. | WEB-06/07/08

AC-25 | Logs, analytics, exports and app bundles contain no passwords, OTP/PIN, session secrets, private service keys or full routing tokens. | ANA-05; NFR-07

AC-26 | Performance/load/error tests confirm the approved data volumes, queue latency, import limits and budget without starving transactional work. | NFR-04/05/06/09/10

AC-27 | Retention cleanup removes expired raw data/files while preserving required aggregate/audit evidence and customer-data handling rules. | GOV-01..06

AC-28 | Migration, publication failure, partial outage and rollback preserve compatible app behavior, known content and auditable results. | WF-03/07; Section 25

AC-29 | Three visual concepts are reviewed against the actual brand and supported component inventory; one direction or a documented combination is approved. | Section 7; Appendix

AC-30 | MTN reference files are received, inventoried and mapped; differences/omissions are resolved before any reference-parity sign-off. | Section 1; Section 27


## 27. Open Decisions & MTN Reference Review Checklist


Decision / input | Owner / evidence

Actual MTN source examples | Requester provides app/site CMS screenshots/PDFs; inventory page names, fields, roles and workflows.

Desired brand and market scope | Business confirms legal brand, visual tokens, countries/languages and brand permissions.

App / website / portal scope | Product confirms mandatory release channels and optional authenticated web journeys.

Application technology and compatibility | Mobile/web teams provide framework/version, application IDs, supported devices and routing.

Operator systems and contracts | Backend owners confirm identity/line delegation, BSS/OCS/billing/usage/catalogue/support/loyalty endpoints.

Audience / approval / privacy rules | Business/data/security owners decide consent categories, roles, self-approval, data masking and lock-screen content.

Load / cost / retention / targets | Operations agrees users, device counts, peaks, event volume, campaign size, content volume and feasible budgets.

Reference mapping matrix | For every received example: reference ID -> module/screen -> fields/actions -> requirement ID -> match/gap/decision.

Final release estimate | Engineering supplies effort, dependencies and dates after contract/reference review; none are invented in this draft.

Missing reference content must be resolved as a documented input, not silently replaced with assumptions. If source screenshots include private customer data, secrets or internal identifiers, use a redacted review copy and exclude raw originals from publicly shareable packages.


## 28. Approval & Handover Record

Release acceptance requires approved MUST scope, completed acceptance evidence, resolved reference gaps, operational runbooks/monitoring, named owners and a controlled rollout decision. Concept images and this PDF do not establish implementation or production readiness.


Reviewer / owner | Approval responsibility | Decision

Business / Product | Scope, content catalogue, Home hierarchy, audiences and brand direction | Pending

Content / Marketing | Editorial fields, assets, locales, workflow and campaign policy | Pending

Mobile / Web Leads | Rendering, accessibility, instrumentation and compatibility | Pending

Backend / CMS Lead | Source ownership, integrations, security, data contracts and reliability | Pending

QA Lead | AC-01 through AC-30 evidence and approved exceptions | Pending

Operations / Data / Security | Capacity, retention, access, monitoring and incident/rollback procedures | Pending

### Delivery package

- Expanded English PDF and editable requirements source.

- Three precise app Home PNG concepts and their HTML source; all use synthetic data.

- Optional generated visual exploration, separately identified from precise UI mockups if available.

- Readme with version, reference status and direct-download checksums.

NOTE: Draft v2.0 — review gate: source MTN CMS examples were not available during preparation. Reference-specific completeness, brand approval, final scope and production readiness remain pending.


## 29. Appendix — Home Page Visual Examples

The following pages show three original design proposals. These are sample data and placeholder branding. CMS controls approved layout and editorial content; live account facts and purchase eligibility/prices come from operator systems. The images are not extracted MTN CMS screenshots.

### Concept A — Yellow & Graphite — Prepaid

Balance and remaining allowances first, then active plan, quick actions and offers. A bold operator palette with restrained dark actions.

### Concept B — Mint & Teal — Postpaid

The account card uses amount due and payment terminology, while the underlying component system remains shared.

### Concept C — Violet & Cyan — No Active Plan

A real empty-state layout replaces allowance bars; bundle discovery is highlighted without inventing quota data.