import { motion } from "framer-motion";
import { Logo } from "./Logo";

export const Splash = () => {
  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
        className="flex flex-col items-center gap-5"
      >
        {/* Pulsing logo as the loader */}
        <motion.div
          animate={{ scale: [1, 1.06, 1], opacity: [0.85, 1, 0.85] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        >
          <Logo size={56} showWordmark={false} animate={false} />
        </motion.div>
        <motion.p
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground"
        >
          Brex
        </motion.p>
      </motion.div>
      <div className="absolute bottom-0 left-0 h-[2px] w-full overflow-hidden bg-muted/40">
        <motion.div
          initial={{ x: "-100%" }}
          animate={{ x: "100%" }}
          transition={{ duration: 1.4, ease: "easeInOut", repeat: Infinity }}
          className="h-full w-1/3 bg-foreground"
        />
      </div>
    </motion.div>
  );
};
