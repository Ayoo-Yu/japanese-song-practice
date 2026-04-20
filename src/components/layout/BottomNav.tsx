import { NavLink } from 'react-router-dom'

const links = [
  { to: '/', label: '首页', icon: '🏠' },
  { to: '/search', label: '搜索', icon: '🔍' },
  { to: '/library', label: '曲库', icon: '📚' },
  { to: '/settings', label: '设置', icon: '⚙️' },
] as const

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 inset-x-0 bg-surface border-t border-border z-50">
      <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 text-xs transition-colors ${
                isActive ? 'text-accent' : 'text-text-secondary'
              }`
            }
          >
            <span className="text-xl">{link.icon}</span>
            <span>{link.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
