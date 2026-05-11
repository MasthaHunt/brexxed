import { useState } from "react";
import { AlertTriangle, Check, Copy, Download, Eye, ShieldCheck, BadgeDollarSign } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useAppState } from "@/state/AppState";
import type { Account } from "@/state/types";
import { AccountCard } from "@/components/vaulta/AccountCard";
import { formatCurrency, maskAccount } from "@/lib/format";


const CopyField = ({
  label,
  value,
  masked,
  badge,
}: {
  label: string;
  value: string;
  masked?: boolean;
  badge?: React.ReactNode;
}) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      // Always copy the FULL, real value (not the masked version) so users
      // get an authentic SWIFT/IBAN/account number on their clipboard.
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success(`${label} copied`);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error("Copy failed");
    }
  };
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/30 px-4 py-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
          {badge}
        </div>
        <p className="truncate font-mono text-sm font-medium tabular-nums">{masked ? maskAccount(value) : value}</p>
      </div>
      <button
        onClick={handleCopy}
        aria-label={`Copy ${label}`}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card transition-colors hover:bg-muted"
      >
        <AnimatePresence mode="wait" initial={false}>
          {copied ? (
            <motion.span key="check" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
              <Check className="h-4 w-4 text-secondary" />
            </motion.span>
          ) : (
            <motion.span key="copy" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
              <Copy className="h-4 w-4 text-muted-foreground" />
            </motion.span>
          )}
        </AnimatePresence>
      </button>
    </div>
  );
};

const AccountFields = ({ account, swiftVisible }: { account: Account; swiftVisible: boolean }) => (
  <div className="grid gap-2.5 sm:grid-cols-2">
    <CopyField label="Account number" value={account.number} masked />
    <CopyField label="Routing number" value={account.routing} />
    <CopyField label="IBAN" value={account.iban} />
    {swiftVisible ? (
      <CopyField label="SWIFT / BIC" value={account.swift} />
    ) : (
      <div className="flex flex-col gap-1 rounded-xl border border-border bg-muted/30 px-3.5 py-2.5">
        <span className="text-[11px] font-medium text-muted-foreground">SWIFT / BIC</span>
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm tracking-wide text-muted-foreground/60 italic">
            Pending update
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
            <ShieldCheck className="h-2.5 w-2.5" />
            On hold
          </span>
        </div>
      </div>
    )}
    <CopyField label="Network" value={account.network} />
  </div>
);

const AccountDetails = ({
  account,
  swiftVisible,
  onOpenModal,
}: {
  account: Account;
  swiftVisible: boolean;
  onOpenModal: () => void;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.25 }}
    className="grid gap-6 lg:grid-cols-[minmax(0,360px)_1fr]"
  >
    <AccountCard account={account} />
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-display text-lg font-semibold">{account.name}</h3>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onOpenModal}>
            <Eye className="mr-1.5 h-3.5 w-3.5" />
            View details
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => toast.success("Statement download started")}
          >
            <Download className="mr-1.5 h-3.5 w-3.5" />
            Statement
          </Button>
        </div>
      </div>
      <p className="text-sm text-muted-foreground">
        Available balance:{" "}
        <span className="font-semibold text-foreground tabular-nums">
          {formatCurrency(account.balance)}
        </span>
      </p>

      {/* DAF required banner */}
      {account.dafRequired && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3">
          <BadgeDollarSign className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">Deposit Activation Fee required</p>
            <p className="mt-0.5 text-xs text-amber-700/80 dark:text-amber-400/80">
              A one-time Deposit Activation Fee of <span className="font-semibold">$2,500.00</span> must
              be paid before your incoming transfer can be fully processed and funds released.
              This is a one-time payment — once paid, no future incoming transfers will require this fee.
              Please contact your accounts manager to complete payment.
            </p>
          </div>
        </div>
      )}

      {/* Security hold banner */}
      {account.onHold && (
        <div className="flex items-start gap-3 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-destructive">Security hold active</p>
            <p className="mt-0.5 text-xs text-destructive/80">
              A large incoming transfer triggered an automatic security review. All outgoing
              transactions from this account are paused. Please contact your accounts manager to resolve.
            </p>
          </div>
        </div>
      )}

      {/* Transfer lock banner */}
      {account.transferLocked && (
        <div className="flex items-start gap-3 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-destructive">Temporary hold — contact accounts manager</p>
            <p className="mt-0.5 text-xs text-destructive/80">
              A security review has been triggered following your recent transfer. All outgoing
              transactions are paused. Please contact your accounts manager to resolve this hold.
            </p>
          </div>
        </div>
      )}

      <AccountFields account={account} swiftVisible={swiftVisible} />
      <p className="pt-1 text-[11px] leading-relaxed text-muted-foreground">
        Share your SWIFT/BIC and IBAN with international senders. For domestic ACH transfers, provide the routing and account numbers.
      </p>
    </div>
  </motion.div>
);

const Accounts = () => {
  const { state, adminControls } = useAppState();
  const checking = state.accounts.filter((a) => a.type === "checking");
  const savings = state.accounts.filter((a) => a.type === "savings");
  const [modalAccount, setModalAccount] = useState<Account | null>(null);

  const renderList = (items: Account[]) =>
    items.map((a) => (
      <div key={a.id} className="rounded-2xl border border-border bg-card p-5 shadow-card md:p-6">
        <AccountDetails
          account={a}
          swiftVisible={adminControls.swiftVisible}
          onOpenModal={() => setModalAccount(a)}
        />
      </div>
    ));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight md:text-3xl">Accounts</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage your Brex accounts and details.</p>
      </div>

      <Tabs defaultValue="all" className="space-y-5">
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="checking">Checking</TabsTrigger>
          <TabsTrigger value="savings">Savings</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-6">{renderList(state.accounts)}</TabsContent>
        <TabsContent value="checking" className="space-y-6">{renderList(checking)}</TabsContent>
        <TabsContent value="savings" className="space-y-6">{renderList(savings)}</TabsContent>
      </Tabs>

      {/* Full account details modal */}
      <Dialog open={!!modalAccount} onOpenChange={(o) => !o && setModalAccount(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{modalAccount?.name}</DialogTitle>
            <DialogDescription>
              Full account details — tap any field to copy the complete value to your clipboard.
            </DialogDescription>
          </DialogHeader>
          {modalAccount && (
            <div className="space-y-4">
              <div className="rounded-xl border border-border bg-muted/30 p-4">
                <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Available balance
                </p>
                <p className="mt-1 font-display text-2xl font-bold tabular-nums">
                  {formatCurrency(modalAccount.balance)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {modalAccount.network} · {modalAccount.type === "checking" ? "Checking" : modalAccount.type === "savings" ? "Savings" : "Investment"}
                </p>
              </div>
              <AccountFields account={modalAccount} swiftVisible={adminControls.swiftVisible} />
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                For international wires, share your SWIFT/BIC and IBAN with the sending bank. Use the routing number for domestic ACH transfers.
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Accounts;
