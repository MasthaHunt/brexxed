import { useState } from "react";
import { motion } from "framer-motion";
import { Wallet, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAppState } from "@/state/AppState";
import { formatCurrency } from "@/lib/format";

export const SelfFundCard = () => {
  const { state, selfFund, pushNotification } = useAppState();
  const fundable = state.accounts.filter((a) => a.type === "checking" || a.type === "savings");

  const [open, setOpen] = useState(false);
  const [accountId, setAccountId] = useState(fundable[0]?.id ?? "");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");

  if (state.userKey !== "takeshi" || fundable.length === 0) return null;

  const numAmount = parseFloat(amount) || 0;
  const target = fundable.find((a) => a.id === accountId);

  const submit = () => {
    if (numAmount <= 0) {
      toast.error("Enter an amount greater than 0");
      return;
    }
    selfFund(accountId, numAmount, description.trim() || undefined);
    pushNotification({
      type: "transaction",
      title: "Incoming transfer initiated",
      body: `${formatCurrency(numAmount)} is on its way to ${target?.name ?? "your account"}. It will settle in ~24 hours.`,
    });
    toast.success("Transfer initiated", {
      description: `${formatCurrency(numAmount)} will appear in ${target?.name} once settled (~24 h).`,
    });
    setOpen(false);
    setAmount("");
    setDescription("");
  };

  return (
    <>
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="rounded-2xl border border-border bg-gradient-to-br from-primary/15 via-card to-card p-5 shadow-card md:p-6"
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-glow">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <p className="flex items-center gap-1.5 text-[13px] font-semibold text-primary">
                <Sparkles className="h-3.5 w-3.5" />
                Account funding
              </p>
              <h2 className="mt-0.5 font-display text-lg font-bold">
                Add funds to your accounts
              </h2>
              <p className="mt-1 max-w-md text-sm text-muted-foreground">
                Transfer funds into your checking or savings account. Incoming transfers are reviewed and credited within 24 hours.
              </p>
            </div>
          </div>
          <Button
            onClick={() => setOpen(true)}
            className="bg-foreground text-background shadow-glow hover:bg-foreground/90"
          >
            Add funds
          </Button>
        </div>
      </motion.section>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Add funds</DialogTitle>
            <DialogDescription>
              Funds will appear as a pending incoming transfer and settle to your balance within 24 hours.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Destination account</Label>
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {fundable.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name} • {formatCurrency(a.balance)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Amount</Label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">
                  $
                </span>
                <Input
                  inputMode="decimal"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))}
                  className="pl-7 tabular-nums"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Description <span className="text-muted-foreground">(optional)</span></Label>
              <Textarea
                placeholder="e.g. Monthly allowance, client payment…"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                maxLength={100}
              />
              <p className="text-[11px] text-muted-foreground">
                This will appear in your transaction history.
              </p>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submit} className="bg-gradient-primary shadow-glow">
              Send {numAmount > 0 ? formatCurrency(numAmount) : "funds"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
