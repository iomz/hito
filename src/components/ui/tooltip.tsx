import React, { useState, useRef, useEffect } from "react";

interface TooltipProps {
  children: React.ReactNode;
  delayDuration?: number;
}

interface TooltipTriggerProps {
  asChild?: boolean;
  children: React.ReactElement;
}

interface TooltipContentProps {
  children: React.ReactNode;
  side?: "top" | "right" | "bottom" | "left";
}

const TooltipContext = React.createContext<{
  open: boolean;
  setOpen: (open: boolean) => void;
}>({ open: false, setOpen: () => {} });

export function Tooltip({ children, delayDuration = 300 }: TooltipProps) {
  const [open, setOpen] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleOpen = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => setOpen(true), delayDuration);
  };

  const handleClose = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setOpen(false);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <TooltipContext.Provider value={{ open, setOpen }}>
      <div
        onMouseEnter={handleOpen}
        onMouseLeave={handleClose}
        onFocus={handleOpen}
        onBlur={handleClose}
        style={{ display: "inline-block", position: "relative" }}
      >
        {children}
      </div>
    </TooltipContext.Provider>
  );
}

export function TooltipTrigger({ asChild, children }: TooltipTriggerProps) {
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      "data-tooltip-trigger": "true",
    } as any);
  }
  return (
    <div data-tooltip-trigger="true" style={{ display: "inline-block" }}>
      {children}
    </div>
  );
}

export function TooltipContent({ children, side = "top" }: TooltipContentProps) {
  const context = React.useContext(TooltipContext);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const contentRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    // Find the trigger element using the data attribute
    const parent = contentRef.current?.parentElement;
    if (parent) {
      const trigger = parent.querySelector('[data-tooltip-trigger]') as HTMLElement | null;
      triggerRef.current = trigger;
    }
  }, [context.open]);

  useEffect(() => {
    if (!context.open || !contentRef.current || !triggerRef.current) return;

    const updatePosition = () => {
      if (!contentRef.current || !triggerRef.current) return;

      const triggerRect = triggerRef.current.getBoundingClientRect();
      const contentRect = contentRef.current.getBoundingClientRect();
      const parentRect = contentRef.current.parentElement?.getBoundingClientRect() || { left: 0, top: 0 };
      const gap = 8;

      let top = 0;
      let left = 0;

      // Calculate position relative to parent container
      const triggerLeft = triggerRect.left - parentRect.left;
      const triggerTop = triggerRect.top - parentRect.top;

      switch (side) {
        case "top":
          top = triggerTop - contentRect.height - gap;
          left = triggerLeft + triggerRect.width / 2 - contentRect.width / 2;
          break;
        case "bottom":
          top = triggerTop + triggerRect.height + gap;
          left = triggerLeft + triggerRect.width / 2 - contentRect.width / 2;
          break;
        case "left":
          top = triggerTop + triggerRect.height / 2 - contentRect.height / 2;
          left = triggerLeft - contentRect.width - gap;
          break;
        case "right":
          top = triggerTop + triggerRect.height / 2 - contentRect.height / 2;
          left = triggerLeft + triggerRect.width + gap;
          break;
      }

      setPosition({ top, left });
    };

    // Small delay to ensure content is rendered
    const timeout = setTimeout(updatePosition, 0);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    
    return () => {
      clearTimeout(timeout);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [context.open, side]);

  if (!context.open) return null;

  return (
    <div
      ref={contentRef}
      className="tooltip-content"
      data-side={side}
      style={{
        position: "absolute",
        top: `${position.top}px`,
        left: `${position.left}px`,
        zIndex: 1000,
        pointerEvents: "none",
      }}
    >
      {children}
    </div>
  );
}

