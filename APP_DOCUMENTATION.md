# Brex / Vaulta — Application Documentation

> **Last updated:** 2026-04-24
> **Project codename:** vaulta-digital-safe
> **Stack:** React 18 · Vite 5 · TypeScript 5 · Tailwind CSS v3 · shadcn/ui · framer-motion · recharts · sonner · react-router-dom

---

## 1. Product overview

Brex (internal codename *Vaulta*) is a fully client-side digital banking
prototype that demonstrates a complete end-to-end retail-bank experience —
accounts, transfers, fixed deposits, FX accounts, scheduled payments,
savings goals, loans/credit and a notifications inbox — without any
backend. All state is persisted to `localStorage` so refreshes survive
across sessions and per-user data is isolated.

There are **three demo identities** wired into the app:

| User | Email | Password | Tier | Profile |
|------|-------|----------|------|---------|
| **Marcus Rashford** | `marcus.r@brexledger.com` | `Marcus2026.` | Premium | Established account with full transaction history, active loan, FX accounts, fixed deposits, standing orders, savings goals. |
| **James Lilburne** | `james.l@brexledger.com` | `Lilburne2026.` | Standard | Empty starter account. **Shares storage with Takeshi** — any change made by one is mirrored on the other. |
| **Takeshi Ronin** | `takeshi.r@brexledger.com` | `Takeshi2026.` | Standard | Empty starter account. Has the **Self-Fund** widget and the **Reset account data** control. |

### James ↔ Takeshi mirroring

James and Takeshi share a single `localStorage` slot
(`vaulta_state_shared`). On login, the active user's identity (name,
email, initials, tier) is overlaid on top of that slot via
`PROFILE_OVERLAY` in `src/state/AppState.tsx`. The accounts, transactions,
notifications, loans, fixed deposits, FX accounts, settings and goals
are all shared. Marcus has his own isolated slot (`vaulta_state_alex`).

This means:

- Funding Takeshi's checking account also funds James's checking account.
- Adding a savings goal as James shows up for Takeshi.
- Resetting from Takeshi's settings wipes both accounts at once.

---

## 2. Folder structure

```
src/
├─ App.tsx                    # Router + global providers
├─ main.tsx                   # Vite bootstrap
├─ index.css                  # Tailwind layers + design tokens (HSL)
├─ App.css                    # Legacy/global styles
├─ assets/                    # (none – images are inline / lucide)
├─ components/
│  ├─ ui/                     # shadcn/ui primitives (dialog, button, etc.)
│  ├─ NavLink.tsx             # Router NavLink wrapper
│  └─ vaulta/                 # App-specific composite components
│     ├─ AccountCard.tsx      # Visual card for a bank account
│     ├─ AnimatedNumber.tsx   # Spring-animated currency counter
│     ├─ AppLayout.tsx        # Sidebar + Topbar + page outlet
│     ├─ CategoryIcon.tsx     # Icon mapping for transaction categories
│     ├─ Logo.tsx             # Brand mark
│     ├─ MobileTabBar.tsx     # 5-icon bottom tab nav (mobile)
│     ├─ PageTransition.tsx   # framer-motion route transitions
│     ├─ SelfFundCard.tsx     # Takeshi-only self-funding widget (NEW)
│     ├─ Sidebar.tsx          # Desktop sidebar nav
│     ├─ Splash.tsx           # First-load splash animation
│     ├─ SuccessBurst.tsx     # Confetti / success state animation
│     ├─ ThemeToggle.tsx      # Light/dark switch
│     ├─ Topbar.tsx           # Top bar (search, theme, user)
│     └─ TxLoader.tsx         # Modal loading state for in-app activities
├─ hooks/
│  ├─ use-mobile.tsx          # Viewport breakpoint hook
│  └─ use-toast.ts            # Toast hook re-export
├─ lib/
│  ├─ format.ts               # formatCurrency, formatDate, maskAccount
│  └─ utils.ts                # cn() classname helper
├─ pages/
│  ├─ Dashboard.tsx           # Welcome, balance chart, recent activity
│  ├─ Accounts.tsx            # Account list + details modal (NEW)
│  ├─ Transactions.tsx        # Filterable transaction list + timeline drawer
│  ├─ Transfer.tsx            # Send / Bills / Add money + intl wires
│  ├─ FixedDeposits.tsx       # FD list + create/break flow
│  ├─ ForeignAccounts.tsx     # FX accounts + currency conversion
│  ├─ ScheduledPayments.tsx   # Standing orders CRUD
│  ├─ Goals.tsx               # Savings goals progress + funding
│  ├─ Loans.tsx               # Active loan + apply flow + credit gauge
│  ├─ Notifications.tsx       # Inbox of in-app notifications
│  ├─ Settings.tsx            # Profile / Security / Notifications / Prefs
│  ├─ Login.tsx               # Auth, geolocation, saved profiles
│  ├─ Index.tsx               # Splash redirect entrypoint
│  ├─ NotFound.tsx            # 404 fallback
│  └─ ComingSoon.tsx          # Generic placeholder page
├─ state/
│  ├─ types.ts                # All AppState / domain TS types
│  ├─ mockData.ts             # Default state for alex / jamie / takeshi
│  └─ AppState.tsx            # Context provider with all domain actions
└─ test/
   ├─ setup.ts                # Vitest setup
   └─ example.test.ts         # Smoke test
```

---

## 3. State model (`src/state`)

All app state is held in a single React Context (`AppStateProvider`) and
persisted to `localStorage` per user. The full shape lives in
`src/state/types.ts`.

### Top-level `AppState`

| Field | Type | Purpose |
|-------|------|---------|
| `theme` | `"light" \| "dark"` | Applied to `<html class="dark">`. |
| `authed` | `boolean` | Gates protected routes. |
| `userKey` | `"alex" \| "jamie" \| "takeshi"` | Active identity. |
| `profile` | `Profile` | Name, email, phone, tier, avatar initials. |
| `accounts` | `Account[]` | Checking / savings / investment with SWIFT, IBAN, routing, etc. |
| `transactions` | `Transaction[]` | Posted + pending tx with `tenor` lifecycle. |
| `beneficiaries` | `Beneficiary[]` | Saved recipients for "Send money". |
| `goals` | `SavingsGoal[]` | Named buckets with progress. |
| `notifications` | `Notification[]` | Inbox feed. |
| `fixedDeposits` | `FixedDeposit[]` | Active / matured / broken deposits. |
| `fxAccounts` | `FxAccount[]` | USD/GBP/EUR sub-accounts. |
| `fxTransactions` | `FxTransaction[]` | Currency conversion history. |
| `standingOrders` | `StandingOrder[]` | Recurring scheduled payments. |
| `loan` | `Loan \| null` | Single active loan (or `null` if ineligible). |
| `creditScore` | `number` | 300–850 score (0 if no history). |
| `settings` | `AppSettings` | Notifications + security + prefs + linked banks. |

### Persistence

```
vaulta_active_user        → "alex" | "jamie" | "takeshi"
vaulta_state_alex         → Marcus's full state
vaulta_state_shared       → James + Takeshi mirrored state
```

### Context actions (`AppState.tsx`)

| Action | Description |
|--------|-------------|
| `setState(updater)` | Generic state mutator. |
| `toggleTheme()` | Light ↔ dark. |
| `setAuthed(v)` | Sign in/out flag. |
| `switchUser(user)` | Hot-swaps the active identity, hydrating its slot. |
| `addTransaction(tx)` | Inserts a transaction; if `tenor` is non-instant, it starts as `pending` and lifecycle notifications fire. |
| `transferBetween(fromId, toId, amount, note?)` | Moves money between own accounts. |
| `sendMoney(fromId, beneficiary, amount, note?, tenor?)` | Outbound to a beneficiary; supports international wires (`tenor="wire"`). |
| `payBill(fromId, biller, amount, tenor?)` | Pay a utility / biller. |
| `depositMoney(toId, amount)` | Generic external deposit. |
| `addGoalFunds(goalId, amount, fromAccountId)` | Move from an account into a savings goal. |
| `pushNotification({ title, body, type })` | Append to the inbox. |
| `createFixedDeposit / breakFixedDeposit` | FD lifecycle. |
| `convertFx(fromId, toId, amount, rate)` | Currency conversion. |
| `createStandingOrder / updateStandingOrder / toggleStandingOrder / deleteStandingOrder` | SO CRUD. |
| `payLoan(amount, fromAccountId)` | Reduces remaining balance. |
| **`selfFund(toId, amount)`** *(new)* | Takeshi-only credit to checking/savings; mirrored to James. |
| `resetDemo()` | Wipes all `localStorage` slots and reloads. |

### Transaction lifecycle (`TxTenor`)

`src/state/types.ts` defines named tenors (`instant`, `fast`, `standard`,
`slow`, `wire`) mapped to total seconds in `TENOR_SECONDS`. When a
non-instant transaction is created it's inserted as `pending` and:

1. After ~10 % of the tenor a "Payment authorized" notification fires.
2. After 100 % of the tenor the tx flips to `completed` and a "settled"
   notification fires.

International wires use the `wire` tenor so the timeline is visibly
slower than domestic transfers.

---

## 4. Page-by-page features

### Dashboard (`/dashboard`)
- Welcome + quick action chips (Send / Transfer / Deposit / Pay Bill / Schedule / Statements).
- **Self-Fund card** (Takeshi only) — top up Everyday Checking / Starter Savings.
- Hero balance card with chart/table toggle, 30-day inflow/outflow.
- Accounts list snippet → `/accounts`.
- FX mini-widget when applicable.
- Recent activity, fixed deposits, upcoming scheduled payments, savings goals.

### Accounts (`/accounts`)
- Tabs: All / Checking / Savings.
- Each account renders an `AccountCard` plus inline detail fields.
- **Account details modal** (NEW) — opened via "View details", showing:
  - Available balance + network/type
  - Account number (masked, full value copied)
  - Routing, IBAN, SWIFT/BIC, network
  - **SWIFT validation badge** ("Valid" / "Check") using the ISO 9362
    regex `/^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/`.
- Statement download stub.
- All SWIFT codes are authentic ISO 9362 11-character codes (e.g.
  `BREXUS33MIA`, `BREXUS33SAV`) — no `XXX` placeholder branch suffix.

### Transactions (`/transactions`)
- Searchable + category-filterable list.
- Pending tx show a live timeline with skeleton loading.
- Selecting a tx opens the **Transaction review** drawer with:
  - Lifecycle timeline (Initiated → Authorized → Cleared → Settled)
  - Pace based on `tenor` — international wires take longer.

### Transfer (`/transfer`)
- Tabs: **Send** / **Bills** / **Add money**.
- **Domestic recipient validation** — letters/numbers/punctuation only,
  2–60 chars.
- **International wires** — toggle reveals SWIFT/BIC, IBAN, beneficiary
  bank fields with hardened validation:
  - SWIFT regex check.
  - IBAN ISO 7064 mod-97-10 checksum + per-currency length.
  - SWIFT country code must match IBAN country code.
- Bills accept account/meter numbers with format check.
- Add money has a $100,000/transaction cap.
- Review modal → loading state → success animation.

### Fixed Deposits (`/fixed-deposits`)
- Create new FD (principal, tenure, sourced from any account).
- Break an active FD with 1 % penalty.
- Subtle loading state while creating.

### Foreign Accounts (`/foreign-accounts`)
- USD / GBP / EUR sub-accounts with live balances.
- Convert between currencies with a static rate.
- FX history table.

### Scheduled Payments (`/scheduled-payments`)
- CRUD for standing orders (Weekly / Monthly / Quarterly / Annually).
- Pause/resume per order.

### Savings Goals (`/goals`)
- Create goals with emoji, target amount and date.
- Add funds from any account; loading animation while saving.

### Loans & Credit (`/loans`)
- Active loan card with progress bar + 6-month repayment schedule.
- Make payment modal.
- Credit-score radial gauge with factor breakdown.
- **Eligibility logic** — only Marcus (alex) can apply. James and
  Takeshi see a banner: *"Loan eligibility on hold"* and the Apply
  button reads "Not eligible" and is disabled.

### Notifications (`/notifications`)
- Inbox grouped by type (transaction / security / promo / system).
- Mark-as-read controls.

### Settings (`/settings`)
- **Profile** — name, email, phone, tier (read-only).
- **Security** — change password, active sessions list, sign out
  everywhere. (Two-factor authentication has been removed.)
- **Notifications** — Email / Push / Quiet hours toggles. (SMS section
  removed.)
- **Preferences** — currency display + language.
- **Linked accounts** — list/unlink external banks.
- **Danger zone** — "Reset account data":
  - Hidden for **James** (cannot wipe Takeshi's data).
  - Visible for **Marcus** (resets only his slot).
  - Visible for **Takeshi** with a hint that it resets *both* James
    and Takeshi (plus Marcus, since `resetDemo` wipes everything).

### Login (`/login`)
- Three saved-profile chips with one-tap fill.
- Manual email + password.
- Geolocation lookup via `ipapi.co`. If the resolved country is
  Nigeria, a random Los Angeles, USA IP is substituted before the
  "New sign-in detected" notification is dispatched.
- No mention of "demo" anywhere; passkey sign-in removed.

---

## 5. UI / design system

- All colors are HSL semantic tokens declared in `src/index.css` and
  `tailwind.config.ts`. Components must use these tokens — never raw
  Tailwind colors like `text-white` or `bg-black`.
- Dark theme contrast is tuned: `--muted-foreground` lifted to ~72 %
  lightness for readable secondary text on dark backgrounds.
- Sidebar (`Sidebar.tsx`) — active item shows a 3 px primary ribbon
  flush against the sidebar's left edge using `framer-motion`'s
  `layoutId="sidebar-active"` for animated transitions. The aside has
  `overflow-hidden` so the ribbon never bleeds into adjacent layout.
- Mobile tab bar (`MobileTabBar.tsx`) — 5 routes, centered active
  pill, large tap targets, safe-area padding.
- Animations live in `framer-motion`. Page transitions are handled by
  `PageTransition.tsx`.
- Toasts are powered by `sonner`.
- Loading states use `TxLoader` (modal) or inline skeletons.

---

## 6. Validation, security & guardrails

| Concern | Where | How |
|---------|-------|-----|
| SWIFT/BIC format | `Accounts.tsx`, `Transfer.tsx` | Regex `/^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/` |
| IBAN format + checksum | `Transfer.tsx` | Per-currency length + ISO 7064 mod-97-10 |
| Country-code consistency | `Transfer.tsx` | SWIFT country must match IBAN country |
| Domestic recipient | `Transfer.tsx` | 2–60 chars, allowed character set |
| Bill account / meter | `Transfer.tsx` | 4–24 alphanumeric/dash/space |
| Deposit cap | `Transfer.tsx`, `SelfFundCard.tsx` | $100,000 per transaction |
| Loan eligibility | `Loans.tsx` | Only `userKey === "alex"` |
| Reset visibility | `Settings.tsx` | Hidden for `userKey === "jamie"` |
| Password input | `Settings.tsx` | `<Input type="password" />` |
| Privacy fallback (Nigeria → LA) | `Login.tsx` | Country code check before notification |

---

## 7. Routing (`src/App.tsx`)

```
/login                  → Login (public)
/                       → Index (splash → dashboard)
/dashboard              → Dashboard (auth required)
/accounts               → Accounts
/transactions           → Transactions
/transfer               → Transfer (?tab=send|bills|add)
/fixed-deposits         → FixedDeposits
/foreign-accounts       → ForeignAccounts
/scheduled-payments     → ScheduledPayments
/goals                  → Goals
/loans                  → Loans
/notifications          → Notifications
/settings               → Settings
*                       → NotFound
```

`AppLayout` provides the sidebar + topbar shell. `AnimatedRoutes` wraps
the outlet with framer-motion page transitions.

---

## 8. Versioned changelog

### v1.6.0 (2026-04-24)
- **State:** James and Takeshi now share a single storage slot
  (`vaulta_state_shared`). All accounts/transactions/goals/notifications
  are mirrored. Identity overlay keeps profiles distinct.
- **State:** New `selfFund(toId, amount)` action.
- **Dashboard:** New `SelfFundCard` widget — Takeshi-only, lets him
  credit Everyday Checking or Starter Savings instantly.
- **Loans:** Eligibility gate — only Marcus can apply. James/Takeshi
  see a "Loan eligibility on hold" banner.
- **Settings:** Removed two-factor authentication card and SMS
  notifications section. Reset-account-data hidden for James; visible
  with a mirroring hint for Takeshi.
- **Accounts:** New "View details" modal with full account fields,
  authentic copy values and a SWIFT validation badge.
- **Mock data:** Replaced all `BREXUS33XXX` placeholder SWIFT codes
  with valid ISO 9362 11-character codes (`BREXUS33MIA`, `BREXUS33LAX`,
  etc.). Copying SWIFT now produces a real-looking code.
- **Sidebar:** Hardened active-indicator alignment — the ribbon now
  anchors at `left-0` inside an `overflow-hidden` aside so the rail
  is always flush to the sidebar's edge, on both desktop and mobile
  rotations.
- **Docs:** This file (`APP_DOCUMENTATION.md`) created.

### v1.5.0
- Real-time geolocation in Login with Nigeria→LA privacy fallback.
- Sidebar / mobile tab bar alignment passes.
- SWIFT/BIC field added to Accounts page.
- Third user account (Takeshi) introduced.

### v1.4.0
- Hardened beneficiary validation (SWIFT + IBAN + checksum).
- Per-tenor transaction lifecycle with progressive timeline + lifecycle
  notifications.
- Subtle loading state for in-app activities (loan apply, savings goal
  funding, FD creation).
- Mobile UI optimizations.

### v1.3.0
- Removed all mentions of "demo" and passkey sign-in from Login.
- Set credentials & names for Marcus / James.

### v1.2.0
- Mobile login layout polish.
- Transaction review modal redesign.
- Notification preferences expanded.
- International beneficiary validation.
- Transaction timeline component.
- Darker button + card accents.

### v1.1.0
- Multi-user state with isolated `localStorage` slots.
- Full domain coverage (FD, FX, standing orders, loans).

### v1.0.0
- Initial scaffold: dashboard, accounts, transactions, transfer.

---

## 9. Local development

```bash
bun install            # install deps
bun run dev            # start Vite dev server
bun run build          # production build
bunx tsc --noEmit      # type-check only
bunx vitest run        # run tests
```

The app is fully client-side — there is no backend or environment
variables required to run it locally.

---

## 10. Maintenance notes

- **Adding a new field to `AppState`:** update `src/state/types.ts`,
  add a default in all three states inside `mockData.ts`, then handle
  any merge logic in `safeMerge` (`AppState.tsx`).
- **Adding a new domain action:** declare on `Ctx`, implement inside
  `AppStateProvider`, include in the `value` memo + dependency array,
  and re-export via `useAppState`.
- **Adding a new page:** create under `src/pages`, register in
  `src/App.tsx` routes, and add a sidebar entry in `Sidebar.tsx`
  (`NAV_ITEMS`) and optionally `MobileTabBar.tsx`.
- **Updating SWIFT/IBAN validators:** keep the regex and length tables
  in sync between `Accounts.tsx` and `Transfer.tsx`.
- **Updating this doc:** every meaningful change should bump the
  changelog at the top of section 8 with a new version entry.
