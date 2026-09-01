// DataGrid virtualizado, isolado do table.tsx do shadcn (usado pelo Dashboard).
// Alta densidade, foco desktop, edição inline com navegação por teclado.
import { useCallback, useRef, type ReactNode } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { cn } from "@/lib/utils";

export interface DataGridColumn<T> {
  id: string;
  header: string;
  /** Largura em px — grid de alta densidade, sem colapso responsivo. */
  width: number;
  align?: "left" | "right";
  className?: string;
  render: (row: T, rowIndex: number) => ReactNode;
  /** Coluna editável participa da navegação por teclado. */
  editable?: boolean;
}

interface DataGridProps<T> {
  rows: T[];
  columns: DataGridColumn<T>[];
  rowKey: (row: T, index: number) => string;
  rowHeight?: number;
  height?: number;
  emptyMessage?: string;
  footer?: ReactNode;
}

export const ROW_HEIGHT = 34;

export function DataGrid<T>({
  rows,
  columns,
  rowKey,
  rowHeight = ROW_HEIGHT,
  height = 620,
  emptyMessage = "Nenhum registro.",
  footer,
}: DataGridProps<T>) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => rowHeight,
    overscan: 12,
  });

  const totalWidth = columns.reduce((a, c) => a + c.width, 0);
  const editableCols = columns.filter((c) => c.editable).map((c) => c.id);

  const focusCell = useCallback(
    (rowIndex: number, colId: string) => {
      if (rowIndex < 0 || rowIndex >= rows.length) return;
      virtualizer.scrollToIndex(rowIndex, { align: "auto" });
      requestAnimationFrame(() => {
        const el = scrollRef.current?.querySelector<HTMLElement>(
          `[data-cell="${rowIndex}:${colId}"] input`,
        );
        el?.focus();
        (el as HTMLInputElement | null)?.select?.();
      });
    },
    [rows.length, virtualizer],
  );

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const target = e.target as HTMLElement;
      const cell = target.closest<HTMLElement>("[data-cell]");
      if (!cell) return;
      const [rStr, colId] = (cell.dataset.cell ?? "").split(":");
      const r = Number(rStr);
      const c = editableCols.indexOf(colId);
      if (c < 0) return;

      const move = (dr: number, dc: number) => {
        e.preventDefault();
        let nr = r + dr;
        let nc = c + dc;
        if (nc >= editableCols.length) {
          nc = 0;
          nr += 1;
        } else if (nc < 0) {
          nc = editableCols.length - 1;
          nr -= 1;
        }
        focusCell(nr, editableCols[nc]);
      };

      switch (e.key) {
        case "ArrowDown":
        case "Enter":
          move(1, 0);
          break;
        case "ArrowUp":
          move(-1, 0);
          break;
        case "Tab":
          move(0, e.shiftKey ? -1 : 1);
          break;
        case "ArrowRight":
          if ((target as HTMLInputElement).selectionStart === (target as HTMLInputElement).value.length)
            move(0, 1);
          break;
        case "ArrowLeft":
          if ((target as HTMLInputElement).selectionStart === 0) move(0, -1);
          break;
        case "Escape":
          target.blur();
          break;
        default:
          break;
      }
    },
    [editableCols, focusCell],
  );

  const items = virtualizer.getVirtualItems();

  return (
    <div className="w-full overflow-x-auto" onKeyDown={onKeyDown}>
      <div style={{ minWidth: totalWidth }}>
        {/* Cabeçalho */}
        <div className="flex border-b border-border bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground">
          {columns.map((col) => (
            <div
              key={col.id}
              style={{ width: col.width, minWidth: col.width }}
              className={cn(
                "px-2 py-2 font-medium",
                col.align === "right" && "text-right",
                col.className,
              )}
            >
              {col.header}
            </div>
          ))}
        </div>

        {rows.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">{emptyMessage}</div>
        ) : (
          <div ref={scrollRef} className="overflow-y-auto" style={{ height }}>
            <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
              {items.map((vi) => {
                const row = rows[vi.index];
                return (
                  <div
                    key={rowKey(row, vi.index)}
                    className="absolute left-0 flex items-center border-b border-border/60 text-sm hover:bg-muted/30"
                    style={{
                      top: 0,
                      transform: `translateY(${vi.start}px)`,
                      height: vi.size,
                      width: "100%",
                    }}
                  >
                    {columns.map((col) => (
                      <div
                        key={col.id}
                        data-cell={`${vi.index}:${col.id}`}
                        style={{ width: col.width, minWidth: col.width }}
                        className={cn(
                          "truncate px-2",
                          col.align === "right" && "text-right tabular-nums",
                          col.className,
                        )}
                      >
                        {col.render(row, vi.index)}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {footer ? (
          <div className="flex border-t border-border bg-muted/30 text-sm">{footer}</div>
        ) : null}
      </div>
    </div>
  );
}
