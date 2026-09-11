import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import logoImg from '../assets/logo.png';
import { 
  LayoutDashboard, 
  Users, 
  Video, 
  DollarSign,
  TrendingUp,
  BarChart3,
  Settings, 
  LogOut 
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
    { path: '/analytics', icon: BarChart3, label: 'Analytics' },
    { path: '/settings', icon: Settings, label: 'Configurações' },
  ];

  return (
    <div style={styles.container}>
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
      />
      {/* Sidebar */}
      <aside style={styles.sidebar}>
        <div style={styles.logo}>
          <img src={logoImg} alt="UOU" style={styles.logoImg} />
        </div>

        <nav style={styles.nav}>
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              style={({ isActive }) => ({
                ...styles.navItem,
                ...(isActive ? styles.navItemActive : {})
              })}
            >
              <item.icon size={20} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <button style={styles.logoutButton} onClick={handleLogout}>
          <LogOut size={20} />
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
    backgroundColor: '#000',
    fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif",
  },
  sidebar: {
    width: '260px',
    backgroundColor: '#000',
    borderRight: '1px solid #222',
    display: 'flex',
    flexDirection: 'column',
    padding: '20px',
  },
  logo: {
    marginBottom: '40px',
    paddingBottom: '20px',
    borderBottom: '1px solid #222',
    display: 'flex',
    justifyContent: 'center',
  },
  logoImg: {
    maxWidth: '210px',
    maxHeight: '100px',
    width: '100%',
    objectFit: 'contain',
  },
  nav: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    borderRadius: '8px',
    color: '#ddd',
    textDecoration: 'none',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'all 0.2s',
    cursor: 'pointer',
  },
  navItemActive: {
    backgroundColor: 'rgba(0, 230, 118, 0.7)',
    color: '#fff',
  },
  logoutButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    borderRadius: '8px',
    color: '#ff4444',
    backgroundColor: 'transparent',
    border: '1px solid #333',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  main: {
    flex: 1,
    overflow: 'auto',
    padding: '40px',
    backgroundColor: '#000',
  },
};
