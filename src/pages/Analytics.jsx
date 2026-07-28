import React, { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { Smartphone, Clock, Users, Eye } from 'lucide-react';

export default function Analytics() {
  const [loading, setLoading] = useState(true);
  const [rangeDays, setRangeDays] = useState(7);
  const [stats, setStats] = useState({
    totalOpens: 0,
    avgSessionMinutes: 0,
    uniqueUsersToday: 0,
  });
  const [dailyOpens, setDailyOpens] = useState([]);
  const [topScreens, setTopScreens] = useState([]);

  useEffect(() => {
    loadAnalytics();
  }, [rangeDays]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      // ✅ Analytics simples: lê direto da coleção analytics_events, gravada
      // pelo próprio app (sem depender de BigQuery/Firebase Analytics).
      const snapshot = await getDocs(collection(db, 'analytics_events'));
      const events = [];
      snapshot.forEach((docSnap) => events.push({ id: docSnap.id, ...docSnap.data() }));

      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - rangeDays);
      const cutoffISO = cutoff.toISOString();
      const recentEvents = events.filter((e) => e.createdAt >= cutoffISO);

      // Aberturas do app (session_start)
      const sessionStarts = recentEvents.filter((e) => e.type === 'session_start');
      const totalOpens = sessionStarts.length;

      // Tempo médio de sessão (session_end com duração)
      const sessionEnds = recentEvents.filter((e) => e.type === 'session_end' && e.durationSeconds);
      const avgSeconds = sessionEnds.length > 0
        ? sessionEnds.reduce((sum, e) => sum + e.durationSeconds, 0) / sessionEnds.length
        : 0;

      // Usuários ativos hoje
      const todayISO = new Date().toISOString().slice(0, 10);
      const usersToday = new Set(
        sessionStarts.filter((e) => e.createdAt?.slice(0, 10) === todayISO).map((e) => e.userId)
      );

      // Aberturas por dia (últimos N dias)
      const dailyMap = {};
      for (let i = rangeDays - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        dailyMap[d.toISOString().slice(0, 10)] = 0;
      }
      sessionStarts.forEach((e) => {
        const key = e.createdAt?.slice(0, 10);
        if (dailyMap[key] !== undefined) dailyMap[key]++;
      });
      const dailyArray = Object.entries(dailyMap).map(([date, count]) => ({ date, count }));

      // Telas mais vistas (screen_view)
      const screenViews = recentEvents.filter((e) => e.type === 'screen_view' && e.screenName);
      const screenCounts = {};
      screenViews.forEach((e) => {
        screenCounts[e.screenName] = (screenCounts[e.screenName] || 0) + 1;
      });
      const topScreensArray = Object.entries(screenCounts)
        .map(([screenName, count]) => ({ screenName, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      setStats({
        totalOpens,
        avgSessionMinutes: avgSeconds / 60,
        uniqueUsersToday: usersToday.size,
      });
      setDailyOpens(dailyArray);
      setTopScreens(topScreensArray);
    } catch (error) {
      console.error('Erro ao carregar analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div style={styles.loading}>Carregando...</div>;
  }

  const maxDaily = Math.max(...dailyOpens.map((d) => d.count), 1);
  const maxScreen = Math.max(...topScreens.map((s) => s.count), 1);

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Analytics</h1>
      <p style={styles.subtitle}>Como as pessoas estão usando o UOU</p>

      {/* Filtro de período */}
      <div style={styles.rangeButtons}>
        <button
          style={{ ...styles.filterButton, ...(rangeDays === 7 ? styles.filterButtonActive : {}) }}
          onClick={() => setRangeDays(7)}
        >
          Últimos 7 dias
        </button>
        <button
          style={{ ...styles.filterButton, ...(rangeDays === 30 ? styles.filterButtonActive : {}) }}
          onClick={() => setRangeDays(30)}
        >
          Últimos 30 dias
        </button>
      </div>

      {/* Stats Cards */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={styles.statIcon}>
            <Smartphone size={24} color="#4CAF50" />
          </div>
          <div style={styles.statContent}>
            <p style={styles.statLabel}>Aberturas do app ({rangeDays}d)</p>
            <h2 style={styles.statValue}>{stats.totalOpens}</h2>
          </div>
        </div>

        <div style={styles.statCard}>
          <div style={styles.statIcon}>
            <Clock size={24} color="#FFD700" />
          </div>
          <div style={styles.statContent}>
            <p style={styles.statLabel}>Tempo médio por sessão</p>
            <h2 style={styles.statValue}>{stats.avgSessionMinutes.toFixed(1)} min</h2>
          </div>
        </div>

        <div style={styles.statCard}>
          <div style={styles.statIcon}>
            <Users size={24} color="#6366f1" />
          </div>
          <div style={styles.statContent}>
            <p style={styles.statLabel}>Usuários ativos hoje</p>
            <h2 style={styles.statValue}>{stats.uniqueUsersToday}</h2>
          </div>
        </div>
      </div>

      {/* Aberturas por dia */}
      <div style={styles.card}>
        <h2 style={styles.cardTitle}>Aberturas por dia</h2>
        {dailyOpens.map((d) => (
          <div key={d.date} style={styles.barRow}>
            <span style={styles.barLabel}>{d.date.slice(5)}</span>
            <div style={styles.barTrack}>
              <div style={{ ...styles.barFill, width: `${(d.count / maxDaily) * 100}%` }} />
            </div>
            <span style={styles.barValue}>{d.count}</span>
          </div>
        ))}
      </div>

      {/* Telas mais vistas */}
      <div style={styles.card}>
        <div style={styles.cardTitleRow}>
          <Eye size={18} color="#999" />
          <h2 style={styles.cardTitle}>Telas mais vistas</h2>
        </div>
        {topScreens.length === 0 ? (
          <p style={styles.emptyText}>Nenhum dado ainda</p>
        ) : (
          topScreens.map((s) => (
            <div key={s.screenName} style={styles.barRow}>
              <span style={{ ...styles.barLabel, width: '160px' }}>{s.screenName}</span>
              <div style={styles.barTrack}>
                <div style={{ ...styles.barFill, width: `${(s.count / maxScreen) * 100}%`, backgroundColor: '#6366f1' }} />
              </div>
              <span style={styles.barValue}>{s.count}</span>
            </div>
          ))
        )}
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
    textAlign: 'center',
    padding: '40px',
    color: '#999',
  },
  title: {
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: '8px',
  },
  subtitle: {
    fontSize: '16px',
    color: '#999',
    marginBottom: '24px',
  },
  rangeButtons: {
    display: 'flex',
    gap: '8px',
    marginBottom: '24px',
  },
  filterButton: {
    padding: '12px 20px',
    borderRadius: '8px',
    border: '1px solid #333',
    backgroundColor: '#1a1a1a',
    color: '#999',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  filterButtonActive: {
    backgroundColor: '#fff',
    color: '#000',
    borderColor: '#fff',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '20px',
    marginBottom: '32px',
  },
  statCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: '12px',
    padding: '24px',
    border: '1px solid #333',
    display: 'flex',
    gap: '16px',
  },
  statIcon: {
    width: '48px',
    height: '48px',
    borderRadius: '12px',
    backgroundColor: '#2a2a2a',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statContent: {
    flex: 1,
  },
  statLabel: {
    fontSize: '14px',
    color: '#999',
    marginBottom: '8px',
  },
  statValue: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#fff',
  },
  card: {
    backgroundColor: '#1a1a1a',
    borderRadius: '12px',
    padding: '24px',
    border: '1px solid #333',
    marginBottom: '24px',
  },
  cardTitleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '20px',
  },
  cardTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: '20px',
  },
  barRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '12px',
  },
  barLabel: {
    fontSize: '13px',
    color: '#999',
    width: '60px',
    flexShrink: 0,
  },
  barTrack: {
    flex: 1,
    height: '10px',
    backgroundColor: '#0a0a0a',
    borderRadius: '6px',
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: '6px',
  },
  barValue: {
    fontSize: '13px',
    color: '#fff',
    width: '30px',
    textAlign: 'right',
    flexShrink: 0,
  },
  emptyText: {
    color: '#666',
    fontSize: '14px',
  },
};
