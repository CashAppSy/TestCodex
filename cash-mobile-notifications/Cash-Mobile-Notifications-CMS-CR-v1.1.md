# Cash Mobile — Push Notifications & CMS Requirements

CR-CM-2026-001 | Revised Draft v1.1 | 26 October 2026

## 1. Document Control & Approval

Field | Value

Change request ID | CR-CM-2026-001

Title | Cash Mobile — Push Notifications, CMS and Usage Analytics

Version / date | 1.1 / 26 October 2026

Status | Draft for business and engineering review

Business owner | Cash Mobile — named owner to be assigned

Delivery owner / target release | To be assigned / to be estimated after scope review

Platforms | CMS web; Cash Mobile Android first. iOS requires separate scope confirmation.

Related baseline | Existing Cash Mobile notification prototype and developer handoff. Actual production integration remains to be validated.

This CR defines the requested target state. A requirement in this document does not mean that it exists in the current application. Engineering shall assess reuse of the prototype, identify gaps and estimate the delivery scope before approval.

### Approval record


Reviewer | Responsibility | Decision / date

Business / Product Owner | Audience rules, event catalogue, templates and scope | Pending

Mobile Lead | Instrumentation, token lifecycle and safe navigation | Pending

Backend / CMS Lead | Identity, event ingestion, delivery and permissions | Pending

QA Lead | Acceptance coverage and release readiness | Pending

Operations / Security Owner | Secrets, access, retention, monitoring and rollout | Pending

### Requirement terms

MUST identifies required release scope. SHOULD identifies a recommended capability. Proposed / TBC identifies a planning assumption that requires an explicit decision. Scope changes after approval must update this CR and its acceptance criteria.

## 2. Business Objective, Scope & Assumptions

Provide a controlled CMS for Cash Mobile communications: send and schedule campaigns, target customer phone numbers or uploaded lists, automatically notify customers of confirmed financial events, and measure notification and application usage outcomes.


In scope | Release expectation

Campaign messaging | All eligible accounts, selected phone numbers, CSV/XLSX audience upload, scheduling, approvals, cancellation and controlled resend.

Transactional notifications | Incoming transfers as the primary use case; configurable catalogue for payments, top-ups, failures, refunds and reminders.

CMS interface | Dashboard, campaigns, automated events, customers, analytics, users/roles, audit logs and settings; English/Arabic and RTL.

Reporting | Delivery outcomes, observed receipt/open tracking where instrumented, customer sessions, pages, dwell time and named actions.

Integration | Existing payment-system identity, registered devices, backend event interface, reliable event persistence and monitoring.


Out of scope unless separately approved | Reason / boundary

SMS, email, USSD and message inbox chat | This CR concerns mobile push notifications.

Financial execution or balance editing in CMS | The payment backend remains the financial system of record.

Replacing Cash Mobile login / customer registration | Existing company authentication remains authoritative.

Screen recording, keystroke capture or arbitrary input collection | Analytics covers approved screen and action events, excluding sensitive field contents.

Guaranteed push delivery or exact-once network transport | Delivery depends on devices, permissions, connectivity and provider behavior.

iOS, non-GMS Android and new paid infrastructure | Require explicit technical and commercial scope decisions.

NOTE: Budget assumption: begin with existing infrastructure and free service tiers where practical. Free-tier capacity must be measured against expected load; this CR does not assume unlimited free events, storage or campaigns.

## 3. Actors, Identity & Customer/Device Rules

Actor | Responsibility

Cash Mobile customer | Uses the payment app; receives notifications and manages permitted preferences.

CMS operator | Creates audiences, composes campaigns and monitors results within assigned permissions.

CMS approver | Independently reviews and approves or rejects campaigns when policy requires approval.

Payment backend | Authenticates customers, confirms financial events and resolves the true event recipient.

Notification service | Persists events, selects eligible devices, sends through FCM and records outcomes.

Mobile application | Registers tokens; receives, displays and opens notifications; emits approved analytics events.

### Required identity and device behavior

### FR-ID-01 — Authoritative identity

Use an immutable customer ID from the payment backend. Phone number and name are display/search attributes; changes to phone number must not create a new customer or transfer another customer’s history.

### FR-ID-02 — Automatic device binding

After successful app login, register the installation ID and FCM token against the authenticated customer. The backend derives customer identity from its verified session, not a client-selected customer ID.

### FR-ID-03 — Token and permission lifecycle

Update rotated tokens; record last-seen, app version, platform, permission state and preferences. Denying notification permission must not block login or payment.

### FR-ID-04 — Multiple devices and logout

Support multiple active devices per account. Confirmed logout deactivates that device binding, while other devices remain active. Clear customer-specific local data when switching accounts.

### FR-ID-05 — Eligibility and preferences

Select active devices compatible with the audience and notification category. Keep marketing consent separate from transaction categories; respect OS permission restrictions.

### FR-ID-06 — Ownership at send/open time

Recheck device ownership before dispatch. On open, authenticate and authorize access to transaction details. An in-flight OS notification may not be retractable; keep lock-screen content appropriately limited.

## 4. CMS Interface & Navigation

The visual direction follows the Cash Mobile reference: a dark navy sidebar, yellow primary actions, white cards and tables on a light background, and the original transparent Cash Mobile logo.


Area | Required interface

Sidebar | Dashboard; Campaigns; Automated Notifications; Customers; Usage Analytics; CMS Users & Roles; Audit Logs; Settings. Hide inaccessible functions according to role.

Top bar | Page title and breadcrumb; contextual search; operational alerts; language selector; administrator profile and logout.

Dashboard | Date/customer/type filters, key statistics, recent campaigns, delivery chart, status/type breakdown, recent activity and quick actions.

Tables | Search, sorting, status/date filters, pagination, visible total count, clear empty states and permitted CSV/XLSX export.

Forms | Required-field validation, previews, explicit save/submit states, loading indicators and actionable error messages.

Responsive layout | Desktop sidebar and grids; compact mobile navigation; readable forms; table scrolling contained within the table area.

Languages / accessibility | English LTR and Arabic RTL, consistent terminology, keyboard navigation, focus indicators, readable contrast and text labels alongside status colors.

Data integrity | Use actual records. Show N/A when a metric is not instrumented, and zero only when a supported metric has no results.

### Illustrative dashboard layout

[Vector wireframe: CMS dashboard]

Wireframe only. Dashes are placeholders, not production statistics. Exact labels and component sizing may be refined during UI design without changing functionality.

## 5. Dashboard, Filters & Metric Definitions

Every metric MUST display its date range, unit and definition. Distinguish customers, logical notifications and per-device delivery attempts. Store timestamps in UTC and display the configured IANA timezone.


Metric | Definition / date basis

Total customers | Accounts synchronized from the payment system; current snapshot, shown separately from date-period activity.

Eligible audience | Distinct customers with at least one active device satisfying the category, audience and consent rules; current snapshot at validation or dispatch.

Campaign count by status | Campaigns created in the selected period, grouped by current draft/approval/scheduled/sending/completed/cancelled status.

Device delivery outcomes | Distinct delivery IDs created in the selected cohort; queued, sending, accepted, failed, unknown, expired or cancelled. Show the cohort basis in the UI.

Confirmed acceptance rate | Accepted / (accepted + failed + unknown), excluding queued/sending/cancelled/expired records. Unknown must be displayed separately and must not be labelled a confirmed failure.

Potential customer reach | Distinct customers with at least one FCM-accepted device delivery; not proof that the user saw the notification.

Observed receipts / opens | Distinct accepted device delivery IDs with authenticated received/opened events; attribute late events to the original delivery cohort.

Observed receipt / open rate | Observed distinct delivery receipts or opens / accepted device deliveries. Label measurement coverage and N/A if application tracking is unavailable.

Operational health | Queue depth, oldest pending age, dispatch latency, failures by reason, unknown outcomes and invalid-token count.

Usage engagement | Active authenticated customers, sessions, foreground time, screen visits and named actions in the selected activity period.

### Required filters and chart behavior

- Date range and display timezone; campaign, notification category/type, status, audience and platform.

- Customer ID, phone/name search and app version where supported; mask identifiers for restricted roles.

- Charts for delivery trends, event types, campaign states and failure reasons; campaign and transaction datasets remain distinguishable.

- Use the same cohort for a rate numerator and denominator. Explain whether a date filter uses campaign creation, delivery creation or usage-event occurrence time.

- Comparison against the previous equivalent period is optional; display N/A when comparable data is unavailable.

- Export must preserve the applied filters, metric definitions and timezone, and be audited.

## 6. Campaign Creation & Audience Targeting

ID | Requirement

FR-CMP-01 | Create/edit a draft with internal campaign name, category, language, notification title/body and an approved destination screen. Show a device-style preview and validate length/encoding before submission.

FR-CMP-02 | Choose all eligible customers, manually entered phone numbers, a selected customer list, or a CSV/XLSX upload. These modes select existing accounts; importing a number must not create a customer account.

FR-CMP-03 | Normalize and validate recipient numbers, resolve them to immutable customer IDs, remove duplicates and calculate distinct eligible customers and device deliveries.

FR-CMP-04 | Show included/excluded counts and reasons, including invalid number, unmatched account, no active device, permission/consent exclusion and duplicate.

FR-CMP-05 | Require a final review of title/body, destination, audience counts, category and delivery time before approval/send. Never substitute all users for an empty or invalid audience.

FR-CMP-06 | Freeze the approved content and customer-ID audience snapshot. Re-evaluate device eligibility and account status at dispatch; expose changes between reviewed and actual eligible counts.

FR-CMP-07 | For all-customer campaigns, snapshot eligible customer IDs at final approval. Newly created accounts after that point are excluded; an explicit audience refresh requires reapproval.

FR-CMP-08 | Record the creator, reviewer, source list, template/content version and all lifecycle changes. Internal notes must not appear in the delivered notification.

### Illustrative campaign composer

[Vector wireframe: campaign composer]

Audience validation and final confirmation are required workflow stages, regardless of whether the final UI uses tabs, panels or a stepper.

## 7. Recipient File Import & Validation

### Supported formats and template

FR-IMP-01: support UTF-8 CSV and XLSX. Provide downloadable templates. A phone_number column is mandatory; optional customer_id and name columns may be supported. XLS, XLSM, macros and executable content are not supported.

```
phone_number,customer_id,name
<international phone>,<optional stable customer ID>,<optional display name>
```

Phone cells must be read as strings to preserve + and leading zeroes. Support Arabic digit normalization and common whitespace/separators. Use the configured country rule only when an unambiguous local number can be normalized; otherwise report it as invalid. Never silently guess the country.


Stage | Required result

Upload | Validate extension, content format and configured size/row limits. Use bounded parsing and avoid storing unnecessary source-file data.

Column mapping | Recognize or let the operator map the phone column; reject missing required columns with a clear message.

Normalization | Convert to canonical international format, preserving the original row reference for feedback.

Resolution | Match the normalized number to the authoritative customer directory. If customer_id is supplied, it must identify the same account as the phone; reject mismatches.

Deduplication | Deduplicate by resolved immutable customer ID, not only raw phone text; do not send twice when the same account appears multiple times.

Eligibility | Evaluate active devices, notification permissions, category preferences, platform and environment.

Preview | Show original row count, invalid rows, duplicate rows, unresolved unique accounts, excluded unique accounts, and eligible customers/device deliveries. Clearly label row-based vs customer-based counts.

Operator decision | Permit sending to the validated eligible subset only after explicit acknowledgement of exclusions, or allow correction/re-upload. Block an empty result.

Error report | Download rejected rows with row number and reason. Escape spreadsheet-formula prefixes in exports. Customer data must be visible only to authorized staff.

NOTE: Proposed first-release limits: 10,000 rows and 5 MB per file, configurable and subject to load testing on the selected hosting plan. These are proposed product limits, not confirmed platform capacity.

### Stored audience behavior

Retain the normalized customer-ID snapshot and import summary for audit. Remove the original file according to retention policy. If a customer changes phone number later, the approved campaign continues to refer to the same customer ID; devices are revalidated before sending.

## 8. Scheduling, Approvals, Sending & Resending

ID | Requirement

FR-SCH-01 | Support Send Now and Schedule. Capture local date/time and an explicit IANA timezone, show the UTC equivalent, and reject a past schedule. Handle ambiguous/nonexistent daylight-saving times explicitly.

FR-SCH-02 | Only valid, approved campaigns may enter the scheduled queue when approval is enabled. Pending approvals are not dispatchable.

FR-SCH-03 | Allow permitted editing/cancellation before dispatch. A change to content, audience, destination or delivery time invalidates approval and requires review again.

FR-SCH-04 | Show estimated recipient/device counts and processing status. Do not describe scheduled time as a guaranteed device-receipt time.

FR-SND-01 | Claim each delivery atomically, process bounded batches, persist results and recover interrupted work without indiscriminate re-sending.

FR-SND-02 | Cancellation during sending stops only unsent work. Already submitted/in-flight notifications cannot be guaranteed to be recalled; show submitted and cancelled counts separately.

FR-SND-03 | Resend creates a new campaign/attempt linked to the original and preserves the selected customer IDs. Default to a new draft and approval; never overwrite historical outcomes.

FR-SND-04 | Offer clearly defined resend audiences, such as original selected customers or confirmed failed deliveries. Unknown outcomes require explicit operator acknowledgement before a repeat.

FR-APR-01 | Approval is configurable by campaign category, audience size or operator role. Proposed production default: campaign approval enabled with author self-approval blocked.

FR-APR-02 | Approvers see the full preview, resolved audience summary, scheduling/timezone, exclusions and prior revisions before approving or rejecting with a reason.

### Campaign lifecycle

```
Draft -> Pending Approval -> Approved -> Scheduled / Ready
      -> Sending -> Completed
Rejected -> Draft revision
Scheduled / Ready -> Cancelled
Sending -> Completed with cancelled unsent work
Interrupted processing -> Recoverable state / Operator review
```

Completed means no dispatchable work remains; it does not mean every device received or opened the message. Outcome counters must communicate partial acceptance, failures, unknown results and cancellations.

## 9. Automated Notifications & Event Catalogue

FR-AUTO-01: automatic notifications originate from trusted backend events after the underlying business state is confirmed. They are not triggered by a mobile screen claiming that a payment succeeded.


Event type | Recipient and trigger | Requirement

transfer_received | Recipient of a confirmed, posted incoming transfer | Mandatory primary use case. Resolve the actual recipient, not the initiating user.

invoice_paid | Payer after final bill-payment confirmation | Include safe transaction reference/destination; do not notify on a merely pending status.

balance_topup | Account owner after confirmed top-up | Backend-confirmed credit event.

operation_failed | Affected customer after a confirmed final rejection/failure | An unknown payment result is not a confirmed failure.

payment_refunded | Customer after an actual completed refund | New event linked to the original transaction, not reuse of the original success event.

invoice_reminder | Customer with a due invoice at a configured reminder time | Scheduled backend rule; prevent repeated reminders for the same rule occurrence.

security_alert | Affected account after an approved security event | Optional catalogue item; content and preferences require business policy.

### Template and rule management

- FR-AUTO-02: Manage type key, display name, description, category, language variants, title/body templates, allowed variables, destination screen and enabled state.

- FR-AUTO-03: Validate variables against a type-specific schema, reject unknown placeholders, and provide a sample preview without using real customer secrets.

- FR-AUTO-04: Version templates. Save the resolved/versioned content for a queued event so later edits cannot silently change a previously approved or queued message.

- FR-AUTO-05: Apply role-controlled template changes and an auditable activation process. Critical financial/security template changes SHOULD require independent review.

- FR-AUTO-06: Automatic financial events do not wait for manual campaign approval. Apply the already approved event rule/template and dispatch eligibility rules.

- FR-AUTO-07: Provide a test-only mode restricted to explicit test accounts/devices and environment. A test event must not execute any real financial operation.

## 10. Incoming Transfer — End-to-End Flow

[Vector flow: confirmed transfer to authenticated detail view]

### Required processing rules

- 1. Payment backend verifies the provider/ledger result and identifies the recipient’s immutable customer ID.

- 2. Persist the final transfer state and a unique notification Outbox event in the same database transaction.

- 3. An Outbox worker sends the event to the notification service through authenticated server-to-server integration, retrying delivery with the same event ID.

- 4. CMS validates the source, schema and event identity, stores the event durably, and acknowledges the stored event. Duplicate matching events return their existing result.

- 5. Resolve the recipient’s current active devices and the approved template. If none exist, record no_devices; do not broadcast to other accounts.

- 6. Create per-device delivery records and send through FCM. Track accepted/failed/unknown separately from app-reported receipt/open events.

- 7. On notification tap, require valid login and transaction ownership before opening details fetched from the payment API.

- 8. If notification processing fails, retain recoverable work or a failure record; do not roll back or repeat the financial transfer.

NOTE: Customer-facing example: Title: “Transfer received”. Message: “You have received a transfer. Open Cash Mobile for details.” Showing amount or sender identity on the lock screen is a separate, configurable privacy decision.

## 11. Reliability, Retry & Delivery-State Model

State | Meaning / handling

queued | Event/delivery durably stored and awaiting processing.

sending | Work is claimed/in progress; use a lease and atomic claim to prevent simultaneous dispatch by multiple workers.

accepted | FCM accepted the request. Not a device delivery receipt.

failed | Known unsuccessful outcome; distinguish permanent vs eligible temporary errors.

unknown | Provider outcome cannot be confirmed after timeout/interruption. Do not label it accepted or confirmed failed, and do not blindly replay it.

no_devices | No eligible customer device. Record the reason and apply an explicitly approved wait-until-TTL or terminal policy.

expired | The configured notification TTL expired before a valid attempt.

cancelled | Unsent work was cancelled. Already submitted work is reported separately.

received / opened | Independent authenticated client observations attached to delivery IDs, not replacement financial statuses.

- FR-REL-01: Use an immutable event ID for a business occurrence. Repeated identical requests return the existing event; the same ID with conflicting customer/type/entity/payload returns a conflict.

- FR-REL-02: Deduplicate delivery work per event/recipient/device and app inbox items using stable notification/delivery IDs. A retry is not a new financial transaction.

- FR-REL-03: Retry eligible temporary errors with bounded exponential backoff, jitter and Retry-After. Respect TTL and configured attempt limits.

- FR-REL-04: Disable unregistered/expired tokens. Diagnose payload errors before treating a token as invalid.

- FR-REL-05: A timeout after submitting to FCM may follow actual acceptance. Record unknown; provide a controlled review/retry policy and audit explicit repeats.

- FR-REL-06: Ensure campaign batches cannot indefinitely starve transaction notifications. Monitor queue depth, oldest pending work and retry backlog.

The product targets reliable event persistence and duplicate-resistant processing. It does not promise exactly-once transport or guaranteed push visibility on every device. Device connectivity, OS policy and permissions affect receipt.

## 12. Customer Directory & Notification History

ID | Requirement

FR-CUS-01 | Search/filter customers by immutable customer ID, phone number, name, status, app version and active-device availability. Customer identity is synchronized from the payment system.

FR-CUS-02 | Customer detail shows profile reference, linked devices, platform/app version, last-seen, permission/preference state and notification eligibility. Never display full device tokens to normal operators.

FR-CUS-03 | Show campaign and automatic-event history with category/type, transaction reference, time, provider outcome, and observed receipt/open records where available.

FR-CUS-04 | Support targeted campaign selection from customer lists. Selection counts must be distinct customers; show the associated eligible device count separately.

FR-CUS-05 | Provide a permitted device-deactivation action with confirmation and reason. Device deactivation must not modify the customer’s financial account or balance.

FR-CUS-06 | Honor field masking, export permission and record access restrictions. Support should not automatically receive unrestricted bulk customer exports.

### Customer detail layout

Header: customer name, masked/full phone according to permission, immutable customer ID and account/notification status.Tabs: Overview; Devices; Notification History; Sessions & Actions (restricted); Preferences.History table: source campaign/event, type, time, device count, accepted/failed/unknown outcomes, observed opens and detail link.

### Marketing and transaction preferences

Preferences are category-aware. Marketing opt-out removes marketing eligibility; transactional/security behavior follows the approved business policy and available OS permission. The interface must explain why a selected account is not eligible. A blocked or inactive account is handled according to an explicit synchronization rule.

## 13. Usage Analytics: Sessions, Screens & Actions

FR-ANA-01: instrument all agreed business-relevant screens and actions through a maintained event catalogue. CMS cannot infer mobile button presses without application instrumentation. Login-session validity and foreground usage sessions are separate concepts.


Event | Minimum data / definition

session_start | Unique usage session ID; authenticated customer resolved by backend; installation ID; UTC occurrence time; app/OS version. Start on authenticated foreground entry; a configurable background/inactivity threshold determines a new session.

screen_view | Stable screen ID, session ID, occurrence time and prior screen ID if available. Screen names must not embed customer names, phones or transaction amounts.

screen_time | Incremental foreground-visible duration for the active screen; measure elapsed time with a monotonic clock. Close/flush on navigation/background and checkpoint periodically. Do not double-count checkpoints and final intervals.

button_click / action | Stable action ID, screen ID, session ID, timestamp and optional allowlisted result/error code. Examples: transfer_submit, invoice_open, campaign_notification_open.

session_end | End reason, last-seen and accumulated foreground duration. If an app is killed, use checkpoints/inferred closure and label it accordingly.

notification_received / opened | Stable notification ID and per-device delivery ID; authenticated recipient binding; UTC time. Coverage varies by platform and background behavior.

### Reports and individual user view

- FR-ANA-02: Dashboard: active customers, sessions, average/total foreground duration, screen views, time per screen, named action frequency, and app-version distribution.

- FR-ANA-03: User drill-down: session list and event timeline, page sequence, dwell intervals and action/result sequence. Show available evidence rather than assuming unobserved actions occurred.

- FR-ANA-04: Filters: date/timezone, customer, usage session, screen, action, platform and app version. Paginate event history and permit exports only to authorized roles.

- FR-ANA-05: Queue events locally during transient disconnection, batch uploads, cap local retention, retry with stable event IDs, and deduplicate server ingestion. Document limits and possible loss when the app is terminated or local capacity is exceeded.

- FR-ANA-06: Exclude passwords, OTPs, PINs, field values, card details, session credentials and full push tokens. Analytics payloads use allowlisted names/attributes; customer identity is derived from verified authentication.

- FR-ANA-07: Maintain an approved screen/action inventory and QA coverage map. Newly added app screens/actions require instrumentation and catalogue updates.

- FR-ANA-08: Authenticated customer analytics is in scope. Anonymous pre-login tracking is optional and requires a separate identity/retention decision. Usage analytics is observational telemetry, not a financial audit record.

## 14. CMS Users, Roles & Permission Matrix

CMS staff accounts are separate from Cash Mobile customer accounts. Each staff user has an individual identity, active/suspended state and assigned roles. No shared administrator login is acceptable for production auditability.


Role | Purpose

Super Admin | Manage CMS configuration, integrations, roles and staff accounts; all authorized CMS operations, but no financial ledger/balance editing.

Campaign Manager | Create/edit campaigns, import audiences, schedule/submit for approval and monitor permitted results. Sending requires explicit permission and applicable approval.

Approver | Review, approve or reject campaigns under policy. Cannot approve their own campaign when separation of duties is enabled.

Customer Support | Search permitted customers and inspect notification/device history; identifiers masked as configured. No default bulk send or export.

Analyst | Read approved aggregate dashboards and reports. Identifiable user/session drill-down and raw exports require separate grants.

### Default permission matrix — configurable


Permission | Super Admin | Campaign Manager | Approver | Support | Analyst

View aggregate dashboards | Yes | Yes | Yes | Scoped | Yes

Create/edit own drafts | Yes | Yes | No | No | No

Import recipient files | Yes | Yes | No | No | No

Submit/schedule approved work | Yes | Yes | No | No | No

Approve/reject campaigns | Yes* | No | Yes* | No | No

Send/cancel/resend | Yes* | Granted* | No | No | No

View identifiable customers | Yes | Scoped | Scoped | Masked | No

Deactivate a device | Yes | No | No | Granted | No

Edit automated templates/rules | Yes* | Granted* | Review* | No | No

View identifiable usage timeline | Yes | Granted | No | Granted | Granted

Export customer/event data | Yes | Granted | No | No | Granted

Manage users/roles/integrations | Yes | No | No | No | No

View audit records | Yes | Own work | Review work | Own work | Granted

Scoped: constrained to permitted records/fields. Granted: an explicit additional permission, not a default. *: subject to approval and separation-of-duties policies; Super Admin must not silently bypass the configured author self-approval rule.

## 15. Non-Functional Requirements & Retention

ID / area | Requirement and proposed target

NFR-01 — Responsiveness | CMS lists use server-side pagination and scoped filters. Proposed target: common filtered views p95 <= 2 seconds at an agreed representative load; confirm by performance testing.

NFR-02 — Event acknowledgement | Acknowledge a new event only after durable persistence. Proposed p95 target <= 2 seconds at agreed load; financial processing must not block on FCM delivery.

NFR-03 — Dispatch latency | Proposed start-of-dispatch p95 <= 10 seconds for normal transactional workload, excluding upstream outages. Requires measured worker/queue design; no device-receipt SLA is implied.

NFR-04 — Scheduling | Dispatch becomes eligible at the stored UTC schedule. Report queue delay separately; missed starts are monitored and recovered according to TTL/policy.

NFR-05 — Scale | Agree customers, devices/customer, events/day, peak events/second, campaign audience size, upload limits and retention before sizing. Respect host/FCM quotas and isolate transaction priority.

NFR-06 — Reliability | Use durable events, atomic claims, idempotency, bounded retries, lease recovery and explicit unknown outcomes. Test restart/network interruption scenarios.

NFR-07 — Observability | Correlate event, campaign, notification, delivery and entity IDs. Alert on queue age, failure/unknown spikes, invalid tokens, ingestion rejection and resource limits.

NFR-08 — Localization/accessibility | English and Arabic/RTL, clear timezone display, keyboard-accessible controls and accessible contrast/status labels.

NFR-09 — Data retention | Proposed starting policy: 14 days raw usage events, 90 days aggregate analytics, 180 days operational/audit records. Business owner must approve final periods and verify storage/cost feasibility.

NFR-10 — Cleanup and portability | Automated expiry/deletion with documented handling of customer removal, backups and export access. Do not retain uploaded files longer than necessary.

NFR-11 — Service constraints | FCM/OS/network behavior can delay or suppress notifications. Free service tiers are a budget assumption, not a capacity guarantee.

Targets and retention above are planning proposals, not a contractual SLA or confirmation of existing performance. Record approved values and workload assumptions before implementation sign-off.