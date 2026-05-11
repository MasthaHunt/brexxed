import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface LogoProps {
  size?: number;
  showWordmark?: boolean;
  className?: string;
  animate?: boolean;
  monochrome?: boolean;
}

/**
 * Brex-inspired geometric mark: a bold filled square with an inward notch
 * and a horizontal slot — minimal, industrial, premium.
 */
export const Logo = ({
  size = 32,
  showWordmark = true,
  className,
  animate = true,
  monochrome = true,
}: LogoProps) => {
  const fill = monochrome ? "currentColor" : "hsl(var(--primary))";

  return (
    <div className={cn("flex items-center gap-2 text-foreground", className)}>
      <motion.svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        initial={animate ? { opacity: 0, scale: 0.85 } : false}
        animate={animate ? { opacity: 1, scale: 1 } : false}
        transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
        className="shrink-0"
        aria-label="Brex logo"
      >
        {/*
          Outer rounded square with two negative-space cuts:
          - a horizontal slot on the right edge
          - a small notch on the lower right
          Built via even-odd fill rule.
        */}
        <motion.path
          fillRule="evenodd"
          clipRule="evenodd"
          d="
            M10 6
            H54
            C58 6 58 6 58 10
            V54
            C58 58 58 58 54 58
            H10
            C6 58 6 58 6 54
            V10
            C6 6 6 6 10 6
            Z
            M44 22
            H30
            C28 22 28 22 28 24
            V30
            C28 32 28 32 30 32
            H44
            C46 32 46 32 46 30
            V24
            C46 22 46 22 44 22
            Z
            M44 38
            H34
            C32 38 32 38 32 40
            V46
            C32 48 32 48 34 48
            H44
            C46 48 46 48 46 46
            V40
            C46 38 46 38 44 38
            Z
          "
          fill={fill}
          initial={animate ? { pathLength: 0, opacity: 0 } : false}
          animate={animate ? { pathLength: 1, opacity: 1 } : false}
          transition={{ duration: 0.7, ease: "easeOut" }}
        />
      </motion.svg>
      {showWordmark && (
        <motion.span
          initial={animate ? { opacity: 0, x: -6 } : false}
          animate={animate ? { opacity: 1, x: 0 } : false}
          transition={{ duration: 0.4, delay: 0.25 }}
          className="font-display text-[1.35rem] font-bold leading-none tracking-tight text-foreground"
          style={{ letterSpacing: "-0.02em" }}
        >
          Brex
        </motion.span>
      )}
    </div>
  );
};
