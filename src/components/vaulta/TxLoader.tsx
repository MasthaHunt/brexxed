import { motion, AnimatePresence } from "framer-motion";
import { Logo } from "./Logo";

interface TxLoaderProps {
  open: boolean;
  label?: string;
}

/**
 * Subtle, full-screen-overlay loader used for in-app transactions.
 * Uses the Brex logo with a pulse + orbit ring. Duration is controlled
 * by the parent via the `open` prop.
 */
export const TxLoader = ({ open, label = "Processing…" }: TxLoaderProps) => {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[120] flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm"
        >
          <div className="relative flex h-20 w-20 items-center justify-center">
            <motion.div
              className="absolute inset-0 rounded-full border-2 border-foreground/15"
            />
            <motion.div
              className="absolute inset-0 rounded-full border-2 border-transparent border-t-foreground"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
            <motion.div
              animate={{ scale: [1, 1.08, 1], opacity: [0.85, 1, 0.85] }}
              transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
            >
              <Logo size={32} showWordmark={false} animate={false} />
            </motion.div>
          </div>
          <motion.p
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mt-5 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground"
          >
            {label}
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
