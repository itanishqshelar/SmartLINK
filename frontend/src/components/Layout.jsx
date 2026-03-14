import { Link, NavLink } from "react-router-dom";
import {
  Archive,
  Blend,
  Bot,
  ChevronRight,
  Files,
  Share2,
  Sparkles,
} from "lucide-react";

const links = [
  { to: "/vault", label: "Vault", icon: Archive },
  { to: "/dashboard", label: "Dashboard", icon: Blend },
  { to: "/transitions", label: "Transitions", icon: ChevronRight },
  { to: "/ask", label: "Ask AI", icon: Bot },
  { to: "/share", label: "Share", icon: Share2 },
];

export default function Layout({ children }) {
  return (
    <div className="min-h-screen bg-base text-slate-100">
      {/* ── Mobile top nav ──────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-40 border-b border-borderline bg-surface/95 px-3 py-2 md:hidden">
        <nav className="grid grid-cols-5 gap-1">
          {links.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={`mobile-${item.to}`}
                to={item.to}
                className={({ isActive }) =>
                  `flex flex-col items-center justify-center gap-0.5 rounded-md border px-1 py-2 font-mono text-[10px] transition ${isActive
                    ? "border-cyan/60 bg-cyan/10 text-cyan"
                    : "border-borderline bg-base text-slate-400"
                  }`
                }
              >
                <Icon size={14} />
                {item.label}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* ── Desktop layout ──────────────────────────────────────────────────── */}
      <div className="mx-auto flex w-full max-w-[1440px]">
        {/* Sidebar */}
        <aside className="sticky top-0 hidden h-screen w-64 flex-col border-r border-borderline bg-surface/70 p-6 md:flex">
          {/* Brand */}
          <Link to="/" className="font-mono text-2xl tracking-tight text-cyan">
            SMARTLINK
          </Link>
          <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-400">
            Connecting your life
          </p>

          {/* Nav links */}
          <nav className="mt-8 space-y-1">
            {links.map((item) => {
              const Icon = item.icon;
              const isAsk = item.to === "/ask";
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `group flex items-center gap-3 rounded-lg border px-3 py-2 font-mono text-sm transition ${isActive
                      ? isAsk
                        ? "border-violet/60 bg-violet/10 text-violet-300"
                        : "border-cyan/60 bg-cyan/10 text-cyan"
                      : "border-transparent text-slate-300 hover:border-borderline hover:bg-white/5"
                    }`
                  }
                >
                  <Icon size={16} />
                  <span className="flex-1">{item.label}</span>
                  {isAsk && (
                    <span className="rounded-full bg-violet/20 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-violet-300">
                      AI
                    </span>
                  )}
                </NavLink>
              );
            })}
          </nav>

          {/* Spacer */}
          <div className="flex-1" />

        </aside>

        {/* Main content */}
        <main className="w-full p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
