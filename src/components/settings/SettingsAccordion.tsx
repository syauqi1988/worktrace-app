import { ReactNode, useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface SettingsAccordionProps {
  id: string;
  icon: ReactNode;
  title: string;
  description: string;
  children: ReactNode;
  defaultOpen?: boolean;
  danger?: boolean;
  rememberKey?: string; // localStorage key (defaults to id)
}

const STORAGE_PREFIX = "wt_settings_open_";

export default function SettingsAccordion({
  id,
  icon,
  title,
  description,
  children,
  defaultOpen = false,
  danger = false,
  rememberKey,
}: SettingsAccordionProps) {
  const key = STORAGE_PREFIX + (rememberKey ?? id);
  const [open, setOpen] = useState(() => {
    try {
      const v = localStorage.getItem(key);
      if (v === "1") return true;
      if (v === "0") return false;
    } catch {
      /* ignore */
    }
    return defaultOpen;
  });
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      localStorage.setItem(key, open ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, [open, key]);

  return (
    <section
      id={id}
      className={cn(
        "bg-card rounded-xl border overflow-hidden transition-colors",
        danger ? "border-destructive/30" : "border-border",
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={cn(
          "w-full flex items-center gap-3 p-5 text-left hover:bg-accent/40 transition-colors",
          danger && "bg-destructive/5",
        )}
      >
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-lg shrink-0",
            danger ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary",
          )}
        >
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <h2
            className={cn(
              "text-base font-bold truncate",
              danger ? "text-destructive" : "text-foreground",
            )}
          >
            {title}
          </h2>
          <p className="text-xs text-muted-foreground truncate">{description}</p>
        </div>
        <ChevronDown
          className={cn(
            "h-5 w-5 text-muted-foreground shrink-0 transition-transform duration-300",
            open && "rotate-180",
          )}
        />
      </button>
      <div
        ref={contentRef}
        className={cn(
          "grid transition-[grid-template-rows] duration-300 ease-in-out",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="overflow-hidden">
          <div className="border-t border-border p-5 space-y-4">{children}</div>
        </div>
      </div>
    </section>
  );
}
