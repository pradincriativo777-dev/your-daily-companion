export function JansolSunIcon({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle cx="16" cy="16" r="7" fill="url(#jansolSunGradient)" />
      {/* Ray elements */}
      <path
        d="M16 2V5M16 27V30M2 16H5M27 16H30M6.1 6.1L8.2 8.2M23.8 23.8L25.9 25.9M6.1 25.9L8.2 23.8M23.8 8.2L25.9 6.1"
        stroke="url(#jansolSunGradient)"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <defs>
        <linearGradient id="jansolSunGradient" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="#C8794A" />
          <stop offset="0.52" stopColor="#E3B94F" />
          <stop offset="1" stopColor="#F1D47D" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function JansolLogo({
  collapsed = false,
  darkBackground = true,
}: {
  collapsed?: boolean;
  darkBackground?: boolean;
}) {
  return (
    <div className="flex items-center gap-2.5 select-none">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#292722] border border-[#E3B94F]/30 shadow-xs shrink-0">
        <JansolSunIcon className="h-5 w-5" />
      </div>
      {!collapsed && (
        <div className="flex items-baseline gap-1.5">
          <span
            className={`text-lg font-black tracking-tight ${
              darkBackground ? "text-[#F8F6F1]" : "text-[#24231F]"
            }`}
          >
            JANSOL
          </span>
          <span className="rounded-md bg-[#E3B94F]/20 px-1.5 py-0.5 text-[10px] font-bold text-[#E3B94F] border border-[#E3B94F]/40 tracking-wider">
            OS
          </span>
        </div>
      )}
    </div>
  );
}
