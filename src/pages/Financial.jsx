import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { DollarSign, TrendingUp, Users, Video, Search, Check, X } from 'lucide-react';

export default function Financial() {
  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    pendingWithdrawals: 0,
    completedWithdrawals: 0,
    platformCommission: 0,
  });
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFinancialData();
  }, []);

  useEffect(() => {
    let filtered = transactions;

    if (search) {
      filtered = filtered.filter(t =>
        t.userName?.toLowerCase().includes(search.toLowerCase()) ||
        t.liveTitle?.toLowerCase().includes(search.toLowerCase())
      );
    }

    if (filterType !== 'all') {
      filtered = filtered.filter(t => t.type === filterType);
    }

    setFilteredTransactions(filtered);
  }, [search, filterType, transactions]);

  const loadFinancialData = async () => {
    try {
      // Carregar lives para calcular receita
      const livesSnapshot = await getDocs(collection(db, 'lives'));
      let totalRevenue = 0;
      let platformCommission = 0;

      const transactionsData = [];

      livesSnapshot.forEach((doc) => {
        const live = doc.data();
        if (live.status === 'ended' && live.viewers > 0) {
          const liveRevenue = live.viewers * (live.price || 0);
          const commission = liveRevenue * 0.2; // 20% da plataforma
          
          totalRevenue += liveRevenue;
          platformCommission += commission;

          transactionsData.push({
            id: doc.id,
            type: 'live_revenue',
            liveTitle: live.title,
            userName: live.userName,
            amount: liveRevenue,
            commission: commission,
            creatorEarnings: liveRevenue - commission,
            date: live.createdAt,
            status: 'completed',
          });
        }
      });

      // Carregar transações (saques pendentes - exemplo)
      const transactionsSnapshot = await getDocs(collection(db, 'transactions'));
      let pendingWithdrawals = 0;
      let completedWithdrawals = 0;

      transactionsSnapshot.forEach((doc) => {
        const transaction = doc.data();
        transactionsData.push({
          id: doc.id,
          ...transaction,
        });

        if (transaction.type === 'withdrawal') {
          if (transaction.status === 'pending') {
            pendingWithdrawals += transaction.amount;
          } else if (transaction.status === 'completed') {
            completedWithdrawals += transaction.amount;
          }
        }
      });

      transactionsData.sort((a, b) => new Date(b.date) - new Date(a.date));

      setTransactions(transactionsData);
      setFilteredTransactions(transactionsData);
      setStats({
        totalRevenue,
        pendingWithdrawals,
        completedWithdrawals,
        platformCommission,
      });
    } catch (error) {
      console.error('Erro ao carregar dados financeiros:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveWithdrawal = async (transactionId) => {
    if (window.confirm('Aprovar este saque?')) {
      try {
        await updateDoc(doc(db, 'transactions', transactionId), {
          status: 'completed',
          approvedAt: new Date().toISOString(),
        });
        loadFinancialData();
        alert('Saque aprovado!');
      } catch (error) {
        console.error('Erro ao aprovar saque:', error);
        alert('Erro ao aprovar saque');
      }
    }
  };

  const handleRejectWithdrawal = async (transactionId) => {
    if (window.confirm('Rejeitar este saque?')) {
      try {
        await updateDoc(doc(db, 'transactions', transactionId), {
          status: 'rejected',
          rejectedAt: new Date().toISOString(),
        });
        loadFinancialData();
        alert('Saque rejeitado!');
      } catch (error) {
        console.error('Erro ao rejeitar saque:', error);
        alert('Erro ao rejeitar saque');
      }
    }
  };

  const getTypeLabel = (type) => {
    switch (type) {
      case 'live_revenue': return 'Receita de Live';
      case 'withdrawal': return 'Saque';
      case 'refund': return 'Reembolso';
      default: return type;
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed':
        return { ...styles.statusBadge, ...styles.statusCompleted };
      case 'pending':
        return { ...styles.statusBadge, ...styles.statusPending };
      case 'rejected':
        return { ...styles.statusBadge, ...styles.statusRejected };
      default:
        return styles.statusBadge;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'completed': return 'COMPLETO';
      case 'pending': return 'PENDENTE';
      case 'rejected': return 'REJEITADO';
      default: return status;
    }
  };

  if (loading) {
    return <div style={styles.loading}>Carregando dados financeiros...</div>;
  }

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Financeiro</h1>
      <p style={styles.subtitle}>Gestão de receitas e pagamentos</p>

      {/* Stats Cards */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={styles.statIcon}>
            <DollarSign size={24} color="#4CAF50" />
          </div>
          <div style={styles.statContent}>
            <p style={styles.statLabel}>Receita Total</p>
            <h2 style={styles.statValue}>
              R$ {stats.totalRevenue.toFixed(2)}
            </h2>
          </div>
        </div>

        <div style={styles.statCard}>
          <div style={styles.statIcon}>
            <TrendingUp size={24} color="#FFD700" />
          </div>
          <div style={styles.statContent}>
            <p style={styles.statLabel}>Comissão Plataforma (20%)</p>
            <h2 style={styles.statValue}>
              R$ {stats.platformCommission.toFixed(2)}
            </h2>
          </div>
        </div>

        <div style={styles.statCard}>
          <div style={styles.statIcon}>
            <DollarSign size={24} color="#FFD700" />
          </div>
          <div style={styles.statContent}>
            <p style={styles.statLabel}>Saques Pendentes</p>
            <h2 style={styles.statValue}>
              R$ {stats.pendingWithdrawals.toFixed(2)}
            </h2>
          </div>
        </div>

        <div style={styles.statCard}>
          <div style={styles.statIcon}>
            <Check size={24} color="#4CAF50" />
          </div>
          <div style={styles.statContent}>
            <p style={styles.statLabel}>Saques Concluídos</p>
            <h2 style={styles.statValue}>
              R$ {stats.completedWithdrawals.toFixed(2)}
            </h2>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div style={styles.filters}>
        <div style={styles.searchContainer}>
          <Search size={20} color="#999" />
          <input
            type="text"
            placeholder="Buscar transações..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={styles.searchInput}
          />
        </div>

        <div style={styles.typeFilters}>
          <button
            style={{
              ...styles.filterButton,
              ...(filterType === 'all' ? styles.filterButtonActive : {})
            }}
            onClick={() => setFilterType('all')}
          >
            Todas
          </button>
          <button
            style={{
              ...styles.filterButton,
              ...(filterType === 'live_revenue' ? styles.filterButtonActive : {})
            }}
            onClick={() => setFilterType('live_revenue')}
          >
            Receitas
          </button>
          <button
            style={{
              ...styles.filterButton,
              ...(filterType === 'withdrawal' ? styles.filterButtonActive : {})
            }}
            onClick={() => setFilterType('withdrawal')}
          >
            Saques
          </button>
        </div>
      </div>

      {/* Transactions Table */}
      <div style={styles.table}>
        <div style={styles.tableHeader}>
          <div style={{ ...styles.tableCell, flex: 1.5 }}>Transação</div>
          <div style={styles.tableCell}>Tipo</div>
          <div style={styles.tableCell}>Valor</div>
          <div style={styles.tableCell}>Comissão</div>
          <div style={styles.tableCell}>Status</div>
          <div style={styles.tableCell}>Data</div>
          <div style={styles.tableCell}>Ações</div>
        </div>

        <div style={styles.tableBody}>
          {filteredTransactions.map((transaction) => (
            <div key={transaction.id} style={styles.tableRow}>
              <div style={{ ...styles.tableCell, flex: 1.5 }}>
                <div>
                  <p style={styles.transactionTitle}>
                    {transaction.liveTitle || transaction.description || 'Transação'}
                  </p>
                  <p style={styles.transactionSubtitle}>
                    {transaction.userName || 'Usuário'}
                  </p>
                </div>
              </div>
              <div style={styles.tableCell}>
                <p style={styles.cellValue}>{getTypeLabel(transaction.type)}</p>
              </div>
              <div style={styles.tableCell}>
                <p style={styles.cellValue}>
                  R$ {(transaction.amount || 0).toFixed(2)}
                </p>
              </div>
              <div style={styles.tableCell}>
                <p style={styles.cellValue}>
                  {transaction.commission 
                    ? `R$ ${transaction.commission.toFixed(2)}`
                    : '-'
                  }
                </p>
              </div>
              <div style={styles.tableCell}>
                <span style={getStatusBadge(transaction.status)}>
                  {getStatusText(transaction.status)}
                </span>
              </div>
              <div style={styles.tableCell}>
                <p style={styles.cellValue}>
                  {new Date(transaction.date).toLocaleDateString('pt-BR')}
                </p>
              </div>
              <div style={{ ...styles.tableCell, ...styles.actions }}>
                {transaction.type === 'withdrawal' && transaction.status === 'pending' && (
                  <>
                    <button
                      style={{ ...styles.actionButton, ...styles.actionSuccess }}
                      onClick={() => handleApproveWithdrawal(transaction.id)}
                      title="Aprovar"
                    >
                      <Check size={16} />
                    </button>
                    <button
                      style={{ ...styles.actionButton, ...styles.actionDanger }}
                      onClick={() => handleRejectWithdrawal(transaction.id)}
                      title="Rejeitar"
                    >
                      <X size={16} />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}

          {filteredTransactions.length === 0 && (
            <div style={styles.emptyState}>
              <p style={styles.emptyText}>Nenhuma transação encontrada</p>
            </div>
          )}
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
    marginBottom: '40px',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '20px',
    marginBottom: '40px',
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
  filters: {
    display: 'flex',
    gap: '16px',
    marginBottom: '24px',
    flexWrap: 'wrap',
  },
  searchContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    backgroundColor: '#1a1a1a',
    borderRadius: '8px',
    border: '1px solid #333',
    flex: 1,
    minWidth: '300px',
  },
  searchInput: {
    flex: 1,
    border: 'none',
    backgroundColor: 'transparent',
    color: '#fff',
    fontSize: '14px',
    outline: 'none',
  },
  typeFilters: {
    display: 'flex',
    gap: '8px',
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
  table: {
    backgroundColor: '#1a1a1a',
    borderRadius: '12px',
    border: '1px solid #333',
    overflow: 'hidden',
  },
  tableHeader: {
    display: 'flex',
    padding: '16px 20px',
    backgroundColor: '#0a0a0a',
    borderBottom: '1px solid #333',
    fontWeight: 'bold',
    fontSize: '12px',
    color: '#999',
    textTransform: 'uppercase',
  },
  tableBody: {
    display: 'flex',
    flexDirection: 'column',
  },
  tableRow: {
    display: 'flex',
    alignItems: 'center',
    padding: '16px 20px',
    borderBottom: '1px solid #333',
  },
  tableCell: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  transactionTitle: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#fff',
    marginBottom: '4px',
  },
  transactionSubtitle: {
    fontSize: '12px',
    color: '#999',
  },
  cellValue: {
    fontSize: '14px',
    color: '#fff',
  },
  statusBadge: {
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  statusCompleted: {
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    color: '#4CAF50',
  },
  statusPending: {
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    color: '#FFD700',
  },
  statusRejected: {
    backgroundColor: 'rgba(255, 0, 0, 0.2)',
    color: '#ff0000',
  },
  actions: {
    gap: '8px',
  },
  actionButton: {
    padding: '8px',
    borderRadius: '6px',
    border: '1px solid #333',
    backgroundColor: 'transparent',
    color: '#999',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
  },
  actionSuccess: {
    borderColor: '#4CAF50',
    color: '#4CAF50',
  },
  actionDanger: {
    borderColor: '#ff0000',
    color: '#ff0000',
  },
  emptyState: {
    padding: '60px 20px',
    textAlign: 'center',
  },
  emptyText: {
    color: '#666',
    fontSize: '16px',
  },
};
