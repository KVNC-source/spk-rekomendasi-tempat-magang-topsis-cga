/**
 * Primary actions. On mobile it is fixed in the thumb zone, just above the tab
 * bar (respecting the safe area); from 1024px up it sticks to the bottom of the
 * content column instead.
 */
export default function ActionBar({ status, children }) {
  return (
    <div className="fixed inset-x-0 bottom-[calc(var(--tabbar-h)+env(safe-area-inset-bottom))] z-30 border-t border-line-strong/40 bg-mist-50 px-4 py-3 shadow-[0_-6px_16px_-10px_rgba(15,31,33,0.35)] lg:sticky lg:inset-x-auto lg:bottom-4 lg:mt-6 lg:rounded-card lg:border lg:border-line lg:px-5 lg:shadow-none">
      <div className="mx-auto flex max-w-3xl flex-col gap-2 lg:max-w-none lg:flex-row lg:items-center lg:justify-between lg:gap-4">
        <p role="status" className="min-w-0 text-sm text-muted empty:hidden">
          {status}
        </p>
        <div className="flex gap-2 lg:shrink-0 [&>*]:flex-1 lg:[&>*]:flex-none">{children}</div>
      </div>
    </div>
  );
}
