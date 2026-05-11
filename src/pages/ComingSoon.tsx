import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export const ComingSoon = ({ title }: { title: string }) => (
  <div className="flex min-h-[60vh] items-center justify-center">
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex max-w-md flex-col items-center gap-4 text-center"
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-primary shadow-glow">
        <Sparkles className="h-7 w-7 text-primary-foreground" />
      </div>
      <h2 className="font-display text-2xl font-bold">{title}</h2>
      <p className="text-sm text-muted-foreground">
        This section is on the roadmap. Check back soon.
      </p>
      <Button asChild variant="outline">
        <Link to="/dashboard">Back to dashboard</Link>
      </Button>
    </motion.div>
  </div>
);

export default ComingSoon;
