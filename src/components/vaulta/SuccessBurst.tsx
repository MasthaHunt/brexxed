import { motion } from "framer-motion";
import { Check } from "lucide-react";

export const SuccessBurst = ({ label = "Success!" }: { label?: string }) => {
  return (
    <div className="relative flex flex-col items-center justify-center gap-4 py-8">
      <motion.div
        initial={{ scale: 0, rotate: -90 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 18 }}
        className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-mint shadow-glow"
      >
        <Check className="h-10 w-10 text-white" strokeWidth={3} />
        {/* confetti dots */}
        {Array.from({ length: 10 }).map((_, i) => {
          const angle = (i / 10) * Math.PI * 2;
          const r = 70;
          return (
            <motion.span
              key={i}
              initial={{ x: 0, y: 0, opacity: 0, scale: 0 }}
              animate={{
                x: Math.cos(angle) * r,
                y: Math.sin(angle) * r,
                opacity: [0, 1, 0],
                scale: [0, 1, 0.6],
              }}
              transition={{ duration: 0.9, delay: 0.15 + i * 0.02, ease: "easeOut" }}
              className="absolute h-2 w-2 rounded-full"
              style={{
                background: i % 2 === 0 ? "hsl(var(--primary))" : "hsl(var(--secondary))",
              }}
            />
          );
        })}
      </motion.div>
      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="font-display text-lg font-semibold text-foreground"
      >
        {label}
      </motion.p>
    </div>
  );
};
