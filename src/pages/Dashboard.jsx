import React, { useState, useEffect, useRef } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

const MONTHS_PT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const START_MONTH = new Date(2026, 3, 1); // ✅ Abril de 2026 (mês 0 = Janeiro)
const INACTIVE_MONTHS_THRESHOLD = 3;
const ACTIVE_WINDOW_DAYS = 30;
const PX_PER_MONTH = 90;
const VISIBLE_MONTHS = 12;

function toDateSafe(val) {
  if (!val) return null;
  if (val?.toDate) return val.toDate(); // Firebase Timestamp
  return new Date(val);
}

function monthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(date) {
  return `${MONTHS_PT[date.getMonth()]}/${String(date.getFullYear()).slice(2)}`;
}

function buildMonthRange() {
  const now = new Date();
  const months = [];
  let cur = new Date(START_MONTH.getFullYear(), START_MONTH.getMonth(), 1);
  while (cur <= now) {
    months.push(new Date(cur));
    cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
  }
  return months;
}

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalLives: 0,
    activeLives: 0,
    totalRevenue: 0,
    recentUsers: [],
    recentLives: [],
  });
  const [userStats, setUserStats] = useState({ totalUsers: 0, activeUsers: 0 });
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef(null);

  useEffect(() => {
    loadStats();
  }, []);

  // ✅ Assim que o gráfico carrega, rola pro final (meses mais recentes)
  useEffect(() => {
    if (scrollRef.current && chartData.length > 0) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    }
  }, [chartData]);

  const loadStats = async () => {
    try {
      // ===== USUÁRIOS =====
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const usersData = [];
      usersSnapshot.forEach((docSnap) => {
        const d = docSnap.data();
        const createdAt = toDateSafe(d.createdAt);
        if (createdAt) usersData.push({ id: docSnap.id, createdAt });
      });

      // ✅ Última atividade de cada usuário, via analytics_events (session_start)
      const eventsSnapshot = await getDocs(
        query(collection(db, 'analytics_events'), where('type', '==', 'session_start'))
      );
      const lastActivityMap = {};
      eventsSnapshot.forEach((docSnap) => {
        const d = docSnap.data();
        const at = toDateSafe(d.createdAt);
        if (!at || !d.userId) return;
        if (!lastActivityMap[d.userId] || at > lastActivityMap[d.userId]) {
          lastActivityMap[d.userId] = at;
        }
      });

      // ✅ Contas deletadas (registradas a partir de agora, ver Users.jsx)
      const deletedSnapshot = await getDocs(collection(db, 'deleted_users'));
      const deletedByMonth = {};
      deletedSnapshot.forEach((docSnap) => {
        const d = docSnap.data();
        const at = toDateSafe(d.deletedAt);
        if (!at) return;
        const k = monthKey(at);
        deletedByMonth[k] = (deletedByMonth[k] || 0) + 1;
      });

      // ✅ Usuários ativos: alguma sessão nos últimos 30 dias
      const activeCutoff = new Date();
      activeCutoff.setDate(activeCutoff.getDate() - ACTIVE_WINDOW_DAYS);
      const activeUsers = usersData.filter((u) => {
        const last = lastActivityMap[u.id];
        return last && last >= activeCutoff;
      }).length;

      // ✅ Monta os dados mês a mês do gráfico
      const months = buildMonthRange();
      const data = months.map((m) => {
        const endOfMonth = new Date(m.getFullYear(), m.getMonth() + 1, 0, 23, 59, 59);
        const existingUsers = usersData.filter((u) => u.createdAt <= endOfMonth);
        const total = existingUsers.length;
        const novos = usersData.filter((u) => monthKey(u.createdAt) === monthKey(m)).length;

        const inactiveCutoff = new Date(endOfMonth);
        inactiveCutoff.setMonth(inactiveCutoff.getMonth() - INACTIVE_MONTHS_THRESHOLD);

        const inactiveCount = existingUsers.filter((u) => {
          const last = lastActivityMap[u.id] || u.createdAt;
          return last < inactiveCutoff;
        }).length;

        const deletedCount = deletedByMonth[monthKey(m)] || 0;

        return {
          month: monthLabel(m),
          total,
          novos,
          inativosExcluidos: inactiveCount + deletedCount,
        };
      });

      setUserStats({ totalUsers: usersData.length, activeUsers });
      setChartData(data);

      // ===== LIVES / RECEITA (igual antes) =====
      const livesSnapshot = await getDocs(collection(db, 'lives'));
      const totalLives = livesSnapshot.size;

      const activeLivesQuery = query(collection(db, 'lives'), where('status', '==', 'live'));
      const activeLivesSnapshot = await getDocs(activeLivesQuery);
      const activeLives = activeLivesSnapshot.size;

      let totalRevenue = 0;
      const recentLives = [];
      livesSnapshot.forEach((docSnap) => {
        const live = docSnap.data();
        if (live.status === 'ended') {
          totalRevenue += (live.viewers || 0) * (live.price || 0) * 0.2;
        }
        recentLives.push({ id: docSnap.id, ...live });
      });
      recentLives.sort((a, b) => (toDateSafe(b.createdAt) || 0) - (toDateSafe(a.createdAt) || 0));

      const recentUsersRaw = [];
      usersSnapshot.forEach((docSnap) => recentUsersRaw.push({ id: docSnap.id, ...docSnap.data() }));
      recentUsersRaw.sort((a, b) => (toDateSafe(b.createdAt) || 0) - (toDateSafe(a.createdAt) || 0));

      setStats({
        totalLives,
        activeLives,
        totalRevenue,
        recentUsers: recentUsersRaw.slice(0, 5),
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

      {/* ===== BLOCO: USUÁRIOS ===== */}
      <div style={styles.blockCard}>
        <h2 style={styles.blockTitle}>Usuários</h2>

        <div style={styles.userTopRow}>
          <div>
            <p style={styles.statLabel}>Total de Usuários</p>
            <h2 style={styles.statValueBig}>{userStats.totalUsers}</h2>
          </div>
          <div>
            <p style={styles.statLabel}>Usuários Ativos</p>
            <h2 style={styles.statValueBig}>{userStats.activeUsers}</h2>
          </div>
        </div>

        <div style={styles.legendRow}>
          <span style={styles.legendItem}><span style={{ ...styles.legendDot, backgroundColor: '#00E676' }} /> Total de usuários</span>
          <span style={styles.legendItem}><span style={{ ...styles.legendDot, backgroundColor: '#ffd94d' }} /> Novos no mês</span>
          <span style={styles.legendItem}><span style={{ ...styles.legendDot, backgroundColor: '#ff6b6b' }} /> Excluídos / inativos 3+ meses</span>
        </div>

        {/* ✅ Janela fixa de 12 meses, com scroll horizontal pra ver meses antigos */}
        <div ref={scrollRef} style={styles.chartScroll}>
          <div style={{ width: Math.max(chartData.length * PX_PER_MONTH, VISIBLE_MONTHS * PX_PER_MONTH), height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="month" stroke="#999" fontSize={12} />
                <YAxis stroke="#999" fontSize={12} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '8px' }}
                  labelStyle={{ color: '#fff' }}
                />
                <Line type="monotone" dataKey="total" name="Total" stroke="#00E676" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="novos" name="Novos" stroke="#ffd94d" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="inativosExcluidos" name="Excluídos/Inativos" stroke="#ff6b6b" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Cards de Estatísticas (Lives/Receita) */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <p style={styles.statLabel}>Total de Lives</p>
          <h2 style={styles.statValue}>{stats.totalLives}</h2>
        </div>

        <div style={styles.statCard}>
          <p style={styles.statLabel}>Lives Ativas</p>
          <h2 style={styles.statValue}>{stats.activeLives}</h2>
        </div>

        <div style={styles.statCard}>
          <p style={styles.statLabel}>Receita Total (20%)</p>
          <h2 style={styles.statValue}>
            R$ {stats.totalRevenue.toFixed(2)}
          </h2>
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
                    {(toDateSafe(user.createdAt) || new Date(0)).toLocaleDateString('pt-BR')}
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
    marginBottom: '40px',
  },
  blockCard: {
    backgroundColor: '#262626',
    borderRadius: '12px',
    padding: '24px',
    border: '1px solid #333',
    marginBottom: '40px',
  },
  blockTitle: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: '20px',
  },
  userTopRow: {
    display: 'flex',
    gap: '48px',
    marginBottom: '20px',
  },
  statValueBig: {
    fontSize: '36px',
    fontWeight: 'bold',
    color: '#00E676',
  },
  legendRow: {
    display: 'flex',
    gap: '20px',
    marginBottom: '16px',
    flexWrap: 'wrap',
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '13px',
    color: '#ccc',
  },
  legendDot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    display: 'inline-block',
  },
  chartScroll: {
    overflowX: 'auto',
    overflowY: 'hidden',
    paddingBottom: '8px',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '20px',
    marginBottom: '40px',
  },
  statCard: {
    backgroundColor: '#262626',
    borderRadius: '12px',
    padding: '24px',
    border: '1px solid #333',
  },
  statLabel: {
    fontSize: '14px',
    color: '#999',
    marginBottom: '8px',
  },
  statValue: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#00E676',
  },
  tablesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
    gap: '20px',
  },
  tableCard: {
    backgroundColor: '#262626',
    borderRadius: '12px',
    padding: '24px',
    border: '1px solid #333',
  },
  tableTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#fff',
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
    backgroundColor: '#333',
    borderRadius: '8px',
    border: '1px solid #3a3a3a',
  },
  tableCell: {
    flex: 1,
  },
  tableCellTitle: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#fff',
    marginBottom: '4px',
  },
  tableCellSubtitle: {
    fontSize: '12px',
    color: '#999',
  },
  tableCellValue: {
    fontSize: '14px',
    color: '#999',
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
    color: '#ff6b6b',
  },
  statusScheduled: {
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    color: '#ffd94d',
  },
  statusEnded: {
    backgroundColor: 'rgba(153, 153, 153, 0.2)',
    color: '#999',
  },
};
