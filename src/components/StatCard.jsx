// Stat Card Component
// Reusable card for displaying statistics

const StatCard = ({ title, value, subtitle, icon, color = "primary" }) => {
  const colorClasses = {
    primary: "bg-sky-500/10 text-sky-300 border-sky-500/40",
    green: "bg-emerald-500/10 text-emerald-300 border-emerald-500/40",
    red: "bg-rose-500/10 text-rose-300 border-rose-500/40",
    yellow: "bg-amber-500/10 text-amber-300 border-amber-500/40",
    blue: "bg-sky-500/10 text-sky-300 border-sky-500/40"
  };

  return (
    <div className="group relative overflow-hidden rounded-xl border border-slate-800 bg-slate-950/70 p-6 shadow-md transition-all duration-300 hover:-translate-y-1 hover:border-sky-500/80 hover:shadow-[0_0_35px_rgba(56,189,248,0.45)]">
      <div className="absolute inset-px rounded-[0.8rem] bg-gradient-to-br from-sky-500/10 via-slate-900/40 to-slate-950/80 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
      <div className="relative flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold tracking-wide uppercase text-slate-400">{title}</p>
          <p className="mt-2 text-3xl font-bold text-slate-50">{value}</p>
          {subtitle && <p className="mt-1 text-sm text-slate-400">{subtitle}</p>}
        </div>
        {icon && (
          <div
            className={`ml-4 inline-flex items-center justify-center rounded-xl border ${colorClasses[color]} p-3 transition-all duration-300 group-hover:scale-105 group-hover:shadow-[0_0_25px_currentColor]`}
          >
            {icon}
          </div>
        )}
      </div>
    </div>
  );
};

export default StatCard;

