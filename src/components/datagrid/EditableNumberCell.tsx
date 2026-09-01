// Célula numérica com edição inline e feedback de erro granular (borda + tooltip),
// sem toasts globais. Exclusiva do módulo MRP/BOM.
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface Props {
  value: number | null;
  onCommit: (value: number | null) => void;
  /** Retorna mensagem de erro ou null quando válido. */
  validate?: (value: number | null, raw: string) => string | null;
  allowEmpty?: boolean;
  placeholder?: string;
}

export function EditableNumberCell({
  value,
  onCommit,
  validate,
  allowEmpty = true,
  placeholder = "—",
}: Props) {
  const [raw, setRaw] = useState(value === null ? "" : String(value));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setRaw(value === null ? "" : String(value));
  }, [value]);

  const handle = (next: string) => {
    setRaw(next);
    const trimmed = next.trim();
    if (trimmed === "") {
      if (!allowEmpty) {
        setError("Campo obrigatório");
        return;
      }
      setError(null);
      onCommit(null);
      return;
    }
    const num = Number(trimmed.replace(",", "."));
    if (!Number.isFinite(num)) {
      setError("Valor numérico inválido");
      return;
    }
    if (num < 0) {
      setError("Não pode ser negativo");
      return;
    }
    const custom = validate?.(num, trimmed) ?? null;
    setError(custom);
    if (custom) return;
    onCommit(num);
  };

  return (
    <div className="relative group">
      <input
        inputMode="decimal"
        value={raw}
        placeholder={placeholder}
        onChange={(e) => handle(e.target.value)}
        aria-invalid={!!error}
        title={error ?? undefined}
        className={cn(
          "h-7 w-full rounded border bg-transparent px-1.5 text-right text-sm tabular-nums outline-none transition-colors",
          "border-transparent hover:border-border focus:border-primary focus:bg-background",
          error && "border-destructive bg-destructive/10 focus:border-destructive",
        )}
      />
      {error ? (
        <div className="pointer-events-none absolute right-0 top-full z-30 mt-1 hidden whitespace-nowrap rounded border border-destructive bg-popover px-2 py-1 text-xs text-destructive shadow-md group-focus-within:block group-hover:block">
          {error}
        </div>
      ) : null}
    </div>
  );
}
