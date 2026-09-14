"use client";

export function PrintActions() {
  return (
    <div className="no-print flex gap-2 p-4">
      <button
        type="button"
        onClick={() => window.print()}
        className="min-h-11 rounded-xl bg-ink px-4 text-white"
      >
        Print
      </button>
      <a href="/owner/codes" className="min-h-11 rounded-xl border border-line px-4 leading-[44px]">
        Back
      </a>
    </div>
  );
}
