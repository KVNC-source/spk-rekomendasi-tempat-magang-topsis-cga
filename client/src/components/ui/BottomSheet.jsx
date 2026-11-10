import { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";

const EXIT_MS = 200; // keep in step with --duration-exit
const CLOSE_DISTANCE = 110; // px dragged down before the sheet lets go
const CLOSE_VELOCITY = 0.6; // px/ms: a quick flick closes it too

const isDesktop = () => window.matchMedia("(min-width: 1024px)").matches;

/**
 * Bottom sheet on mobile (drag the top edge down to close), side panel from
 * 1024px up. Built on the native <dialog> for the focus trap, Esc and focus
 * restore. Entering uses ease-out, leaving ease-in; only transform and opacity
 * move. Drag is plain pointer events — no animation library needed.
 */
export default function BottomSheet({ open, onClose, title, children }) {
  const dialogRef = useRef(null);
  const panelRef = useRef(null);
  const drag = useRef({ active: false, startY: 0, dy: 0, startT: 0 });
  const titleId = useId();

  // Open / close, including the exit animation before the dialog really closes.
  useEffect(() => {
    const dialog = dialogRef.current;
    const panel = panelRef.current;
    if (!dialog || !panel) return undefined;

    if (open) {
      delete dialog.dataset.closing;
      panel.style.transform = "";
      if (!dialog.open) dialog.showModal();
      return undefined;
    }
    if (!dialog.open) return undefined;

    dialog.dataset.closing = "true";
    const timer = setTimeout(() => {
      dialog.close();
      delete dialog.dataset.closing;
      panel.style.transform = "";
      panel.style.removeProperty("--drag");
    }, EXIT_MS);
    return () => clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const root = document.documentElement;
    const previous = root.style.overflow;
    root.style.overflow = "hidden";
    return () => {
      root.style.overflow = previous;
    };
  }, [open]);

  const onPointerDown = (event) => {
    if (isDesktop() || event.target.closest("button")) return;
    drag.current = { active: true, startY: event.clientY, dy: 0, startT: event.timeStamp };
    event.currentTarget.setPointerCapture(event.pointerId);
    panelRef.current.style.transition = "none";
  };

  const onPointerMove = (event) => {
    if (!drag.current.active) return;
    const dy = Math.max(0, event.clientY - drag.current.startY);
    drag.current.dy = dy;
    panelRef.current.style.transform = `translateY(${dy}px)`;
  };

  const onPointerUp = (event) => {
    if (!drag.current.active) return;
    const { dy, startT } = drag.current;
    drag.current.active = false;
    const panel = panelRef.current;
    const velocity = dy / Math.max(event.timeStamp - startT, 1);

    if (dy > CLOSE_DISTANCE || velocity > CLOSE_VELOCITY) {
      // Hand over to the exit animation, starting from where the finger let go.
      panel.style.transition = "";
      panel.style.setProperty("--drag", `${dy}px`);
      dialogRef.current.dataset.closing = "true";
      onClose();
      return;
    }
    // Not far enough: settle back.
    panel.style.transition = "transform var(--duration-base) var(--ease-out-soft)";
    panel.style.transform = "";
    setTimeout(() => {
      panel.style.transition = "";
    }, 320);
  };

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      className="sheet m-0 h-dvh max-h-none w-screen max-w-none bg-transparent p-0 backdrop:bg-ink/55"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === dialogRef.current) onClose();
      }}
    >
      <div
        ref={panelRef}
        className="sheet-panel fixed inset-x-0 bottom-0 flex max-h-[88dvh] flex-col rounded-t-card bg-surface shadow-2xl lg:inset-y-0 lg:left-auto lg:right-0 lg:max-h-none lg:w-[26rem] lg:rounded-l-card lg:rounded-tr-none"
      >
        <div
          className="touch-none select-none border-b border-line px-5 pb-3 pt-2 lg:touch-auto"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <div aria-hidden="true" className="mx-auto mb-2 h-1 w-10 rounded-full bg-line-strong/50 lg:hidden" />
          <div className="flex items-start justify-between gap-4">
            <h2 id={titleId} className="pt-1.5 font-display text-xl font-bold text-ink">
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup"
              className="press -mr-2 grid size-11 shrink-0 place-items-center rounded-ctl text-ink hover:bg-sand-200 active:bg-sand-300"
            >
              <X aria-hidden="true" size={22} />
            </button>
          </div>
        </div>
        <div className="overflow-y-auto overscroll-contain px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-4">
          {children}
        </div>
      </div>
    </dialog>
  );
}
