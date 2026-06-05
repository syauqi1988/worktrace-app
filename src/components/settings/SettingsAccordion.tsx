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
  rememberKey?: string; // kept for API compatibility (unused)
  tutorialId?: string;
}

const OPEN_EVENT = "wt:settings-accordion-open";

export default function SettingsAccordion({
  id,
  icon,
  title,
  description,
  children,
  danger = false,
  tutorialId,
}: SettingsAccordionProps) {
  // Default: all closed.
  const [open, setOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  // Listen for sibling accordions opening — auto-close this one.
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail;
      if (detail !== id) setOpen(false);
    };
    window.addEventListener(OPEN_EVENT, handler as EventListener);
    return () => window.removeEventListener(OPEN_EVENT, handler as EventListener);
  }, [id]);

  const toggle = () => {
    setOpen((prev) => {
      const next = !prev;
      if (next) {
        // Broadcast so siblings close.
        window.dispatchEvent(new CustomEvent(OPEN_EVENT, { detail: id }));
      }
      return next;
    });
  };

  return (
    <section
      id={id}
      data-tutorial={tutorialId}
      className={cn(
        "bg-card rounded-xl border overflow-hidden transition-colors",
        danger ? "border-destructive/30" : "border-border",
      )}
    >
      <button
        type="button"
        onClick={toggle}
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
