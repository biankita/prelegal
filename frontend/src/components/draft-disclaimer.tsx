export function DraftDisclaimer() {
  return (
    <div
      role="note"
      className="flex items-start gap-3 rounded-lg border border-[#ecad0a]/40 bg-[#ecad0a]/10 px-4 py-3 text-xs text-[#032147]"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="mt-0.5 h-4 w-4 shrink-0 text-[#ecad0a]"
        aria-hidden
      >
        <path d="M12 9v4" />
        <path d="M12 17h.01" />
        <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      </svg>
      <p>
        <strong className="font-semibold">Draft only.</strong> This document is a
        draft and is not legal advice. Have it reviewed by qualified legal
        counsel before signing.
      </p>
    </div>
  );
}
