import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Receipt, Plus, Zap, Wifi, Tv, Droplet, Copy, Check, Globe2, Building2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { useAppState } from "@/state/AppState";
import { formatCurrency } from "@/lib/format";
import { SuccessBurst } from "@/components/vaulta/SuccessBurst";
import { TxLoader } from "@/components/vaulta/TxLoader";
import { cn } from "@/lib/utils";

type Mode = "send" | "bills" | "add";

// Static FX rates for international wires (USD -> currency)
const INTL_RATES: Record<string, { rate: number; symbol: string; flag: string; country: string }> = {
  GBP: { rate: 0.79, symbol: "£", flag: "🇬🇧", country: "United Kingdom" },
  EUR: { rate: 0.92, symbol: "€", flag: "🇪🇺", country: "Eurozone" },
  NGN: { rate: 1540, symbol: "₦", flag: "🇳🇬", country: "Nigeria" },
  CAD: { rate: 1.37, symbol: "C$", flag: "🇨🇦", country: "Canada" },
  JPY: { rate: 156.4, symbol: "¥", flag: "🇯🇵", country: "Japan" },
  INR: { rate: 83.5, symbol: "₹", flag: "🇮🇳", country: "India" },
  AUD: { rate: 1.52, symbol: "A$", flag: "🇦🇺", country: "Australia" },
};
const INTL_FEE = 50; // flat USD wire fee

// Top Australian banks for AUD international transfers
const AUD_BANKS = [
  { name: "Westpac",                          swift: "WPACAU2S", recommended: true  },
  { name: "Commonwealth Bank of Australia",   swift: "CTBAAU2S", recommended: false },
  { name: "ANZ Bank",                         swift: "ANZBAU3M", recommended: false },
  { name: "National Australia Bank (NAB)",    swift: "NATAAU33", recommended: false },
  { name: "Macquarie Bank",                   swift: "MACQAU2S", recommended: false },
];

const BILLERS = [
  { id: "elec",  name: "Electricity", Icon: Zap,     fieldLabel: "Meter number",            placeholder: "e.g. MTR-4488-2231" },
  { id: "net",   name: "Internet",    Icon: Wifi,    fieldLabel: "Customer / service ID",   placeholder: "e.g. CUS-739201" },
  { id: "tv",    name: "Cable TV",    Icon: Tv,      fieldLabel: "Subscriber number",       placeholder: "e.g. SUB-78901" },
  { id: "water", name: "Water",       Icon: Droplet, fieldLabel: "Account number",          placeholder: "e.g. WTR-12345" },
];

const Transfer = () => {
  const [params, setParams] = useSearchParams();
  const tabParam = (params.get("tab") as Mode) || "send";
  const { state, sendMoney, payBill, pushNotification, scheduleTransferLock } = useAppState();

  const [mode, setMode] = useState<Mode>(tabParam);
  const [fromId, setFromId] = useState(state.accounts[0].id);

  // Send Money
  const [recipient, setRecipient] = useState("");
  const [selectedBenef, setSelectedBenef] = useState<string | null>(null);
  const [sendAmount, setSendAmount] = useState("");
  const [sendNote, setSendNote] = useState("");
  // International
  const [intlMode, setIntlMode] = useState(false);
  const [intlCurrency, setIntlCurrency] = useState<keyof typeof INTL_RATES>("GBP");
  const [intlBank, setIntlBank] = useState("");
  const [intlSwift, setIntlSwift] = useState("");
  const [intlIban, setIntlIban] = useState("");

  // Bills
  const [billerId, setBillerId] = useState(BILLERS[0].id);
  const [billAccount, setBillAccount] = useState("");
  const [billAmount, setBillAmount] = useState("");

  // Add Money — account selector for bank transfer instructions
  const [addAccountId, setAddAccountId] = useState(state.accounts[0].id);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Confirm/success modal
  const [reviewOpen, setReviewOpen] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [loaderOpen, setLoaderOpen] = useState(false);
  const [loaderLabel, setLoaderLabel] = useState("Processing…");

  const fromAccount = state.accounts.find((a) => a.id === fromId)!;
  const addAccount = state.accounts.find((a) => a.id === addAccountId) ?? state.accounts[0];
  const sendAmtNum = parseFloat(sendAmount) || 0;
  const billAmtNum = parseFloat(billAmount) || 0;
  const activeBiller = BILLERS.find((b) => b.id === billerId)!;

  // Format account number with dashes every 4 digits for display
  const formatAcctNum = (n: string) => n.replace(/(.{4})/g, "$1-").replace(/-$/, "");

  const recipientName = useMemo(() => {
    if (selectedBenef) return state.beneficiaries.find((b) => b.id === selectedBenef)?.name ?? recipient;
    return recipient;
  }, [selectedBenef, recipient, state.beneficiaries]);

  const onTabChange = (v: string) => {
    setMode(v as Mode);
    setParams({ tab: v });
  };

  const intlMeta = INTL_RATES[intlCurrency];
  const intlConverted = +(sendAmtNum * intlMeta.rate).toFixed(2);
  const intlTotal = sendAmtNum + INTL_FEE;

  // ----- Validation helpers -----
  // SWIFT/BIC: 4 letters bank + 2 letters country + 2 alnum location + optional 3 alnum branch
  const SWIFT_RE = /^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/;
  // Per-currency IBAN length (ISO 13616)
  const IBAN_LENGTHS: Record<string, number> = {
    GBP: 22, EUR: 22, NGN: 28, CAD: 0, JPY: 0, INR: 0, AUD: 0,
  };
  const cleanIban = (s: string) => s.replace(/\s+/g, "").toUpperCase();

  /** ISO 7064 MOD-97-10 IBAN checksum.
   *  Move first 4 chars to the end, convert letters → digits (A=10..Z=35),
   *  process digit-by-digit so we never overflow. */
  const ibanChecksumValid = (iban: string): boolean => {
    const rearranged = iban.slice(4) + iban.slice(0, 4);
    let remainder = 0;
    for (const ch of rearranged) {
      const code = ch.charCodeAt(0);
      const num = code >= 65 && code <= 90 ? code - 55 : code - 48; // A=10, 0=0
      if (num < 0 || num > 35) return false;
      const digits = String(num);
      for (const d of digits) remainder = (remainder * 10 + (d.charCodeAt(0) - 48)) % 97;
    }
    return remainder === 1;
  };

  const validateIban = (raw: string, currency: string): string | null => {
    const v = cleanIban(raw);
    if (v.length === 0) return "Account number / IBAN is required";
    const expected = IBAN_LENGTHS[currency];
    if (expected && expected > 0) {
      if (!/^[A-Z]{2}\d{2}[A-Z0-9]+$/.test(v)) return "IBAN must start with 2 letters + 2 digits";
      if (v.length !== expected) return `IBAN for ${currency} should be ${expected} characters`;
      const cc = v.slice(0, 2);
      if (currency === "GBP" && cc !== "GB") return "GBP IBANs must start with GB";
      if (currency === "NGN" && cc !== "NG") return "NGN IBANs must start with NG";
      if (!ibanChecksumValid(v)) return "IBAN checksum failed — please double-check";
    } else {
      if (v.length < 6 || v.length > 34) return "Account number must be 6–34 characters";
      if (!/^[A-Z0-9]+$/.test(v)) return "Account number must be letters and numbers only";
      if (/^(.)\1+$/.test(v)) return "Account number cannot be all the same character";
    }
    return null;
  };

  // Domestic recipient: name OR account number. Permissive but rejects blanks/junk.
  const validateDomesticRecipient = (val: string): string | null => {
    const t = val.trim();
    if (t.length < 2) return "Recipient must be at least 2 characters";
    if (t.length > 60) return "Recipient name is too long";
    if (!/^[A-Za-z0-9 .,'\-&]+$/.test(t)) return "Recipient contains invalid characters";
    return null;
  };

  const validateSend = () => {
    if (sendAmtNum <= 0) return "Enter an amount greater than 0";
    if (intlMode) {
      const name = recipientName.trim();
      if (name.length < 3) return "Beneficiary full name must be at least 3 characters";
      if (!/^[A-Za-z][A-Za-z .,'\-]+$/.test(name)) return "Beneficiary name must start with a letter and contain only letters/spaces";
      if (!/\s/.test(name)) return "Enter the beneficiary's full legal name (first + last)";
      if (!intlBank.trim() || intlBank.trim().length < 3) return "Beneficiary bank name is required";
      if (!/^[A-Za-z0-9 .,'\-&]+$/.test(intlBank.trim())) return "Bank name has invalid characters";
      const swift = intlSwift.trim().toUpperCase();
      if (!SWIFT_RE.test(swift)) return "Enter a valid SWIFT/BIC (e.g. BARCGB22 or BARCGB22XXX)";
      const ibanErr = validateIban(intlIban, intlCurrency);
      if (ibanErr) return ibanErr;
      const iban = cleanIban(intlIban);
      const expectedIban = IBAN_LENGTHS[intlCurrency];
      if (expectedIban && expectedIban > 0 && iban.slice(0, 2) !== swift.slice(4, 6)) {
        return "SWIFT country code must match the IBAN country code";
      }
      if (intlTotal > fromAccount.balance) return `Amount + ${formatCurrency(INTL_FEE)} wire fee exceeds balance`;
    } else {
      const recipientErr = validateDomesticRecipient(recipientName);
      if (recipientErr) return recipientErr;
      if (sendAmtNum > fromAccount.balance) return "Amount exceeds available balance";
    }
    return null;
  };
  const validateBill = () => {
    const acct = billAccount.trim();
    if (!acct) return "Account / meter number is required";
    if (acct.length < 4) return "Account / meter number is too short";
    if (acct.length > 24) return "Account / meter number is too long";
    if (!/^[A-Za-z0-9 \-]+$/.test(acct)) return "Account / meter number must be letters, digits, hyphens or spaces";
    if (billAmtNum <= 0) return "Enter an amount greater than 0";
    if (billAmtNum > fromAccount.balance) return "Amount exceeds available balance";
    return null;
  };
  const handleReview = () => {
    // Block all outgoing transactions when the source account is on security hold
    if (fromAccount?.onHold) {
      toast.error("Account on hold", {
        description: "A security hold is active on this account. Visit Accounts to verify and clear the hold before transacting.",
      });
      return;
    }
    // Block all outgoing transactions when the account has a temporary transfer lock
    if (fromAccount?.transferLocked) {
      toast.error("Account temporarily locked", {
        description: "A security review is in progress. Please contact your accounts manager to resolve the hold on this account.",
      });
      return;
    }
    let err: string | null = null;
    if (mode === "send") err = validateSend();
    if (mode === "bills") err = validateBill();
    if (err) { toast.error(err); return; }
    setReviewOpen(true);
  };

  // Loader duration: based on transaction complexity
  const loaderDuration = () => {
    if (mode === "send" && intlMode) return 2400;
    if (mode === "send") return 1100;
    return 1400; // bills
  };

  const handleConfirm = () => {
    setReviewOpen(false);
    setLoaderLabel(
      mode === "send" && intlMode ? "Sending international wire…"
        : mode === "send" ? "Sending transfer…"
        : "Processing payment…",
    );
    setLoaderOpen(true);
    setTimeout(() => {
      if (mode === "send") {
        if (intlMode) {
          const note = `Intl wire · ${intlBank} · ${intlMeta.symbol}${intlConverted.toLocaleString()} ${intlCurrency} · SWIFT ${intlSwift.toUpperCase()}${sendNote ? " · " + sendNote : ""}`;
          sendMoney(fromId, `${recipientName} (${intlCurrency})`, sendAmtNum, note, "wire");
          sendMoney(fromId, "International Wire Fee", INTL_FEE, `Wire fee for ${intlCurrency} transfer to ${intlBank}`, "instant");
          pushNotification({
            type: "transaction",
            title: "International wire initiated",
            body: `${formatCurrency(sendAmtNum)} → ${recipientName} (${intlCurrency}) is now en route. SWIFT clearing 1–3 business days.`,
          });
        } else {
          sendMoney(fromId, recipientName, sendAmtNum, sendNote || undefined, "standard");
          pushNotification({
            type: "transaction",
            title: "Transfer initiated",
            body: `${formatCurrency(sendAmtNum)} to ${recipientName} is processing.`,
          });
        }
      }
      if (mode === "bills") {
        payBill(fromId, activeBiller.name, billAmtNum, "fast");
        pushNotification({
          type: "transaction",
          title: `${activeBiller.name} bill scheduled`,
          body: `${formatCurrency(billAmtNum)} payment to ${activeBiller.name} is being processed.`,
        });
      }
      // Schedule post-transfer security lock (15–20 min, unless bypassed by admin)
      scheduleTransferLock(fromId);
      setLoaderOpen(false);
      setSuccessOpen(true);
      setTimeout(() => {
        setSuccessOpen(false);
        setSendAmount(""); setSendNote(""); setRecipient(""); setSelectedBenef(null);
        setIntlBank(""); setIntlSwift(""); setIntlIban("");
        setBillAccount(""); setBillAmount("");
      }, 1800);
    }, loaderDuration());
  };

  const copy = async (val: string, key: string) => {
    try {
      await navigator.clipboard.writeText(val);
      setCopiedField(key);
      setTimeout(() => setCopiedField(null), 1500);
    } catch { toast.error("Copy failed"); }
  };

  const previewBalance = (() => {
    const amt = mode === "send" ? sendAmtNum : mode === "bills" ? billAmtNum : 0;
    return Math.max(0, fromAccount.balance - amt);
  })();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight md:text-3xl">Transfer & Payments</h1>
        <p className="mt-1 text-sm text-muted-foreground">Send money, pay bills, and add funds.</p>
      </div>

      <Tabs value={mode} onValueChange={onTabChange} className="space-y-5">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="send"><Send className="mr-1.5 h-3.5 w-3.5" />Send</TabsTrigger>
          <TabsTrigger value="bills"><Receipt className="mr-1.5 h-3.5 w-3.5" />Bills</TabsTrigger>
          <TabsTrigger value="add"><Plus className="mr-1.5 h-3.5 w-3.5" />Add</TabsTrigger>
        </TabsList>

        {/* Security hold notice — shown when the selected source account is blocked */}
        {fromAccount?.onHold && mode !== "add" && (
          <div className="flex items-start gap-3 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
            <div>
              <p className="text-sm font-semibold text-destructive">
                Security hold — outgoing transactions blocked
              </p>
              <p className="mt-0.5 text-xs text-destructive/80">
                <span className="font-semibold">{fromAccount.name}</span> has an active security hold
                following a large incoming transfer. All outgoing transactions are paused.
                Visit <span className="font-semibold">Accounts</span> to verify and clear the hold.
              </p>
            </div>
          </div>
        )}

        {/* Transfer lock notice */}
        {fromAccount?.transferLocked && mode !== "add" && (
          <div className="flex items-start gap-3 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
            <div>
              <p className="text-sm font-semibold text-destructive">
                Temporary hold — contact accounts manager
              </p>
              <p className="mt-0.5 text-xs text-destructive/80">
                A security review has been triggered following a recent transfer on{" "}
                <span className="font-semibold">{fromAccount.name}</span>. All outgoing transactions
                are paused. Please contact your accounts manager or visit{" "}
                <span className="font-semibold">Accounts</span> to resolve.
              </p>
            </div>
          </div>
        )}

        {/* SEND */}
        <TabsContent value="send" className="grid gap-5 lg:grid-cols-[1fr_320px]">
          <div className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-card md:p-6">
            {/* International toggle */}
            <div className={cn(
              "flex items-center justify-between gap-3 rounded-xl border p-3 transition-colors",
              intlMode ? "border-primary/40 bg-accent/40" : "border-border bg-muted/30",
            )}>
              <div className="flex items-center gap-3">
                <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg", intlMode ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground")}>
                  <Globe2 className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold">International transfer</p>
                  <p className="text-[11px] text-muted-foreground">SWIFT wire to a foreign bank · {formatCurrency(INTL_FEE)} fee</p>
                </div>
              </div>
              <Switch checked={intlMode} onCheckedChange={setIntlMode} aria-label="Toggle international transfer" />
            </div>

            <div className="space-y-1.5">
              <Label>From account</Label>
              <Select value={fromId} onValueChange={setFromId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {state.accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name} • {formatCurrency(a.balance)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>{intlMode ? "Beneficiary name" : "Recipient"}</Label>
              <Input
                value={recipient}
                onChange={(e) => { setRecipient(e.target.value); setSelectedBenef(null); }}
                placeholder={intlMode ? "Full legal name as on account" : "Name or account number"}
              />
            </div>

            <AnimatePresence initial={false}>
              {intlMode && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden"
                >
                  <div className="space-y-3 rounded-xl border border-border bg-muted/20 p-3">
                    <div className="space-y-1.5">
                      <Label>Destination currency</Label>
                      <Select value={intlCurrency} onValueChange={(v) => { setIntlCurrency(v as keyof typeof INTL_RATES); setIntlBank(""); setIntlSwift(""); }}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(INTL_RATES).map(([code, info]) => (
                            <SelectItem key={code} value={code}>
                              <span className="mr-2">{info.flag}</span> {code} — {info.country}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Beneficiary bank</Label>
                      {intlCurrency === "AUD" ? (
                        <Select
                          value={intlBank}
                          onValueChange={(v) => {
                            const bank = AUD_BANKS.find((b) => b.name === v);
                            setIntlBank(v);
                            if (bank) setIntlSwift(bank.swift);
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select an Australian bank" />
                          </SelectTrigger>
                          <SelectContent>
                            {AUD_BANKS.map((b) => (
                              <SelectItem key={b.name} value={b.name}>
                                <span className="flex items-center gap-2">
                                  {b.name}
                                  {b.recommended && (
                                    <span className="inline-flex items-center rounded-full bg-secondary/20 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-secondary">
                                      recommended
                                    </span>
                                  )}
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <div className="relative">
                          <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            value={intlBank}
                            onChange={(e) => setIntlBank(e.target.value)}
                            placeholder="e.g. Barclays Bank PLC"
                            className="pl-9"
                          />
                        </div>
                      )}
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label className="flex items-center justify-between">
                          <span>SWIFT / BIC</span>
                          {intlSwift.trim().length > 0 && (
                            <span className={cn(
                              "text-[10px] font-semibold uppercase tracking-wider",
                              SWIFT_RE.test(intlSwift.trim().toUpperCase()) ? "text-secondary" : "text-destructive",
                            )}>
                              {SWIFT_RE.test(intlSwift.trim().toUpperCase()) ? "✓ Valid" : "Invalid"}
                            </span>
                          )}
                        </Label>
                        <Input
                          value={intlSwift}
                          onChange={(e) => setIntlSwift(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
                          placeholder="e.g. BARCGB22"
                          maxLength={11}
                          className={cn(
                            "font-mono uppercase",
                            intlSwift.trim().length > 0 && !SWIFT_RE.test(intlSwift.trim().toUpperCase()) && "border-destructive/60 focus-visible:ring-destructive/40",
                          )}
                        />
                        <p className="text-[10.5px] text-muted-foreground">8 or 11 chars · letters/digits</p>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="flex items-center justify-between">
                          <span>{intlCurrency === "AUD" ? "BSB + Account #" : "IBAN / Account #"}</span>
                          {intlIban.trim().length > 0 && (
                            <span className={cn(
                              "text-[10px] font-semibold uppercase tracking-wider",
                              !validateIban(intlIban, intlCurrency) ? "text-secondary" : "text-destructive",
                            )}>
                              {!validateIban(intlIban, intlCurrency) ? "✓ Valid" : "Invalid"}
                            </span>
                          )}
                        </Label>
                        <Input
                          value={intlIban}
                          onChange={(e) => setIntlIban(e.target.value.toUpperCase())}
                          placeholder={intlCurrency === "AUD" ? "032001 123456789" : IBAN_LENGTHS[intlCurrency] ? "GB29 NWBK 6016 1331 9268 19" : "Account number"}
                          className={cn(
                            "font-mono",
                            intlIban.trim().length > 0 && validateIban(intlIban, intlCurrency) && "border-destructive/60 focus-visible:ring-destructive/40",
                          )}
                        />
                        <p className="text-[10.5px] text-muted-foreground">
                          {intlCurrency === "AUD"
                            ? "BSB (6 digits) followed by account number"
                            : IBAN_LENGTHS[intlCurrency]
                            ? `IBAN format · ${IBAN_LENGTHS[intlCurrency]} chars expected for ${intlCurrency}`
                            : `National account format for ${intlCurrency}`}
                        </p>
                      </div>
                    </div>
                    {/* Own-name disclaimer */}
                    <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-700 dark:text-amber-400">
                      <span className="font-semibold">Important:</span> International funds should only be sent to accounts held in the recipient&apos;s own name. Third-party transfers may be rejected or delayed.
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-1.5">
              <Label>Amount {intlMode && <span className="text-muted-foreground">(in USD)</span>}</Label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-display text-sm font-semibold text-muted-foreground">$</span>
                <Input
                  inputMode="decimal"
                  value={sendAmount}
                  onChange={(e) => setSendAmount(e.target.value.replace(/[^\d.]/g, ""))}
                  placeholder="0.00"
                  className="pl-7 font-display text-base font-semibold tabular-nums"
                />
              </div>
              {intlMode && sendAmtNum > 0 && (
                <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Recipient receives</span>
                    <span className="font-display text-sm font-semibold tabular-nums">
                      {intlMeta.symbol}{intlConverted.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {intlCurrency}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-muted-foreground">
                    <span>Rate · 1 USD = {intlMeta.rate} {intlCurrency}</span>
                    <span>Wire fee · {formatCurrency(INTL_FEE)}</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between border-t border-border pt-1">
                    <span className="font-medium text-foreground">Total debit</span>
                    <span className="font-semibold tabular-nums text-foreground">{formatCurrency(intlTotal)}</span>
                  </div>
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Available: <span className="font-medium text-foreground tabular-nums">{formatCurrency(fromAccount.balance)}</span>
                {sendAmtNum > 0 && (
                  <> · After: <span className="font-medium text-foreground tabular-nums">{formatCurrency(Math.max(0, fromAccount.balance - (intlMode ? intlTotal : sendAmtNum)))}</span></>
                )}
              </p>
            </div>

            <div className="space-y-1.5">
              <Label>Note (optional)</Label>
              <Textarea value={sendNote} onChange={(e) => setSendNote(e.target.value)} rows={2} maxLength={140} placeholder="What's it for?" />
            </div>

            <Button onClick={handleReview} className="w-full bg-gradient-primary shadow-glow">
              {intlMode ? "Review international wire" : "Review transfer"}
            </Button>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
            <h3 className="mb-3 font-display text-sm font-semibold">Saved beneficiaries</h3>
            <div className="space-y-2">
              {state.beneficiaries.map((b) => (
                <button
                  key={b.id}
                  onClick={() => { setSelectedBenef(b.id); setRecipient(b.name); }}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors",
                    selectedBenef === b.id ? "border-primary bg-accent" : "border-border hover:bg-muted/50",
                  )}
                >
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                    style={{ background: `hsl(${b.avatarColor})` }}
                  >
                    {b.name.split(" ").map((n) => n[0]).join("")}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{b.name}</p>
                    <p className="text-xs text-muted-foreground">{b.bank} • {b.account}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* BILLS */}
        <TabsContent value="bills" className="space-y-5">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-card md:p-6">
            <Label className="mb-3 block">Choose biller</Label>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {BILLERS.map((b) => {
                const selected = b.id === billerId;
                return (
                  <button
                    key={b.id}
                    onClick={() => { setBillerId(b.id); setBillAccount(""); }}
                    className={cn(
                      "flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-all",
                      selected ? "border-primary bg-accent shadow-glow" : "border-border hover:bg-muted/50",
                    )}
                  >
                    <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", selected ? "bg-primary text-primary-foreground" : "bg-muted text-foreground")}>
                      <b.Icon className="h-5 w-5" />
                    </div>
                    <span className="text-sm font-semibold">{b.name}</span>
                  </button>
                );
              })}
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label>From account</Label>
                <Select value={fromId} onValueChange={setFromId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {state.accounts.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name} • {formatCurrency(a.balance)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{activeBiller.fieldLabel}</Label>
                <Input
                  value={billAccount}
                  onChange={(e) => setBillAccount(e.target.value)}
                  placeholder={activeBiller.placeholder}
                />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label>Amount</Label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-display text-sm font-semibold text-muted-foreground">$</span>
                  <Input
                    inputMode="decimal"
                    value={billAmount}
                    onChange={(e) => setBillAmount(e.target.value.replace(/[^\d.]/g, ""))}
                    placeholder="0.00"
                    className="pl-7 font-display text-base font-semibold tabular-nums"
                  />
                </div>
              </div>
            </div>

            <Button onClick={handleReview} className="mt-5 w-full bg-gradient-primary shadow-glow md:w-auto">Review payment</Button>
          </div>
        </TabsContent>

        {/* ADD MONEY */}
        <TabsContent value="add" className="space-y-5">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-card md:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h3 className="font-display text-base font-semibold">Bank transfer instructions</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Send a wire or ACH from any external bank to fund this account.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Receiving account</Label>
                <Select value={addAccountId} onValueChange={setAddAccountId}>
                  <SelectTrigger className="w-52">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {state.accounts.map((a) => (
                      <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <dl className="mt-5 space-y-2">
              {[
                { k: "Bank name",       v: "Brex Bank N.A." },
                { k: "Account number",  v: formatAcctNum(addAccount.number) },
                { k: "Routing number",  v: addAccount.routing },
                { k: "IBAN",            v: addAccount.iban },
                { k: "SWIFT / BIC",     v: addAccount.swift },
              ].map((row) => (
                <div
                  key={row.k}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/30 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{row.k}</p>
                    <p className="truncate font-mono text-sm font-medium">{row.v}</p>
                  </div>
                  <button
                    onClick={() => copy(row.v, row.k)}
                    aria-label={`Copy ${row.k}`}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-card transition-colors hover:bg-muted"
                  >
                    {copiedField === row.k ? (
                      <Check className="h-4 w-4 text-secondary" />
                    ) : (
                      <Copy className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>
                </div>
              ))}
            </dl>
            <p className="mt-4 text-[11px] text-muted-foreground">
              Domestic ACH transfers typically arrive within 1–2 business days. SWIFT wires may take 1–3 business days depending on the sending bank.
            </p>
          </div>
        </TabsContent>
      </Tabs>

      {/* Review modal — polished */}
      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent className="overflow-hidden p-0 sm:max-w-[440px]">
          {/* Hero header */}
          <div className="relative bg-gradient-primary px-6 pb-6 pt-7 text-primary-foreground">
            <div className="absolute inset-0 bg-mesh opacity-30" aria-hidden />
            <div className="relative">
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-primary-foreground/70">
                Review {mode === "send" ? (intlMode ? "international wire" : "transfer") : "bill payment"}
              </p>
              <div className="mt-3 flex items-baseline gap-1.5">
                <span className="font-display text-[2.25rem] font-bold leading-none tabular-nums">
                  {formatCurrency(mode === "send" ? sendAmtNum : billAmtNum)}
                </span>
              </div>
              <p className="mt-1.5 text-[12.5px] text-primary-foreground/80">
                {mode === "send" && !intlMode && <>To <span className="font-semibold text-primary-foreground">{recipientName}</span></>}
                {mode === "send" && intlMode && <>To <span className="font-semibold text-primary-foreground">{recipientName}</span> · {intlMeta.flag} {intlCurrency}</>}
                {mode === "bills" && <>Pay <span className="font-semibold text-primary-foreground">{activeBiller.name}</span></>}
              </p>
            </div>
          </div>

          {/* Body */}
          <div className="px-6 pb-2 pt-5">
            <DialogHeader className="sr-only">
              <DialogTitle>Confirm transaction</DialogTitle>
              <DialogDescription>Review the details before confirming.</DialogDescription>
            </DialogHeader>

            <dl className="space-y-0 divide-y divide-border rounded-xl border border-border bg-card text-sm">
              {mode === "send" && !intlMode && (
                <>
                  <ReviewRow k="From account" v={fromAccount.name} sub={`Bal ${formatCurrency(fromAccount.balance)}`} />
                  <ReviewRow k="Recipient" v={recipientName} />
                  <ReviewRow k="Amount" v={formatCurrency(sendAmtNum)} mono />
                  {sendNote && <ReviewRow k="Note" v={sendNote} />}
                </>
              )}
              {mode === "send" && intlMode && (
                <>
                  <ReviewRow k="From account" v={fromAccount.name} sub={`Bal ${formatCurrency(fromAccount.balance)}`} />
                  <ReviewRow k="Beneficiary" v={recipientName} />
                  <ReviewRow k="Bank" v={`${intlMeta.flag} ${intlBank}`} />
                  <ReviewRow k="SWIFT / BIC" v={intlSwift.toUpperCase()} mono />
                  <ReviewRow k="IBAN" v={cleanIban(intlIban).replace(/(.{4})/g, "$1 ").trim()} mono />
                  <ReviewRow k="Recipient gets" v={`${intlMeta.symbol}${intlConverted.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${intlCurrency}`} mono />
                  <ReviewRow k="Exchange rate" v={`1 USD = ${intlMeta.rate} ${intlCurrency}`} />
                  <ReviewRow k="Wire fee" v={formatCurrency(INTL_FEE)} />
                  <ReviewRow k="Total debit" v={formatCurrency(intlTotal)} mono accent />
                  {sendNote && <ReviewRow k="Note" v={sendNote} />}
                </>
              )}
              {mode === "bills" && (
                <>
                  <ReviewRow k="From account" v={fromAccount.name} sub={`Bal ${formatCurrency(fromAccount.balance)}`} />
                  <ReviewRow k="Biller" v={activeBiller.name} />
                  <ReviewRow k={activeBiller.fieldLabel} v={billAccount} mono />
                  <ReviewRow k="Amount" v={formatCurrency(billAmtNum)} mono accent />
                </>
              )}
            </dl>

            <p className="mt-3 text-center text-[11px] text-muted-foreground">
              {intlMode
                ? "International wires typically settle in 1–3 business days."
                : "This action will appear in your transaction history immediately."}
            </p>
          </div>

          <DialogFooter className="gap-2 border-t border-border bg-muted/30 px-6 py-3 sm:gap-2">
            <Button variant="ghost" onClick={() => setReviewOpen(false)} className="flex-1 sm:flex-initial">
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              className="flex-1 bg-foreground text-background hover:bg-foreground/90 sm:flex-initial"
            >
              {mode === "send" && intlMode ? "Send wire" : mode === "send" ? "Send transfer" : "Pay bill"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Success modal */}
      <Dialog open={successOpen} onOpenChange={setSuccessOpen}>
        <DialogContent className="sm:max-w-sm">
          <AnimatePresence>
            {successOpen && (
              <SuccessBurst
                label={mode === "send" ? (intlMode ? "Wire sent!" : "Money sent!") : "Bill paid!"}
              />
            )}
          </AnimatePresence>
        </DialogContent>
      </Dialog>

      {/* In-app transaction loader */}
      <TxLoader open={loaderOpen} label={loaderLabel} />
    </div>
  );
};

const ReviewRow = ({ k, v, sub, mono, accent }: { k: string; v: string; sub?: string; mono?: boolean; accent?: boolean }) => (
  <div className="flex items-start justify-between gap-3 px-4 py-2.5">
    <span className="text-[12.5px] text-muted-foreground">{k}</span>
    <div className="min-w-0 max-w-[60%] text-right">
      <p className={cn(
        "truncate text-[13.5px] font-semibold text-foreground",
        mono && "font-mono tabular-nums",
        accent && "font-display text-[15px]",
      )}>
        {v}
      </p>
      {sub && <p className="mt-0.5 text-[10.5px] text-muted-foreground">{sub}</p>}
    </div>
  </div>
);

export default Transfer;
