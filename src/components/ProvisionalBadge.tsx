import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

export function ProvisionalBadge({
  className,
  label = "DADO A CONFIRMAR",
}: {
  className?: string;
  label?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border border-warning/40 bg-warning/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-warning",
        className,
      )}
    >
      <AlertTriangle className="h-3 w-3" />
      {label}
    </span>
  );
}
