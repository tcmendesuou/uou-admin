import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { Users, Video, DollarSign, TrendingUp } from 'lucide-react';

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalLives: 0,
    activeLives: 0,
    totalRevenue: 0,
    recentUsers: [],
    recentLives: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      // Total de usuários
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const totalUsers = usersSnapshot.size;

      // Total de lives
      const livesSnapshot = await getDocs(collection(db, 'lives'));
      const totalLives = livesSnapshot.size;

      // Lives ativas
      const activeLivesQuery = query(
        collection(db, 'lives'),
        where('status', '==', 'live')
      );
      const activeLivesSnapshot = await getDocs(activeLivesQuery);
      const activeLives = activeLivesSnapshot.size;

      // Calcular receita (simulado - 20% de comissão)
      let totalRevenue = 0;
      livesSnapshot.forEach((doc) => {
        const live = doc.data();
        if (live.status === 'ended') {
          const revenue = (live.viewers || 0) * (live.price || 0) * 0.2;
          totalRevenue += revenue;
        }
      });

      // Usuários recentes (últimos 5)
      const recentUsers = [];
      usersSnapshot.forEach((doc) => {
        recentUsers.push({ id: doc.id, ...doc.data() });
      });
      const toDate = (val) => {
        if (!val) return new Date(0);
        if (val?.toDate) return val.toDate(); // Firebase Timestamp
        return new Date(val);
      };

      recentUsers.sort((a, b) => toDate(b.createdAt) - toDate(a.createdAt));

      // Lives recentes (últimas 5)
      const recentLives = [];
      livesSnapshot.forEach((doc) => {
        recentLives.push({ id: doc.id, ...doc.data() });
      });
      recentLives.sort((a, b) => toDate(b.createdAt) - toDate(a.createdAt));

      setStats({
        totalUsers,
        totalLives,
        activeLives,
        totalRevenue,
        recentUsers: recentUsers.slice(0, 5),
        recentLives: recentLives.slice(0, 5),
      });
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={styles.loading}>
        <p>Carregando estatísticas...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Dashboard</h1>
      <p style={styles.subtitle}>Visão geral da plataforma</p>

      {/* Cards de Estatísticas */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={styles.statIcon}>
            <Users size={24} color="#FFD700" />
          </div>
          <div style={styles.statContent}>
            <p style={styles.statLabel}>Total de Usuários</p>
            <h2 style={styles.statValue}>{stats.totalUsers}</h2>
          </div>
        </div>

        <div style={styles.statCard}>
          <div style={styles.statIcon}>
            <Video size={24} color="#4CAF50" />
          </div>
          <div style={styles.statContent}>
            <p style={styles.statLabel}>Total de Lives</p>
            <h2 style={styles.statValue}>{stats.totalLives}</h2>
          </div>
        </div>

        <div style={styles.statCard}>
          <div style={styles.statIcon}>
            <TrendingUp size={24} color="#ff0000" />
          </div>
          <div style={styles.statContent}>
            <p style={styles.statLabel}>Lives Ativas</p>
            <h2 style={styles.statValue}>{stats.activeLives}</h2>
          </div>
        </div>

        <div style={styles.statCard}>
          <div style={styles.statIcon}>
            <DollarSign size={24} color="#FFD700" />
          </div>
          <div style={styles.statContent}>
            <p style={styles.statLabel}>Receita Total (20%)</p>
            <h2 style={styles.statValue}>
              R$ {stats.totalRevenue.toFixed(2)}
            </h2>
          </div>
        </div>
      </div>

      {/* Tabelas */}
      <div style={styles.tablesGrid}>
        {/* Usuários Recentes */}
        <div style={styles.tableCard}>
          <h3 style={styles.tableTitle}>Usuários Recentes</h3>
          <div style={styles.table}>
            {stats.recentUsers.map((user) => (
              <div key={user.id} style={styles.tableRow}>
                <div style={styles.tableCell}>
                  <p style={styles.tableCellTitle}>{user.name}</p>
                  <p style={styles.tableCellSubtitle}>{user.email}</p>
                </div>
                <div style={styles.tableCell}>
                  <p style={styles.tableCellValue}>
                    {(user.createdAt?.toDate ? user.createdAt.toDate() : new Date(user.createdAt || 0)).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Lives Recentes */}
        <div style={styles.tableCard}>
          <h3 style={styles.tableTitle}>Lives Recentes</h3>
          <div style={styles.table}>
            {stats.recentLives.map((live) => (
              <div key={live.id} style={styles.tableRow}>
                <div style={styles.tableCell}>
                  <p style={styles.tableCellTitle}>{live.title}</p>
                  <p style={styles.tableCellSubtitle}>
                    {live.userName} • R$ {live.price?.toFixed(2)}
                  </p>
                </div>
                <div style={styles.tableCell}>
                  <span style={{
                    ...styles.statusBadge,
                    ...(live.status === 'live' ? styles.statusLive : 
                        live.status === 'scheduled' ? styles.statusScheduled : 
                        styles.statusEnded)
                  }}>
                    {live.status === 'live' ? 'AO VIVO' : 
                     live.status === 'scheduled' ? 'AGENDADA' : 'ENCERRADA'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: '1400px',
    margin: '0 auto',
  },
  loading: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '400px',
    color: '#666',
  },
  title: {
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#111',
    marginBottom: '8px',
  },
  subtitle: {
    fontSize: '16px',
    color: '#666',
    marginBottom: '40px',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '20px',
    marginBottom: '40px',
  },
  statCard: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    padding: '24px',
    border: '1px solid #e0e0e0',
    display: 'flex',
    gap: '16px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
  },
  statIcon: {
    width: '48px',
    height: '48px',
    borderRadius: '12px',
    backgroundColor: '#f5f5f5',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statContent: {
    flex: 1,
  },
  statLabel: {
    fontSize: '14px',
    color: '#666',
    marginBottom: '8px',
  },
  statValue: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#111',
  },
  tablesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
    gap: '20px',
  },
  tableCard: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    padding: '24px',
    border: '1px solid #e0e0e0',
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
  },
  tableTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#111',
    marginBottom: '20px',
  },
  table: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  tableRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px',
    backgroundColor: '#f9f9f9',
    borderRadius: '8px',
    border: '1px solid #eee',
  },
  tableCell: {
    flex: 1,
  },
  tableCellTitle: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#111',
    marginBottom: '4px',
  },
  tableCellSubtitle: {
    fontSize: '12px',
    color: '#666',
  },
  tableCellValue: {
    fontSize: '14px',
    color: '#666',
    textAlign: 'right',
  },
  statusBadge: {
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  statusLive: {
    backgroundColor: 'rgba(255, 0, 0, 0.2)',
    color: '#ff0000',
  },
  statusScheduled: {
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    color: '#FFD700',
  },
  statusEnded: {
    backgroundColor: 'rgba(153, 153, 153, 0.2)',
    color: '#999',
  },
};
