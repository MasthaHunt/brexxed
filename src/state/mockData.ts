import type { AppState, Transaction, FixedDeposit, FxAccount, FxTransaction, StandingOrder, Notification } from "./types";

const today = new Date();
const daysAgo = (n: number) => {
  const d = new Date(today);
  d.setDate(d.getDate() - n);
  return d.toISOString();
};
const daysAhead = (n: number) => {
  const d = new Date(today);
  d.setDate(d.getDate() + n);
  return d.toISOString();
};

/* ============ ALEX (full data) ============ */

const alexTx: Transaction[] = [
  { id: "t1", date: daysAgo(0), merchant: "Whole Foods Market", category: "Food", amount: -84.32, accountId: "checking", status: "completed", reference: "WF-9821" },
  { id: "t2", date: daysAgo(0), merchant: "Uber", category: "Transport", amount: -22.5, accountId: "checking", status: "completed", reference: "UB-2241" },
  { id: "t3", date: daysAgo(1), merchant: "Apple Store", category: "Shopping", amount: -1299.0, accountId: "checking", status: "completed", reference: "AP-5512" },
  { id: "t4", date: daysAgo(1), merchant: "Spotify", category: "Entertainment", amount: -9.99, accountId: "checking", status: "completed", reference: "SP-0011" },
  { id: "t5", date: daysAgo(2), merchant: "Hartwell Financial Group", category: "Salary", amount: 6420.0, accountId: "checking", status: "completed", reference: "PAY-2025-04" },
  { id: "t6", date: daysAgo(3), merchant: "Con Edison", category: "Utilities", amount: -142.78, accountId: "checking", status: "completed", reference: "CE-8821" },
  { id: "t7", date: daysAgo(3), merchant: "Loan Payment", category: "Loans", amount: -350.0, accountId: "checking", status: "completed", reference: "LN-4421" },
  { id: "t8", date: daysAgo(4), merchant: "Trader Joe's", category: "Food", amount: -64.12, accountId: "checking", status: "completed", reference: "TJ-7711" },
  { id: "t9", date: daysAgo(5), merchant: "Lyft", category: "Transport", amount: -18.4, accountId: "checking", status: "completed", reference: "LY-0091" },
  { id: "t10", date: daysAgo(6), merchant: "Amazon", category: "Shopping", amount: -211.55, accountId: "checking", status: "completed", reference: "AMZ-4512" },
  { id: "t11", date: daysAgo(7), merchant: "Transfer to Savings", category: "Transfers", amount: -1000.0, accountId: "checking", status: "completed", reference: "TR-2201" },
  { id: "t12", date: daysAgo(7), merchant: "Transfer from Checking", category: "Transfers", amount: 1000.0, accountId: "savings", status: "completed", reference: "TR-2201" },
  { id: "t13", date: daysAgo(8), merchant: "Netflix", category: "Entertainment", amount: -15.49, accountId: "checking", status: "completed", reference: "NX-7781" },
  { id: "t14", date: daysAgo(9), merchant: "Shell", category: "Transport", amount: -52.3, accountId: "checking", status: "completed", reference: "SH-3382" },
  { id: "t15", date: daysAgo(10), merchant: "CVS Pharmacy", category: "Health", amount: -36.21, accountId: "checking", status: "completed", reference: "CV-9912" },
  { id: "t16", date: daysAgo(12), merchant: "Verizon", category: "Utilities", amount: -89.99, accountId: "checking", status: "completed", reference: "VZ-3412" },
  { id: "t17", date: daysAgo(14), merchant: "Starbucks", category: "Food", amount: -7.85, accountId: "checking", status: "completed", reference: "SB-6611" },
  { id: "t18", date: daysAgo(16), merchant: "Hartwell Financial Group", category: "Salary", amount: 6420.0, accountId: "checking", status: "completed", reference: "PAY-2025-03" },
  { id: "t19", date: daysAgo(18), merchant: "Best Buy", category: "Shopping", amount: -349.99, accountId: "checking", status: "completed", reference: "BB-2231" },
  { id: "t20", date: daysAgo(20), merchant: "Delta Airlines", category: "Transport", amount: -512.0, accountId: "checking", status: "completed", reference: "DL-7781" },
  { id: "t21", date: daysAgo(22), merchant: "Whole Foods Market", category: "Food", amount: -118.42, accountId: "checking", status: "completed", reference: "WF-7711" },
  { id: "t22", date: daysAgo(25), merchant: "Interest Earned", category: "Deposits", amount: 42.18, accountId: "savings", status: "completed", reference: "INT-Q1" },
  { id: "t23", date: daysAgo(28), merchant: "Fixed Deposit FD-00301", category: "Deposits", amount: -10000.0, accountId: "checking", status: "completed", reference: "FD-00301" },
  { id: "t24", date: daysAgo(30), merchant: "Rent — Oakwood Properties LLC", category: "Utilities", amount: -2400.0, accountId: "checking", status: "completed", reference: "RNT-04" },
  { id: "t25", date: daysAgo(33), merchant: "Hulu", category: "Entertainment", amount: -7.99, accountId: "checking", status: "completed", reference: "HU-1102" },
];

const alexFds: FixedDeposit[] = [
  { id: "FD-00412", principal: 15000, rate: 7.25, startDate: "2025-01-14", maturityDate: "2025-07-14", status: "Active", sourceAccountId: "checking", tenureMonths: 6 },
  { id: "FD-00389", principal: 10000, rate: 6.8, startDate: "2024-11-01", maturityDate: "2025-05-01", status: "Active", sourceAccountId: "checking", tenureMonths: 6 },
  { id: "FD-00301", principal: 10000, rate: 7.5, startDate: "2025-02-14", maturityDate: "2025-08-14", status: "Active", sourceAccountId: "checking", tenureMonths: 6 },
];

const alexFx: FxAccount[] = [
  { id: "fx-usd", currency: "USD", name: "US Dollar", number: "8821", flag: "🇺🇸", balance: 4200.0, symbol: "$" },
  { id: "fx-gbp", currency: "GBP", name: "British Pound", number: "4403", flag: "🇬🇧", balance: 1850.0, symbol: "£" },
  { id: "fx-eur", currency: "EUR", name: "Euro", number: "7712", flag: "🇪🇺", balance: 2100.0, symbol: "€" },
];

const alexFxTx: FxTransaction[] = [
  { id: "fx1", date: daysAgo(2), from: "USD", to: "GBP", amount: 500, converted: 395, rate: 0.79, status: "completed" },
  { id: "fx2", date: daysAgo(5), from: "USD", to: "EUR", amount: 1000, converted: 920, rate: 0.92, status: "completed" },
  { id: "fx3", date: daysAgo(9), from: "GBP", to: "USD", amount: 200, converted: 253.16, rate: 1.2658, status: "completed" },
  { id: "fx4", date: daysAgo(12), from: "EUR", to: "USD", amount: 300, converted: 326.09, rate: 1.087, status: "completed" },
  { id: "fx5", date: daysAgo(15), from: "USD", to: "GBP", amount: 750, converted: 592.5, rate: 0.79, status: "completed" },
  { id: "fx6", date: daysAgo(20), from: "USD", to: "EUR", amount: 400, converted: 368, rate: 0.92, status: "completed" },
  { id: "fx7", date: daysAgo(24), from: "EUR", to: "GBP", amount: 250, converted: 213.92, rate: 0.8557, status: "completed" },
  { id: "fx8", date: daysAgo(30), from: "USD", to: "EUR", amount: 600, converted: 552, rate: 0.92, status: "completed" },
];

const alexSos: StandingOrder[] = [
  { id: "SO-2201", reference: "SO-2201", recipient: "Netflix Subscription", sourceAccountId: "checking", amount: 15.99, frequency: "Monthly", nextDate: daysAhead(8), status: "Active", memo: "Streaming" },
  { id: "SO-2198", reference: "SO-2198", recipient: "Rent – Oakwood Apts", sourceAccountId: "checking", amount: 1200.0, frequency: "Monthly", nextDate: daysAhead(12), status: "Active", memo: "Apt 4B" },
  { id: "SO-2175", reference: "SO-2175", recipient: "Mom", sourceAccountId: "checking", amount: 500.0, frequency: "Monthly", nextDate: daysAhead(17), status: "Active" },
  { id: "SO-2140", reference: "SO-2140", recipient: "Gym Membership", sourceAccountId: "checking", amount: 49.99, frequency: "Monthly", nextDate: daysAhead(10), status: "Active" },
  { id: "SO-2089", reference: "SO-2089", recipient: "Electricity Bill", sourceAccountId: "checking", amount: 120.0, frequency: "Quarterly", nextDate: daysAhead(22), status: "Active" },
];

const alexNotifications: Notification[] = [
  { id: "n1", title: "Salary received", body: "$6,420.00 deposited to Checking.", type: "transaction", date: daysAgo(2), read: false },
  { id: "n2", title: "Large purchase alert", body: "Apple Store — $1,299.00", type: "security", date: daysAgo(1), read: false },
  { id: "n3", title: "Welcome to Brex Premium", body: "Enjoy 0 fees on all transfers.", type: "promo", date: daysAgo(5), read: true },
  { id: "n4", title: "Fixed deposit nearing maturity", body: "FD-00389 matures in 11 days.", type: "system", date: daysAgo(0), read: false },
  { id: "n5", title: "New device sign-in", body: "Chrome on macOS · San Francisco.", type: "security", date: daysAgo(3), read: false },
  { id: "n6", title: "Standing order executed", body: "$1,200.00 paid to Rent – Oakwood Apts.", type: "transaction", date: daysAgo(4), read: true },
  { id: "n7", title: "FX rate alert", body: "USD/GBP dropped 0.4% in last 24h.", type: "system", date: daysAgo(2), read: false },
  { id: "n8", title: "Loan payment due", body: "Next payment of $350.00 due in 5 days.", type: "system", date: daysAgo(1), read: false },
  { id: "n9", title: "Two-factor recommended", body: "Enable 2FA for stronger account protection.", type: "security", date: daysAgo(6), read: true },
  { id: "n10", title: "Statement available", body: "March 2025 statement is ready to download.", type: "system", date: daysAgo(8), read: true },
  { id: "n11", title: "Cashback earned", body: "You earned $12.40 in cashback rewards.", type: "promo", date: daysAgo(7), read: false },
  { id: "n12", title: "Beneficiary added", body: "Diego Ramos was added to your contacts.", type: "system", date: daysAgo(11), read: true },
  { id: "n13", title: "Bill paid successfully", body: "Verizon — $89.99", type: "transaction", date: daysAgo(12), read: true },
  { id: "n14", title: "Rate change", body: "Savings APY increased to 4.5%.", type: "promo", date: daysAgo(14), read: true },
  { id: "n15", title: "Privacy policy update", body: "We've updated our terms — review them now.", type: "system", date: daysAgo(20), read: true },
  { id: "n16", title: "FD created", body: "Fixed Deposit FD-00301 created for $10,000.", type: "transaction", date: daysAgo(28), read: true },
];

export const alexState: AppState = {
  theme: "light",
  authed: false,
  userKey: "alex",
  profile: {
    name: "Marcus Rashford",
    email: "marcus.r@brexledger.com",
    phone: "+1 (415) 555-0142",
    tier: "Premium",
    avatarInitials: "MR",
  },
  accounts: [
    { id: "checking", name: "Everyday Checking", type: "checking", number: "5174839201749016", routing: "021000021", iban: "US29VLTA5174839201749016", swift: "BXLDUS33NYC", network: "Mastercard", balance: 12450.2, color: "violet" },
    { id: "savings", name: "High-Yield Savings", type: "savings", number: "4839201047382916", routing: "021000021", iban: "US47VLTA4839201047382916", swift: "BXLDUS33SAV", network: "Visa", balance: 24870.3, color: "mint" },
    { id: "investment", name: "Reserve Account", type: "investment", number: "3714820193050748", routing: "021000021", iban: "US83VLTA3714820193050748", swift: "BXLDUS33RSV", network: "Amex", balance: 47000.0, color: "indigo" },
  ],
  transactions: alexTx,
  beneficiaries: [
    { id: "b1", name: "Sarah Chen", account: "•••• 4421", bank: "Chase", avatarColor: "245 100% 69%" },
    { id: "b2", name: "Marcus Webb", account: "•••• 8812", bank: "Wells Fargo", avatarColor: "168 100% 42%" },
    { id: "b3", name: "Priya Patel", account: "•••• 0091", bank: "Bank of America", avatarColor: "265 90% 65%" },
    { id: "b4", name: "Diego Ramos", account: "•••• 7733", bank: "Citi", avatarColor: "350 90% 65%" },
  ],
  goals: [
    { id: "g1", name: "Emergency Fund", emoji: "🛟", saved: 5000, target: 10000 },
    { id: "g2", name: "Vacation", emoji: "🌴", saved: 1200, target: 3000 },
    { id: "g3", name: "MacBook", emoji: "💻", saved: 800, target: 1500 },
  ],
  notifications: alexNotifications,
  fixedDeposits: alexFds,
  fxAccounts: alexFx,
  fxTransactions: alexFxTx,
  standingOrders: alexSos,
  loan: {
    id: "L-1001",
    name: "Personal Loan",
    principal: 15000,
    remaining: 8400,
    apr: 9.5,
    termMonths: 18,
    monthlyPayment: 350,
    startDate: daysAgo(180),
  },
  creditScore: 742,
  settings: {
    notifications: { emailTransactions: true, emailPromos: false, emailStatements: true, pushTransactions: true, pushSecurity: true, pushOffers: false, smsAlerts: false, smsLargeTx: true, quietHours: false, quietStart: "22:00", quietEnd: "07:00" },
    security: { twoFactor: false, password: "Marcus2026." },
    preferences: { currency: "USD", language: "English" },
    linkedBanks: [
      { id: "lb1", name: "Chase", mask: "•••• 9921" },
      { id: "lb2", name: "Bank of America", mask: "•••• 4412" },
    ],
  },
  sessions: [],
};

/* ============ SHARED — QFS settlement notices ============
 * Both James and Takeshi had $200,000 self-funded and subsequently
 * withdrawn following DAF clearance. These shared constants build
 * the transaction record and notifications that appear for both. */

const QFS_REF    = "QFS-2026-001";
const QFS_DATE   = daysAgo(1);
const QFS_AMOUNT = 200_000;

/** Incoming transfer from QFS Investments — posted to Everyday Checking */
const makeQfsTx = (id: string): Transaction => ({
  id,
  date: QFS_DATE,
  merchant: "Incoming Transfer — QFS Investments LLC",
  category: "Transfers",
  amount: QFS_AMOUNT,          // positive = credit
  accountId: "checking",
  status: "completed",
  reference: QFS_REF,
  note:
    "Incoming wire transfer from QFS Investments LLC. " +
    "Deposit Activation Fee (DAF) of $2,500.00 paid and confirmed. " +
    "Funds fully cleared and credited to account per compliance authorisation " +
    `reference ${QFS_REF}.`,
});

/** DAF cleared + funds settled notification — shown on login, no action required */
const makeQfsDafNotif = (id: string): Notification => ({
  id,
  title: "Deposit Activation Fee Confirmed — Funds Fully Cleared",
  body:
    "Your one-time Deposit Activation Fee (DAF) of $2,500.00 has been received and " +
    "verified by our Compliance & Settlement Division. Pursuant to the successful " +
    "completion of all prerequisite regulatory checks, your incoming transfer of " +
    "$200,000.00 from QFS Investments LLC (ref: QFS-2026-001) has been fully settled " +
    "and credited to your Everyday Checking account in accordance with applicable " +
    "financial regulations. Your account is now fully operational. " +
    "Please retain this notice for your records.",
  type: "transaction",
  date: QFS_DATE,
  read: false,
});

/* ============ JAMIE (settled state) ============ */

export const jamieState: AppState = {
  theme: "light",
  authed: false,
  userKey: "jamie",
  profile: {
    name: "James Lilburne",
    email: "james.l@brexledger.com",
    phone: "",
    tier: "Standard",
    avatarInitials: "JL",
  },
  accounts: [
    { id: "checking", name: "Everyday Checking", type: "checking", number: "5281047392018364", routing: "021000021", iban: "US38VLTA5281047392018364", swift: "BXLDUS33LAX", network: "Mastercard", balance: QFS_AMOUNT, color: "violet" },
    { id: "savings",  name: "Starter Savings",   type: "savings",   number: "4138201047392816", routing: "021000021", iban: "US52VLTA4138201047392816", swift: "BXLDUS33SAV", network: "Visa",       balance: 0,          color: "mint"   },
  ],
  transactions: [makeQfsTx("j-qfs-1")],
  beneficiaries: [],
  goals: [],
  notifications: [
    makeQfsDafNotif("jn-qfs-daf"),
    { id: "jn1", title: "Welcome to Brex!", body: "Your account is ready.", type: "system", date: daysAgo(3), read: true },
  ],
  fixedDeposits: [],
  fxAccounts: [],
  fxTransactions: [],
  standingOrders: [],
  loan: null,
  creditScore: 0,
  settings: {
    notifications: { emailTransactions: true, emailPromos: true, emailStatements: true, pushTransactions: true, pushSecurity: true, pushOffers: true, smsAlerts: false, smsLargeTx: false, quietHours: false, quietStart: "22:00", quietEnd: "07:00" },
    security: { twoFactor: false, password: "Lilburne2026." },
    preferences: { currency: "USD", language: "English" },
    linkedBanks: [],
  },
  sessions: [],
};

/* ============ TAKESHI (empty state) ============ */

export const takeshiState: AppState = {
  theme: "light",
  authed: false,
  userKey: "takeshi",
  profile: {
    name: "Takeshi Ronin",
    email: "takeshi.r@brexledger.com",
    phone: "",
    tier: "Standard",
    avatarInitials: "TR",
  },
  accounts: [
    { id: "checking", name: "Everyday Checking", type: "checking", number: "5392840107483019", routing: "021000021", iban: "US71VLTA5392840107483019", swift: "BXLDUS33LAX", network: "Mastercard", balance: QFS_AMOUNT, color: "violet" },
    { id: "savings",  name: "Starter Savings",   type: "savings",   number: "4720381049200387", routing: "021000021", iban: "US14VLTA4720381049200387", swift: "BXLDUS33SAV", network: "Visa",       balance: 0,          color: "mint"   },
  ],
  transactions: [makeQfsTx("t-qfs-1")],
  beneficiaries: [],
  goals: [],
  notifications: [
    makeQfsDafNotif("tn-qfs-daf"),
    { id: "tn1", title: "Welcome to Brex!", body: "Your account is ready.", type: "system", date: daysAgo(3), read: true },
  ],
  fixedDeposits: [],
  fxAccounts: [],
  fxTransactions: [],
  standingOrders: [],
  loan: null,
  creditScore: 0,
  settings: {
    notifications: { emailTransactions: true, emailPromos: true, emailStatements: true, pushTransactions: true, pushSecurity: true, pushOffers: true, smsAlerts: false, smsLargeTx: false, quietHours: false, quietStart: "22:00", quietEnd: "07:00" },
    security: { twoFactor: false, password: "Takeshi2026." },
    preferences: { currency: "USD", language: "English" },
    linkedBanks: [],
  },
  sessions: [],
};

export type UserKey = "alex" | "jamie" | "takeshi";

export const defaultStateFor = (userKey: UserKey): AppState =>
  userKey === "alex" ? alexState : userKey === "jamie" ? jamieState : takeshiState;

/* legacy alias kept so any leftover import doesn't break */
export const defaultState = alexState;
