import { Link, NavLink } from 'react-router-dom';
import { CalendarDays, Dumbbell, LogOut, ShieldCheck, Ticket } from 'lucide-react';
import { homeFor, useAuth } from '../context/AuthContext.jsx';

const LINKS = {
  member: [
    { to: '/sessions', label: 'Sessions', icon: CalendarDays },
    { to: '/my-bookings', label: 'My bookings', icon: Ticket },
  ],
  admin: [{ to: '/admin', label: 'Admin', icon: ShieldCheck }],
};

export default function Navbar() {
  const { user, logout } = useAuth();
  const links = LINKS[user.role] ?? [];

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/85 backdrop-blur">
      <nav aria-label="Main" className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
        <Link to={homeFor(user)} className="flex items-center gap-2 rounded-lg text-lg font-extrabold tracking-tight">
          <span className="grid size-8 place-items-center rounded-xl bg-emerald-600 text-white shadow-sm">
            <Dumbbell className="size-4" aria-hidden="true" />
          </span>
          MatSlot
        </Link>

        {/* On phones the links wrap onto their own row (order-last + w-full) */}
        <ul className="order-last flex w-full gap-1 sm:order-none sm:w-auto">
          {links.map(({ to, label, icon: Icon }) => (
            <li key={to} className="flex-1 sm:flex-none">
              <NavLink
                to={to}
                className={({ isActive }) =>
                  `flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition ${
                    isActive ? 'bg-emerald-50 text-emerald-800' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
              >
                <Icon className="size-4" aria-hidden="true" />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>

        <div className="ml-auto flex min-w-0 items-center gap-2">
          <div className="min-w-0 text-right leading-tight">
            <p className="truncate text-sm font-semibold text-slate-800">{user.name}</p>
            <p className="text-xs capitalize text-slate-500">{user.role}</p>
          </div>
          <button
            type="button"
            onClick={logout}
            className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
          >
            <LogOut className="size-4" aria-hidden="true" />
            <span>Log out</span>
          </button>
        </div>
      </nav>
    </header>
  );
}
