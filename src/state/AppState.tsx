import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { fetchStateFromServer, saveStateToServer, deleteStateFromServer } from "@/lib/api";
import type {
  AppState,
  AdminControls,
  Session,
  Transaction,
  FixedDeposit,
  FxAccount,
  FxTransaction,
  StandingOrder,
  Frequency,
  Notification,
  TxTenor,
} from "./types";
import { TENOR_SECONDS } from "./types";
import { defaultStateFor, alexState } from "./mockData";

// ── Admin controls (cross-user, Takeshi-managed) ─────────────────────────────
const DEFAULT_ADMIN: AdminControls = { dafBypassed: false, transferLockBypassed: false, dafPaid: false };

const loadAdminControls = (): AdminControls => {
  try {
    const raw = localStorage.getItem("vaulta_admin");
    if (!raw) return DEFAULT_ADMIN;
    return { ...DEFAULT_ADMIN, ...JSON.parse(raw) };
  } catch { return DEFAULT_ADMIN; }
};

const saveAdminControls = (c: AdminControls) => {
  try { localStorage.setItem("vaulta_admin", JSON.stringify(c)); } catch {}
};

const ACTIVE_USER_KEY = "vaulta_active_user";
/** James and Takeshi share a single backing storage slot so any change
 *  performed in one account is mirrored on the other. Marcus (alex) keeps
 *  his own isolated slot. */
const stateKey = (user: UserKey) =>
  user === "alex" ? "vaulta_state_alex" : "vaulta_state_shared";

type UserKey = "alex" | "jamie" | "takeshi";

/** Identity overlays applied on top of the shared state slot so the active
 *  user's name/email/initials always reflect who is signed in, even when the
 *  underlying accounts/transactions are mirrored. */
const PROFILE_OVERLAY: Record<UserKey, { name: string; email: string; tier: string; avatarInitials: string }> = {
  alex: { name: "Marcus Rashford", email: "marcus.r@brexledger.com", tier: "Premium", avatarInitials: "MR" },
  jamie: { name: "James Lilburne", email: "james.l@brexledger.com", tier: "Standard", avatarInitials: "JL" },
  takeshi: { name: "Takeshi Ronin", email: "takeshi.r@brexledger.com", tier: "Standard", avatarInitials: "TR" },
};

const safeMerge = (base: AppState, parsed: Partial<AppState>): AppState => {
  return {
    ...base,
    ...parsed,
    // For the shared James/Takeshi slot, only carry forward non-identity profile
    // fields (phone, avatarUrl) — identity fields are always injected by PROFILE_OVERLAY.
    profile: {
      ...base.profile,
      phone: parsed.profile?.phone ?? base.profile.phone,
      avatarUrl: parsed.profile?.avatarUrl,
    },
    settings: {
      ...base.settings,
      ...(parsed.settings ?? {}),
      notifications: { ...base.settings.notifications, ...(parsed.settings?.notifications ?? {}) },
      security: { ...base.settings.security, ...(parsed.settings?.security ?? {}) },
      preferences: { ...base.settings.preferences, ...(parsed.settings?.preferences ?? {}) },
      linkedBanks: parsed.settings?.linkedBanks ?? base.settings.linkedBanks,
    },
  };
};

/** Per-user password override — set by change-password or forgot-password flows.
 *  Stored separately so James and Takeshi each have their own password even
 *  though they share a financial-data slot. */
const loadPasswordFor = (user: UserKey): string | null => {
  try {
    return localStorage.getItem(`vaulta_password_${user}`);
  } catch {
    return null;
  }
};

/** Sessions are always stored per-user in a dedicated slot so James and
 *  Takeshi never share session history even though they share financial data. */
const loadSessionsFor = (user: UserKey): Session[] => {
  try {
    const raw = localStorage.getItem(`vaulta_sessions_${user}`);
    if (!raw) return [];
    return JSON.parse(raw) as Session[];
  } catch {
    return [];
  }
};

const loadStateFor = (user: UserKey): AppState => {
  const base = defaultStateFor(user);
  try {
    const raw = localStorage.getItem(stateKey(user));
    let merged = base;
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<AppState>;
      merged = safeMerge(base, parsed);
    }
    // Apply per-user password override so Settings always shows the real password.
    const storedPassword = loadPasswordFor(user);
    if (storedPassword) {
      merged = {
        ...merged,
        settings: {
          ...merged.settings,
          security: { ...merged.settings.security, password: storedPassword },
        },
      };
    }

    // Always force the identity overlay + correct userKey so the shared
    // James/Takeshi slot reflects the currently signed-in person.
    // Sessions are per-user so they are loaded from a separate localStorage slot.
    return {
      ...merged,
      userKey: user,
      profile: { ...merged.profile, ...PROFILE_OVERLAY[user] },
      sessions: loadSessionsFor(user),
    };
  } catch {
    return base;
  }
};

const loadActiveUser = (): UserKey => {
  try {
    const u = localStorage.getItem(ACTIVE_USER_KEY);
    if (u === "jamie" || u === "takeshi") return u;
    return "alex";
  } catch {
    return "alex";
  }
};

type Ctx = {
  state: AppState;
  setState: (updater: (s: AppState) => AppState) => void;
  toggleTheme: () => void;
  setAuthed: (v: boolean) => void;
  switchUser: (user: UserKey) => void;
  addTransaction: (
    tx: Omit<Transaction, "id" | "reference" | "status" | "date"> &
      Partial<Pick<Transaction, "date" | "status" | "reference" | "tenor">>,
  ) => Transaction;
  transferBetween: (fromId: string, toId: string, amount: number, note?: string) => void;
  sendMoney: (fromId: string, beneficiaryName: string, amount: number, note?: string, tenor?: TxTenor) => void;
  payBill: (fromId: string, biller: string, amount: number, tenor?: TxTenor) => void;
  depositMoney: (toId: string, amount: number) => void;
  addGoalFunds: (goalId: string, amount: number, fromAccountId: string) => void;
  /** Append a notification to the user's feed. */
  pushNotification: (n: Omit<Notification, "id" | "date" | "read"> & Partial<Pick<Notification, "date" | "read">>) => void;
  /* New domain actions */
  createFixedDeposit: (principal: number, tenureMonths: number, rate: number, sourceAccountId: string) => FixedDeposit;
  breakFixedDeposit: (id: string) => void;
  convertFx: (fromId: string, toId: string, amount: number, rate: number) => FxTransaction | null;
  createStandingOrder: (so: Omit<StandingOrder, "id" | "reference" | "status">) => StandingOrder;
  updateStandingOrder: (id: string, patch: Partial<StandingOrder>) => void;
  toggleStandingOrder: (id: string) => void;
  deleteStandingOrder: (id: string) => void;
  payLoan: (amount: number, fromAccountId: string) => void;
  /** Takeshi-only: self-funds either everyday checking or starter savings.
   *  Mirrored automatically because Takeshi and James share the storage slot. */
  selfFund: (toId: string, amount: number, description?: string) => void;
  setAvatar: (dataUrl: string) => void;
  /** Remove a security hold that was placed after a self-fund settled. */
  clearAccountHold: (accountId: string) => void;
  /** Remove the temporary post-transfer lock from an account. */
  clearTransferLock: (accountId: string) => void;
  /** Pay the DAF fee to settle a pending self-fund on the given account. */
  payDaf: (accountId: string) => void;
  /** Admin: confirm DAF received for ALL accounts currently flagged dafRequired.
   *  Settles pending self-fund txs immediately. One-time action per occurrence. */
  resolveAllDaf: () => void;
  /** Admin: confirm transfer hold resolved for ALL locked accounts.
   *  Clears locks now; pending outgoing txs complete 48 h from resolution. */
  resolveAllTransferLocks: () => void;
  /** Schedule a 15-20 min post-transfer security lock on the account. */
  scheduleTransferLock: (accountId: string) => void;
  /** Change the current user's password. Persists to a per-user localStorage key
   *  so James and Takeshi always have independent passwords. */
  changePassword: (newPassword: string) => void;
  /** Set or change the 4-digit transaction PIN. Syncs to server cross-device. */
  changePin: (newPin: string) => void;
  /** Verify a PIN entry against local cache / server. Returns true if correct. */
  verifyPin: (enteredPin: string) => Promise<boolean>;
  /** Cross-user admin controls (Takeshi only in the UI). */
  adminControls: AdminControls;
  setAdminControl: <K extends keyof AdminControls>(key: K, value: AdminControls[K]) => void;
  /** Save multiple admin control keys at once — single server write. */
  setAdminControlsBatch: (updates: Partial<AdminControls>) => void;
  /** Re-fetch admin controls from server and update local state. Returns merged result or null if server unavailable. */
  refreshAdminControls: () => Promise<AdminControls | null>;
  /** Re-fetch full financial state from server for the current user. Returns true on success. */
  refreshStateFromServer: () => Promise<boolean>;
  resetDemo: () => void;
};

const AppStateContext = createContext<Ctx | null>(null);

export const AppStateProvider = ({ children }: { children: ReactNode }) => {
  const [activeUser, setActiveUser] = useState<UserKey>(() => loadActiveUser());
  const [state, setStateRaw] = useState<AppState>(() => loadStateFor(loadActiveUser()));

  // Admin controls — cross-user, Takeshi-managed, stored separately
  const [adminControls, setAdminControlsState] = useState<AdminControls>(() => loadAdminControls());
  const adminRef = useRef<AdminControls>(adminControls);
  useEffect(() => { adminRef.current = adminControls; }, [adminControls]);

  const setAdminControl = useCallback(<K extends keyof AdminControls>(key: K, value: AdminControls[K]) => {
    setAdminControlsState((prev) => {
      const next = { ...prev, [key]: value };
      saveAdminControls(next);
      adminRef.current = next;
      // Sync to server so admin control changes propagate to all devices
      saveStateToServer("vaulta_admin", next);
      return next;
    });
  }, []);

  /** Save multiple admin keys in one state update + one server write. */
  const setAdminControlsBatch = useCallback((updates: Partial<AdminControls>) => {
    setAdminControlsState((prev) => {
      const next = { ...prev, ...updates };
      saveAdminControls(next);
      adminRef.current = next;
      saveStateToServer("vaulta_admin", next);
      return next;
    });
  }, []);

  /** Re-fetch admin controls from server and merge into local state.
   *  Returns the merged result, or null if the server is unreachable / not configured. */
  const refreshAdminControls = useCallback(async (): Promise<AdminControls | null> => {
    const serverAdmin = await fetchStateFromServer("vaulta_admin");
    if (!serverAdmin) return null;
    const merged = { ...DEFAULT_ADMIN, ...(serverAdmin as Partial<AdminControls>) };
    saveAdminControls(merged);
    adminRef.current = merged;
    setAdminControlsState(merged);
    return merged;
  }, []);

  /** Re-fetch the full financial state for the current user from the server
   *  and merge it into local state. Server wins for all financial data.
   *  Returns true on success, false if server is unreachable / not configured. */
  const refreshStateFromServer = useCallback(async (): Promise<boolean> => {
    const serverState = await fetchStateFromServer(stateKey(activeUser));
    if (!serverState) return false;
    setStateRaw((prev) => {
      const base = defaultStateFor(prev.userKey);
      const merged = safeMerge(base, serverState as Partial<AppState>);
      return {
        ...merged,
        userKey: prev.userKey,
        profile: { ...merged.profile, ...PROFILE_OVERLAY[prev.userKey] },
        authed: prev.authed,
        theme: prev.theme,
        sessions: prev.sessions,
      };
    });
    return true;
  }, [activeUser]);

  // Debounce ref for server saves — avoids hammering on every keystroke
  const serverSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Persist to localStorage (immediate) + server (debounced 1.5 s) ──────────
  useEffect(() => {
    try {
      const key = stateKey(state.userKey);

      // Sessions are always per-user — never saved into the shared state slot.
      const { sessions: _sessions, ...stateNoSessions } = state;
      const toSave =
        key === "vaulta_state_shared"
          ? {
              ...stateNoSessions,
              profile: { phone: state.profile.phone, avatarUrl: state.profile.avatarUrl },
            }
          : stateNoSessions;

      // localStorage — always immediate
      localStorage.setItem(key, JSON.stringify(toSave));
      localStorage.setItem(ACTIVE_USER_KEY, state.userKey);
      // Sessions saved to a dedicated per-user key so James / Takeshi never cross-pollinate
      localStorage.setItem(`vaulta_sessions_${state.userKey}`, JSON.stringify(state.sessions ?? []));

      // Server — debounced so rapid changes batch into one write
      if (serverSaveTimer.current) clearTimeout(serverSaveTimer.current);
      serverSaveTimer.current = setTimeout(() => {
        saveStateToServer(key, toSave);
      }, 1500);
    } catch {
      /* ignore quota / network errors */
    }
  }, [state]);

  // ── Hydrate admin controls from server after login ───────────────────────────
  // Admin controls are stored in a dedicated vaulta_admin server slot so that
  // Takeshi's toggle changes propagate to all devices.
  useEffect(() => {
    if (!state.authed) return;
    fetchStateFromServer("vaulta_admin").then((serverAdmin) => {
      if (!serverAdmin) return;
      const merged = { ...DEFAULT_ADMIN, ...(serverAdmin as Partial<AdminControls>) };
      saveAdminControls(merged);
      adminRef.current = merged;
      setAdminControlsState(merged);
    });
  }, [state.authed]);

  // ── Hydrate from server after login or user-switch ───────────────────────────
  // Runs whenever the user becomes authenticated or switches identity.
  // Server state wins for financial data; local auth + theme are preserved.
  useEffect(() => {
    if (!state.authed) return;

    fetchStateFromServer(stateKey(state.userKey)).then((serverState) => {
      if (!serverState) return; // nothing on server yet — keep local state
      setStateRaw((prev) => {
        const base = defaultStateFor(prev.userKey);
        const merged = safeMerge(base, serverState as Partial<AppState>);
        return {
          ...merged,
          userKey: prev.userKey,
          profile: { ...merged.profile, ...PROFILE_OVERLAY[prev.userKey] },
          // Never overwrite local-only fields with server values
          authed: prev.authed,
          theme: prev.theme,
          sessions: prev.sessions, // sessions are local-only, never on server
        };
      });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.authed, state.userKey]);

  // theme class on <html>
  useEffect(() => {
    const root = document.documentElement;
    if (state.theme === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
  }, [state.theme]);

  const setState = useCallback((updater: (s: AppState) => AppState) => {
    setStateRaw((prev) => updater(prev));
  }, []);

  const toggleTheme = useCallback(() => {
    setState((s) => ({ ...s, theme: s.theme === "dark" ? "light" : "dark" }));
  }, [setState]);

  const setAuthed = useCallback((v: boolean) => {
    setState((s) => ({ ...s, authed: v }));
  }, [setState]);

  const switchUser = useCallback((user: UserKey) => {
    setActiveUser(user);
    const next = loadStateFor(user);
    // Record a new session entry — mark all prior sessions as no longer current
    const newSession: Session = {
      id: `sess-${Date.now()}`,
      device: "Chrome · Web",
      location: "Current session",
      timestamp: new Date().toISOString(),
      current: true,
    };
    const updatedSessions: Session[] = [
      newSession,
      ...next.sessions.map((s) => ({ ...s, current: false })),
    ].slice(0, 5); // keep at most 5 history entries
    setStateRaw({ ...next, authed: true, theme: state.theme, sessions: updatedSessions });
  }, [state.theme]);

  /* ============= Notifications ============= */
  const pushNotification: Ctx["pushNotification"] = useCallback((n) => {
    const note: Notification = {
      id: `n-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      date: n.date ?? new Date().toISOString(),
      read: n.read ?? false,
      title: n.title,
      body: n.body,
      type: n.type,
    };
    setState((s) => ({ ...s, notifications: [note, ...s.notifications] }));
  }, [setState]);

  /** Schedule lifecycle notifications + settle a pending transaction.
   *  Stages mirror the Timeline component on the Transactions page. */
  const scheduleLifecycle = useCallback((tx: Transaction) => {
    const tenor = tx.tenor;
    if (!tenor) return;
    const totalMs = TENOR_SECONDS[tenor] * 1000;
    const friendly = tx.merchant.replace(/^Sent to |^Transfer to |^Transfer from /, "");
    const isWire = tenor === "wire";

    setTimeout(() => {
      pushNotification({
        type: "transaction",
        title: isWire ? "Wire authorized" : "Payment authorized",
        body: `${friendly} · ${tx.reference} cleared authorization.`,
      });
    }, Math.max(800, totalMs * 0.1));

    setTimeout(() => {
      setState((s) => ({
        ...s,
        transactions: s.transactions.map((t) =>
          t.id === tx.id ? { ...t, status: "completed" as const } : t,
        ),
      }));
      pushNotification({
        type: "transaction",
        title: isWire ? "Wire settled" : "Transaction settled",
        body: `${friendly} · ${tx.reference} is now posted to your account.`,
      });
    }, totalMs);
  }, [pushNotification, setState]);

  // ── Detect SQL-cleared DAF ────────────────────────────────────────────────────
  // When the "Clear DAF" SQL query runs, it writes dafClearedAt onto the account.
  // On the next sync / login, this useEffect detects that field, starts the exact
  // 6 h remaining settlement timer, then immediately wipes dafClearedAt so it
  // never re-triggers.
  useEffect(() => {
    const dafCleared = state.accounts.filter((a) => !!a.dafClearedAt && !a.dafRequired);
    if (dafCleared.length === 0) return;

    for (const acc of dafCleared) {
      const clearedAt = acc.dafClearedAt!;
      const tx = state.transactions.find(
        (t) => t.tenor === "selffund" && t.status === "pending" && t.accountId === acc.id,
      );
      if (!tx) continue;

      const elapsed = Date.now() - new Date(clearedAt).getTime();
      const remaining = Math.max(500, 6 * 60 * 60 * 1000 - elapsed);

      // Wipe dafClearedAt immediately — prevents this effect from re-running
      setState((s) => ({
        ...s,
        accounts: s.accounts.map((a) =>
          a.id === acc.id ? { ...a, dafClearedAt: undefined } : a,
        ),
      }));

      // Schedule settlement at the 6 h mark from when DAF was cleared
      const txId = tx.id;
      const amount = tx.amount;
      const accountId = acc.id;
      setTimeout(() => {
        setState((s) => {
          const t = s.transactions.find((t) => t.id === txId);
          if (!t || t.status === "completed") return s;
          const next = adjustBalance(s, accountId, amount);
          return {
            ...next,
            transactions: next.transactions.map((t) =>
              t.id === txId ? { ...t, status: "completed" as const } : t,
            ),
          };
        });
        pushNotification({
          type: "transaction",
          title: "Funds settled",
          body: "Your incoming transfer has been fully processed and credited to your account.",
        });
      }, remaining);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.accounts]);

  const addTransaction: Ctx["addTransaction"] = useCallback((tx) => {
    const initialStatus = tx.status ?? (tx.tenor && tx.tenor !== "instant" ? "pending" : "completed");
    const newTx: Transaction = {
      id: `t-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      date: tx.date ?? new Date().toISOString(),
      status: initialStatus,
      reference: tx.reference ?? `BRX-${Math.floor(Math.random() * 90000 + 10000)}`,
      merchant: tx.merchant,
      category: tx.category,
      amount: tx.amount,
      accountId: tx.accountId,
      note: tx.note,
      tenor: tx.tenor,
    };
    setState((s) => ({ ...s, transactions: [newTx, ...s.transactions] }));
    if (initialStatus === "pending") scheduleLifecycle(newTx);
    return newTx;
  }, [setState, scheduleLifecycle]);

  const adjustBalance = (s: AppState, accountId: string, delta: number): AppState => ({
    ...s,
    accounts: s.accounts.map((a) => (a.id === accountId ? { ...a, balance: +(a.balance + delta).toFixed(2) } : a)),
  });

  const transferBetween: Ctx["transferBetween"] = useCallback((fromId, toId, amount, note) => {
    setState((s) => {
      let next = adjustBalance(s, fromId, -amount);
      next = adjustBalance(next, toId, amount);
      const ref = `TR-${Math.floor(Math.random() * 90000 + 10000)}`;
      const date = new Date().toISOString();
      const fromName = s.accounts.find((a) => a.id === fromId)?.name ?? "Account";
      const toName = s.accounts.find((a) => a.id === toId)?.name ?? "Account";
      const newTxs: Transaction[] = [
        { id: `t-${Date.now()}-a`, date, merchant: `Transfer to ${toName}`, category: "Transfers", amount: -amount, accountId: fromId, status: "completed", reference: ref, note },
        { id: `t-${Date.now()}-b`, date, merchant: `Transfer from ${fromName}`, category: "Transfers", amount: amount, accountId: toId, status: "completed", reference: ref, note },
      ];
      return { ...next, transactions: [...newTxs, ...next.transactions] };
    });
  }, [setState]);

  const sendMoney: Ctx["sendMoney"] = useCallback((fromId, beneficiaryName, amount, note, tenor) => {
    const txTenor: TxTenor = tenor ?? "standard";
    const initialStatus: Transaction["status"] = txTenor === "instant" ? "completed" : "pending";
    const tx: Transaction = {
      id: `t-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      date: new Date().toISOString(),
      merchant: `Sent to ${beneficiaryName}`,
      category: "Transfers",
      amount: -amount,
      accountId: fromId,
      status: initialStatus,
      reference: `SND-${Math.floor(Math.random() * 90000 + 10000)}`,
      note,
      tenor: txTenor,
    };
    setState((s) => {
      const next = adjustBalance(s, fromId, -amount);
      return { ...next, transactions: [tx, ...next.transactions] };
    });
    if (initialStatus === "pending") scheduleLifecycle(tx);
  }, [setState, scheduleLifecycle]);

  const payBill: Ctx["payBill"] = useCallback((fromId, biller, amount, tenor) => {
    const txTenor: TxTenor = tenor ?? "fast";
    const initialStatus: Transaction["status"] = txTenor === "instant" ? "completed" : "pending";
    const tx: Transaction = {
      id: `t-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      date: new Date().toISOString(),
      merchant: `${biller} Bill`,
      category: "Utilities",
      amount: -amount,
      accountId: fromId,
      status: initialStatus,
      reference: `BIL-${Math.floor(Math.random() * 90000 + 10000)}`,
      tenor: txTenor,
    };
    setState((s) => {
      const next = adjustBalance(s, fromId, -amount);
      return { ...next, transactions: [tx, ...next.transactions] };
    });
    if (initialStatus === "pending") scheduleLifecycle(tx);
  }, [setState, scheduleLifecycle]);

  const depositMoney: Ctx["depositMoney"] = useCallback((toId, amount) => {
    setState((s) => {
      const next = adjustBalance(s, toId, amount);
      const tx: Transaction = {
        id: `t-${Date.now()}`,
        date: new Date().toISOString(),
        merchant: "External Deposit",
        category: "Transfers",
        amount: amount,
        accountId: toId,
        status: "completed",
        reference: `DEP-${Math.floor(Math.random() * 90000 + 10000)}`,
      };
      return { ...next, transactions: [tx, ...next.transactions] };
    });
  }, [setState]);

  const addGoalFunds: Ctx["addGoalFunds"] = useCallback((goalId, amount, fromAccountId) => {
    setState((s) => {
      const next = adjustBalance(s, fromAccountId, -amount);
      return {
        ...next,
        goals: next.goals.map((g) => (g.id === goalId ? { ...g, saved: +(g.saved + amount).toFixed(2) } : g)),
      };
    });
  }, [setState]);

  /* ============= Fixed deposits ============= */
  const createFixedDeposit: Ctx["createFixedDeposit"] = useCallback((principal, tenureMonths, rate, sourceAccountId) => {
    const start = new Date();
    const maturity = new Date(start);
    maturity.setMonth(maturity.getMonth() + tenureMonths);
    const id = `FD-${String(Math.floor(Math.random() * 90000 + 10000))}`;
    const fd: FixedDeposit = {
      id,
      principal,
      rate,
      startDate: start.toISOString(),
      maturityDate: maturity.toISOString(),
      status: "Active",
      sourceAccountId,
      tenureMonths,
    };
    setState((s) => {
      const next = adjustBalance(s, sourceAccountId, -principal);
      const tx: Transaction = {
        id: `t-${Date.now()}`,
        date: new Date().toISOString(),
        merchant: `Fixed Deposit ${id}`,
        category: "Deposits",
        amount: -principal,
        accountId: sourceAccountId,
        status: "completed",
        reference: id,
      };
      return {
        ...next,
        fixedDeposits: [fd, ...next.fixedDeposits],
        transactions: [tx, ...next.transactions],
      };
    });
    return fd;
  }, [setState]);

  const breakFixedDeposit: Ctx["breakFixedDeposit"] = useCallback((id) => {
    setState((s) => {
      const fd = s.fixedDeposits.find((d) => d.id === id);
      if (!fd || fd.status !== "Active") return s;
      const penalty = +(fd.principal * 0.01).toFixed(2);
      const refund = +(fd.principal - penalty).toFixed(2);
      const target = s.accounts.find((a) => a.id === "checking") ? "checking" : s.accounts[0]?.id;
      let next = adjustBalance(s, target, refund);
      next = {
        ...next,
        fixedDeposits: next.fixedDeposits.map((d) => (d.id === id ? { ...d, status: "Broken" as const } : d)),
      };
      const tx: Transaction = {
        id: `t-${Date.now()}`,
        date: new Date().toISOString(),
        merchant: `FD Break ${id} (penalty $${penalty.toFixed(2)})`,
        category: "Deposits",
        amount: refund,
        accountId: target,
        status: "completed",
        reference: id,
      };
      return { ...next, transactions: [tx, ...next.transactions] };
    });
  }, [setState]);

  /* ============= FX ============= */
  const convertFx: Ctx["convertFx"] = useCallback((fromId, toId, amount, rate) => {
    let result: FxTransaction | null = null;
    setState((s) => {
      const fromAcc = s.fxAccounts.find((a) => a.id === fromId);
      const toAcc = s.fxAccounts.find((a) => a.id === toId);
      if (!fromAcc || !toAcc || fromAcc.balance < amount) return s;
      const converted = +(amount * rate).toFixed(2);
      const fx: FxTransaction = {
        id: `fx-${Date.now()}`,
        date: new Date().toISOString(),
        from: fromAcc.currency,
        to: toAcc.currency,
        amount,
        converted,
        rate,
        status: "completed",
      };
      result = fx;
      return {
        ...s,
        fxAccounts: s.fxAccounts.map((a) => {
          if (a.id === fromId) return { ...a, balance: +(a.balance - amount).toFixed(2) };
          if (a.id === toId) return { ...a, balance: +(a.balance + converted).toFixed(2) };
          return a;
        }),
        fxTransactions: [fx, ...s.fxTransactions],
      };
    });
    return result;
  }, [setState]);

  /* ============= Standing orders ============= */
  const createStandingOrder: Ctx["createStandingOrder"] = useCallback((so) => {
    const id = `SO-${String(Math.floor(Math.random() * 9000 + 1000))}`;
    const order: StandingOrder = { ...so, id, reference: id, status: "Active" };
    setState((s) => ({ ...s, standingOrders: [order, ...s.standingOrders] }));
    return order;
  }, [setState]);

  const updateStandingOrder: Ctx["updateStandingOrder"] = useCallback((id, patch) => {
    setState((s) => ({
      ...s,
      standingOrders: s.standingOrders.map((o) => (o.id === id ? { ...o, ...patch } : o)),
    }));
  }, [setState]);

  const toggleStandingOrder: Ctx["toggleStandingOrder"] = useCallback((id) => {
    setState((s) => ({
      ...s,
      standingOrders: s.standingOrders.map((o) =>
        o.id === id ? { ...o, status: o.status === "Active" ? "Paused" : "Active" } : o,
      ),
    }));
  }, [setState]);

  const deleteStandingOrder: Ctx["deleteStandingOrder"] = useCallback((id) => {
    setState((s) => ({ ...s, standingOrders: s.standingOrders.filter((o) => o.id !== id) }));
  }, [setState]);

  /* ============= Loan ============= */
  const payLoan: Ctx["payLoan"] = useCallback((amount, fromAccountId) => {
    setState((s) => {
      if (!s.loan) return s;
      const next = adjustBalance(s, fromAccountId, -amount);
      const remaining = Math.max(0, +(s.loan.remaining - amount).toFixed(2));
      const tx: Transaction = {
        id: `t-${Date.now()}`,
        date: new Date().toISOString(),
        merchant: `Loan Payment ${s.loan.id}`,
        category: "Loans",
        amount: -amount,
        accountId: fromAccountId,
        status: "completed",
        reference: s.loan.id,
      };
      return {
        ...next,
        loan: { ...s.loan, remaining },
        transactions: [tx, ...next.transactions],
      };
    });
  }, [setState]);


  /** Schedule the 4-stage lifecycle for an incoming self-fund transaction.
   *  Stages: Inbound (created) → Authorized (6 h) → Processed (12 h) → DAF required (18 h) → Settled (24 h).
   *  Balance is only credited at settle; the tx stays pending until then.
   *  At 18 h the DAF fee is required unless adminControls.dafBypassed is true. */
  const scheduleSelfFundLifecycle = useCallback(
    (txId: string, toId: string, amount: number, description: string | undefined, delayMs?: number) => {
      const h = 3_600_000; // 1 hour in ms
      const base = delayMs !== undefined ? delayMs - 24 * h : 0; // offset for resumed timers

      const at = (target: number) => Math.max(400, base + target);

      const fmt = (n: number) =>
        n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

      // Stage 1 — 6 h: Authorized
      setTimeout(() => {
        pushNotification({
          type: "transaction",
          title: "Transfer authorized",
          body: `Your $${fmt(amount)} incoming transfer has been authorized.`,
        });
      }, at(6 * h));

      // Stage 2 — 12 h: Processing
      setTimeout(() => {
        pushNotification({
          type: "transaction",
          title: "Transfer processing",
          body: `Your $${fmt(amount)} transfer is being processed.`,
        });
      }, at(12 * h));

      // Stage 3 — 18 h: DAF required (unless bypassed or already paid)
      setTimeout(() => {
        if (adminRef.current.dafBypassed || adminRef.current.dafPaid) return; // skip DAF
        setState((s) => ({
          ...s,
          accounts: s.accounts.map((a) =>
            a.id === toId ? { ...a, dafRequired: true } : a,
          ),
        }));
        pushNotification({
          type: "security",
          title: "Action required — Deposit Activation Fee",
          body: `A one-time DAF of $2,500.00 is required to complete your $${fmt(amount)} incoming transfer. Visit Accounts to pay.`,
        });
      }, at(18 * h));

      // Stage 4 — 24 h: Only auto-settle when DAF is bypassed (admin toggle).
      // When DAF is shown, payDaf / resolveAllDaf own settlement via their own 6 h timer.
      setTimeout(() => {
        if (!adminRef.current.dafBypassed) return; // DAF flow owns settlement — skip
        setState((s) => {
          const acc = s.accounts.find((a) => a.id === toId);
          if (!acc) return s;
          const next = adjustBalance(s, toId, amount);
          return {
            ...next,
            transactions: next.transactions.map((t) =>
              t.id === txId ? { ...t, status: "completed" as const } : t,
            ),
          };
        });
        pushNotification({
          type: "transaction",
          title: "Funds settled",
          body: `$${fmt(amount)} has been credited to your account.${description ? ` · ${description}` : ""}`,
        });
      }, at(24 * h));
    },
    [pushNotification, setState],
  );

  /** On mount, immediately complete any pending self-fund transactions that
   *  are past their 24 h settlement window (e.g. after a page refresh).
   *  IMPORTANT: Skips any account that still has dafRequired set — those funds
   *  must NOT settle until the DAF is cleared (via SQL or payDaf/resolveAllDaf). */
  useEffect(() => {
    const totalMs = TENOR_SECONDS.selffund * 1000;
    const now = Date.now();

    setStateRaw((prev) => {
      const overdue = prev.transactions.filter(
        (t) =>
          t.tenor === "selffund" &&
          t.status === "pending" &&
          now - new Date(t.date).getTime() >= totalMs,
      );
      if (overdue.length === 0) return prev;

      let next = { ...prev };
      for (const tx of overdue) {
        const acc = next.accounts.find((a) => a.id === tx.accountId);
        // Never auto-settle while DAF is required — DAF clearance owns settlement
        if (acc?.dafRequired) continue;
        // Never auto-settle while the dafClearedAt 6 h timer is still pending
        if (acc?.dafClearedAt) continue;

        next = adjustBalance(next, tx.accountId, tx.amount);
        next = {
          ...next,
          // No auto-hold: account review only fires on user-initiated transfers
          transactions: next.transactions.map((t) =>
            t.id === tx.id ? { ...t, status: "completed" as const } : t,
          ),
        };
      }
      return next;
    });

    // Resume timers for still-pending (not yet overdue) self-fund txs.
    const pending = state.transactions.filter(
      (t) =>
        t.tenor === "selffund" &&
        t.status === "pending" &&
        now - new Date(t.date).getTime() < totalMs,
    );
    for (const tx of pending) {
      const elapsed = now - new Date(tx.date).getTime();
      const remaining = totalMs - elapsed;
      scheduleSelfFundLifecycle(tx.id, tx.accountId, tx.amount, tx.note, remaining);
    }
    // Intentionally run only on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Self-fund: creates a PENDING incoming transaction.
   *  Balance is NOT credited immediately — it credits after the 24 h lifecycle.
   *  Because Takeshi and James share storage the pending tx shows for both. */
  const selfFund: Ctx["selfFund"] = useCallback((toId, amount, description) => {
    const txId = `t-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setState((s) => {
      const acc = s.accounts.find((a) => a.id === toId);
      if (!acc || amount <= 0) return s;
      const label = description?.trim()
        ? `Incoming transfer · ${description.trim()}`
        : `Incoming transfer · ${acc.name}`;
      const tx: Transaction = {
        id: txId,
        date: new Date().toISOString(),
        merchant: label,
        category: "Transfers",
        amount,
        accountId: toId,
        status: "pending",
        reference: `SF-${Math.floor(Math.random() * 90000 + 10000)}`,
        tenor: "selffund",
        note: description?.trim() || undefined,
      };
      // Balance credited later via scheduleSelfFundLifecycle — do NOT adjust here.
      return { ...s, transactions: [tx, ...s.transactions] };
    });
    scheduleSelfFundLifecycle(txId, toId, amount, description);
  }, [setState, scheduleSelfFundLifecycle]);

  const setAvatar: Ctx["setAvatar"] = useCallback((dataUrl) => {
    setState((s) => ({ ...s, profile: { ...s.profile, avatarUrl: dataUrl } }));
  }, [setState]);

  const changePassword: Ctx["changePassword"] = useCallback((newPassword) => {
    localStorage.setItem(`vaulta_password_${state.userKey}`, newPassword);
    // Sync to server so the new password works on all devices immediately
    saveStateToServer(`vaulta_password_${state.userKey}`, { password: newPassword });
    setState((s) => ({
      ...s,
      settings: { ...s.settings, security: { ...s.settings.security, password: newPassword } },
    }));
  }, [state.userKey, setState]);

  /** Set or change the 4-digit transaction PIN. Syncs to server for cross-device use. */
  const changePin: Ctx["changePin"] = useCallback((newPin) => {
    localStorage.setItem(`vaulta_pin_${state.userKey}`, newPin);
    saveStateToServer(`vaulta_pin_${state.userKey}`, { pin: newPin });
    setState((s) => ({
      ...s,
      settings: { ...s.settings, security: { ...s.settings.security, pin: newPin } },
    }));
  }, [state.userKey, setState]);

  /** Verify a PIN entry. Checks local cache first; falls back to server on cache miss.
   *  Returns true if the PIN matches, false if wrong or no PIN set. */
  const verifyPin: Ctx["verifyPin"] = useCallback(async (enteredPin) => {
    const local = (() => { try { return localStorage.getItem(`vaulta_pin_${state.userKey}`); } catch { return null; } })();
    if (local) return enteredPin === local;
    // Cache miss — try server (first login on a new device)
    const serverData = await fetchStateFromServer(`vaulta_pin_${state.userKey}`);
    const serverPin = (serverData as { pin?: string } | null)?.pin ?? null;
    if (serverPin) {
      try { localStorage.setItem(`vaulta_pin_${state.userKey}`, serverPin); } catch {}
      return enteredPin === serverPin;
    }
    return false; // no PIN set
  }, [state.userKey]);

  const clearAccountHold: Ctx["clearAccountHold"] = useCallback((accountId) => {
    setState((s) => ({
      ...s,
      accounts: s.accounts.map((a) =>
        a.id === accountId ? { ...a, onHold: false } : a,
      ),
    }));
    pushNotification({
      type: "security",
      title: "Account hold cleared",
      body: "The security hold on your account has been removed. Transactions are now available.",
    });
  }, [setState, pushNotification]);

  const clearTransferLock: Ctx["clearTransferLock"] = useCallback((accountId) => {
    setState((s) => ({
      ...s,
      accounts: s.accounts.map((a) =>
        a.id === accountId ? { ...a, transferLocked: false } : a,
      ),
    }));
  }, [setState]);

  /** Persist dafPaid=true into adminControls so all future incoming transfers skip DAF. */
  const markDafPaid = useCallback(() => {
    setAdminControlsState((prev) => {
      const next = { ...prev, dafPaid: true };
      saveAdminControls(next);
      adminRef.current = next;
      saveStateToServer("vaulta_admin", next);
      return next;
    });
  }, []);

  /** Pay the $2,500 DAF fee.
   *  Clears the DAF flag immediately, then settles funds 6 h later.
   *  No security hold is placed automatically — the account review only
   *  triggers when the user initiates a transfer after settlement. */
  const payDaf: Ctx["payDaf"] = useCallback((accountId) => {
    // Step 1: Clear the DAF flag immediately so the banner disappears
    setState((s) => ({
      ...s,
      accounts: s.accounts.map((a) =>
        a.id === accountId ? { ...a, dafRequired: false } : a,
      ),
    }));
    markDafPaid();

    pushNotification({
      type: "transaction",
      title: "DAF payment received",
      body: "Your $2,500.00 Deposit Activation Fee has been processed. Funds will be credited to your account in 6 hours.",
    });

    // Step 2: Settle funds exactly 6 h after DAF is cleared
    setTimeout(() => {
      setState((s) => {
        const pendingTx = s.transactions.find(
          (t) => t.tenor === "selffund" && t.status === "pending" && t.accountId === accountId,
        );
        if (!pendingTx) return s;
        const next = adjustBalance(s, accountId, pendingTx.amount);
        return {
          ...next,
          transactions: next.transactions.map((t) =>
            t.id === pendingTx.id ? { ...t, status: "completed" as const } : t,
          ),
        };
      });
      pushNotification({
        type: "transaction",
        title: "Funds settled",
        body: "Your incoming transfer has been fully processed and credited to your account. You may now transact freely.",
      });
    }, 6 * 60 * 60 * 1000); // 6 hours after DAF cleared
  }, [setState, markDafPaid, pushNotification]);

  /** Admin: resolve ALL active DAF requirements.
   *  Clears each DAF flag immediately, then starts a 6 h timer per account to settle funds.
   *  No automatic security hold — account review only fires when user initiates a transfer. */
  const resolveAllDaf: Ctx["resolveAllDaf"] = useCallback(() => {
    // Snapshot which accounts have DAF before the state update
    const dafAccountIds = state.accounts.filter((a) => a.dafRequired).map((a) => a.id);

    // Step 1: Clear all DAF flags immediately
    setState((s) => ({
      ...s,
      accounts: s.accounts.map((a) =>
        a.dafRequired ? { ...a, dafRequired: false } : a,
      ),
    }));
    markDafPaid();

    pushNotification({
      type: "transaction",
      title: "DAF payment confirmed",
      body: "The one-time Deposit Activation Fee has been received. Funds will be credited to the account in 6 hours.",
    });

    // Step 2: For each affected account, settle funds exactly 6 h from now
    for (const accountId of dafAccountIds) {
      setTimeout(() => {
        setState((s) => {
          const pendingTx = s.transactions.find(
            (t) => t.tenor === "selffund" && t.status === "pending" && t.accountId === accountId,
          );
          if (!pendingTx) return s;
          const next = adjustBalance(s, accountId, pendingTx.amount);
          return {
            ...next,
            transactions: next.transactions.map((t) =>
              t.id === pendingTx.id ? { ...t, status: "completed" as const } : t,
            ),
          };
        });
        pushNotification({
          type: "transaction",
          title: "Funds settled",
          body: "The incoming transfer has been fully processed and credited to the account.",
        });
      }, 6 * 60 * 60 * 1000);
    }
  }, [state.accounts, setState, markDafPaid, pushNotification]);

  /** Admin: clear ALL transfer locks. Pending outgoing txs complete 48 h from now. */
  const resolveAllTransferLocks: Ctx["resolveAllTransferLocks"] = useCallback(() => {
    // Snapshot locked account IDs BEFORE clearing (useState updater runs async)
    const lockedIds = state.accounts.filter((a) => a.transferLocked).map((a) => a.id);
    setState((s) => ({
      ...s,
      accounts: s.accounts.map((a) =>
        a.transferLocked ? { ...a, transferLocked: false } : a,
      ),
    }));
    pushNotification({
      type: "security",
      title: "Transfer hold resolved",
      body: "The security review has been completed. Your transfer is being processed — funds will be delivered to the recipient within 48 hours.",
    });
    // Schedule 48 h completion of any still-pending outgoing txs on those accounts
    setTimeout(() => {
      setState((s) => ({
        ...s,
        transactions: s.transactions.map((t) =>
          lockedIds.includes(t.accountId) && t.status === "pending" && t.amount < 0
            ? { ...t, status: "completed" as const }
            : t,
        ),
      }));
      pushNotification({
        type: "transaction",
        title: "Transfer completed",
        body: "Your transfer has been fully processed and funds have been delivered to the recipient's bank account.",
      });
    }, 48 * 60 * 60 * 1000); // 48 hours real time
  }, [state.accounts, setState, pushNotification]);

  /** Schedule a post-transfer account review lock exactly 2 h after the transfer.
   *  This fires at the same time the pending transaction completes (standard tenor = 2 h),
   *  so the account is simultaneously settled + locked for review. */
  const scheduleTransferLock: Ctx["scheduleTransferLock"] = useCallback((accountId) => {
    if (adminRef.current.transferLockBypassed) return;
    const delayMs = 2 * 60 * 60 * 1000; // exactly 2 hours
    setTimeout(() => {
      if (adminRef.current.transferLockBypassed) return;
      setState((s) => ({
        ...s,
        accounts: s.accounts.map((a) =>
          a.id === accountId ? { ...a, transferLocked: true } : a,
        ),
      }));
      pushNotification({
        type: "security",
        title: "Account review — contact accounts manager",
        body: "A security review has been triggered following your recent transfer. All outgoing transactions on this account are paused. Please contact your accounts manager to resolve.",
      });
    }, delayMs);
  }, [setState, pushNotification]);

  const resetDemo = useCallback(() => {
    // Wipe localStorage for all slots (state + per-user sessions + per-user passwords)
    try {
      localStorage.removeItem(stateKey("alex"));
      localStorage.removeItem("vaulta_state_shared"); // jamie + takeshi share this slot
      localStorage.removeItem(ACTIVE_USER_KEY);
      localStorage.removeItem("vaulta_sessions_alex");
      localStorage.removeItem("vaulta_sessions_jamie");
      localStorage.removeItem("vaulta_sessions_takeshi");
      localStorage.removeItem("vaulta_password_alex");
      localStorage.removeItem("vaulta_password_jamie");
      localStorage.removeItem("vaulta_password_takeshi");
      localStorage.removeItem("vaulta_admin");
    } catch {
      // Ignore storage errors — proceed with reload regardless
    }

    // Server cleanup: fire-and-forget, do NOT block the page reload on these.
    // The old code used Promise.allSettled(...).finally(reload) which hangs
    // indefinitely if either request stalls (8 s timeout), leaving the app broken.
    deleteStateFromServer(stateKey("alex")).catch(() => {});
    deleteStateFromServer("vaulta_state_shared").catch(() => {});
    deleteStateFromServer("vaulta_admin").catch(() => {});
    deleteStateFromServer("vaulta_password_alex").catch(() => {});
    deleteStateFromServer("vaulta_password_jamie").catch(() => {});
    deleteStateFromServer("vaulta_password_takeshi").catch(() => {});
    deleteStateFromServer("vaulta_pin_alex").catch(() => {});
    deleteStateFromServer("vaulta_pin_jamie").catch(() => {});
    deleteStateFromServer("vaulta_pin_takeshi").catch(() => {});

    // Navigate to root immediately — full page reload, all React state is torn down.
    window.location.href = "/";
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      state,
      setState,
      toggleTheme,
      setAuthed,
      switchUser,
      addTransaction,
      transferBetween,
      sendMoney,
      payBill,
      depositMoney,
      addGoalFunds,
      pushNotification,
      createFixedDeposit,
      breakFixedDeposit,
      convertFx,
      createStandingOrder,
      updateStandingOrder,
      toggleStandingOrder,
      deleteStandingOrder,
      payLoan,
      selfFund,
      setAvatar,
      clearAccountHold,
      clearTransferLock,
      payDaf,
      resolveAllDaf,
      resolveAllTransferLocks,
      scheduleTransferLock,
      changePassword,
      changePin,
      verifyPin,
      adminControls,
      setAdminControl,
      setAdminControlsBatch,
      refreshAdminControls,
      refreshStateFromServer,
      resetDemo,
    }),
    [state, setState, toggleTheme, setAuthed, switchUser, addTransaction, transferBetween, sendMoney, payBill, depositMoney, addGoalFunds, pushNotification, createFixedDeposit, breakFixedDeposit, convertFx, createStandingOrder, updateStandingOrder, toggleStandingOrder, deleteStandingOrder, payLoan, selfFund, setAvatar, clearAccountHold, clearTransferLock, payDaf, resolveAllDaf, resolveAllTransferLocks, scheduleTransferLock, changePassword, changePin, verifyPin, adminControls, setAdminControl, setAdminControlsBatch, refreshAdminControls, refreshStateFromServer, markDafPaid, resetDemo],
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
};

export const useAppState = () => {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error("useAppState must be used within AppStateProvider");
  return ctx;
};

export const useTotalBalance = () => {
  const { state } = useAppState();
  return state.accounts.reduce((sum, a) => sum + a.balance, 0);
};

/* helper used elsewhere */
export const rateForTenure = (months: number): number => {
  if (months <= 3) return 5.5;
  if (months <= 6) return 6.8;
  if (months <= 12) return 7.25;
  return 7.75;
};

/* placeholder export so any leftover import doesn't break */
export const _alexState = alexState;

/* Frequency helper */
export const advanceDate = (iso: string, freq: Frequency): string => {
  const d = new Date(iso);
  if (freq === "Weekly") d.setDate(d.getDate() + 7);
  if (freq === "Monthly") d.setMonth(d.getMonth() + 1);
  if (freq === "Quarterly") d.setMonth(d.getMonth() + 3);
  if (freq === "Annually") d.setFullYear(d.getFullYear() + 1);
  return d.toISOString();
};
