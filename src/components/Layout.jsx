import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import logoUou from '../assets/logo-uou.png';
import {
  LayoutDashboard,
  Users,
  Video,
  DollarSign,
  TrendingUp,
  Building2,
  Settings,
  LogOut,
} from 'lucide-react';

export default function Layout() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    if (window.confirm('Deseja sair?')) {
      await signOut(auth);
      navigate('/login');
    }
  };

  const menuItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/users', icon: Users, label: 'Usuários' },
    { path: '/lives', icon: Video, label: 'Lives' },
    { path: '/financial', icon: DollarSign, label: 'Financeiro' },
    { path: '/creator-levels', icon: TrendingUp, label: 'Níveis de Criadores' },
    { path: '/companies', icon: Building2, label: 'Empresas' },
    { path: '/settings', icon: Settings, label: 'Configurações' },
  ];

  return (
    <div style={styles.container}>
      {/* Visual global do painel (fundo escuro, barras de rolagem, campos) */}
      <style>{`
        html, body { background: #010208; margin: 0; color-scheme: dark; }
        * { scrollbar-width: thin; scrollbar-color: #2f2f33 transparent; }
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-thumb { background: #2f2f33; border-radius: 8px; }
        input, textarea, select, button { font-family: inherit; }
        input:focus, textarea:focus, select:focus { border-color: #555 !important; outline: none; }
        input::placeholder, textarea::placeholder { color: #55555f; }
        .uou-nav:hover { background: rgba(255,255,255,0.04); color: #fff; }
      `}</style>

      {/* Sidebar */}
      <aside style={styles.sidebar}>
        <div style={styles.logo}>
          <img src={logoUou} alt="UOU" style={styles.logoImg} />
          <p style={styles.logoSubtext}>Admin</p>
        </div>

        <nav style={styles.nav}>
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className="uou-nav"
              style={({ isActive }) => ({
                ...styles.navItem,
                ...(isActive ? styles.navItemActive : {}),
              })}
            >
              <item.icon size={19} strokeWidth={1.8} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <button style={styles.logoutButton} onClick={handleLogout}>
          <LogOut size={18} strokeWidth={1.8} />
          <span>Sair</span>
        </button>
      </aside>

      {/* Main Content */}
      <main style={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    height: '100vh',
    backgroundColor: '#010208',
    color: '#f0f0f0',
    fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif",
  },
  sidebar: {
    width: '250px',
    flexShrink: 0,
    backgroundColor: '#05050a',
    borderRight: '1px solid #15151c',
    display: 'flex',
    flexDirection: 'column',
    padding: '24px 16px 20px',
  },
  logo: {
    marginBottom: '28px',
    padding: '0 8px 22px',
    borderBottom: '1px solid #15151c',
  },
  logoImg: {
    height: '34px',
    width: 'auto',
    display: 'block',
    marginBottom: '8px',
  },
  logoSubtext: {
    margin: 0,
    fontSize: '10px',
    color: '#6b6b76',
    textTransform: 'uppercase',
    letterSpacing: '3px',
  },
  nav: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '11px 14px',
    borderRadius: '10px',
    color: '#8a8a95',
    textDecoration: 'none',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'background 0.15s, color 0.15s',
    cursor: 'pointer',
    borderLeft: '2px solid transparent',
  },
  navItemActive: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    color: '#fff',
    fontWeight: '700',
    borderLeft: '2px solid #52fa35',
  },
  logoutButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '11px 14px',
    borderRadius: '10px',
    color: '#ff6b6b',
    backgroundColor: 'transparent',
    border: '1px solid #2a2a2d',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
  },
  main: {
    flex: 1,
    overflow: 'auto',
    padding: '40px 48px',
    backgroundColor: '#010208',
  },
};
