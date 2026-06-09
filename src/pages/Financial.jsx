import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, addDoc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { DollarSign, TrendingUp, Users, Video, Search, Check, X } from 'lucide-react';

export default function Financial() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [liveConfig, setLiveConfig] = useState({
    impostoPercent: 15,
    estruturaPercent: 5,
    uouPercent: 30,
  });
  const [simulatorValue, setSimulatorValue] = useState(10);
  const [savingConfig, setSavingConfig] = useState(false);
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
    loadLiveConfig();
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

  const loadLiveConfig = async () => {
    try {
      const configDoc = await getDoc(doc(db, 'settings', 'liveConfig'));
      if (configDoc.exists()) setLiveConfig(prev => ({ ...prev, ...configDoc.data() }));
    } catch (e) { console.error(e); }
  };

  const saveLiveConfig = async () => {
    setSavingConfig(true);
    try {
      await setDoc(doc(db, 'settings', 'liveConfig'), liveConfig);
      alert('Configurações salvas!');
    } catch (e) { alert('Erro: ' + e.message); }
    finally { setSavingConfig(false); }
  };

  const calcSimulator = () => {
    const x = parseFloat(simulatorValue) || 0;
    const imposto = x * (liveConfig.impostoPercent / 100);
    const estrutura = x * (liveConfig.estruturaPercent / 100);
    const liquido = x - imposto - estrutura;
    const uou = liquido * (liveConfig.uouPercent / 100);
    const criador = liquido - uou;
    return { x, imposto, estrutura, liquido, uou, criador };
  };

  if (loading) {
    return <div style={styles.loading}>Carregando dados financeiros...</div>;
  }

  const sim = calcSimulator();

  return (
    <div style={styles.container}>
      {/* TopBar interno */}
      <div style={styles.internalTabBar}>
        <button style={{ ...styles.internalTab, ...(activeTab === 'dashboard' ? styles.internalTabActive : {}) }} onClick={() => setActiveTab('dashboard')}>Dashboard Financeiro</button>
        <button style={{ ...styles.internalTab, ...(activeTab === 'lives' ? styles.internalTabActive : {}) }} onClick={() => setActiveTab('lives')}>Lives Premiadas</button>
      </div>

      {activeTab === 'lives' && (
        <div>
          <div style={styles.livesHeader}>
            <div>
              <h1 style={styles.title}>Lives Premiadas</h1>
              <p style={styles.subtitle}>Base de cálculo da plataforma</p>
            </div>
            <button style={styles.saveBtn} onClick={saveLiveConfig} disabled={savingConfig}>{savingConfig ? 'Salvando...' : 'Salvar'}</button>
          </div>
          <div style={styles.livesGrid}>
            <div style={styles.configCard}>
              <h2 style={styles.cardTitle}>Parâmetros</h2>
              <div style={styles.configRow}>
                <label style={styles.configLabel}>Imposto (%)<span style={styles.configHint}>Sobre o valor total da live</span></label>
                <input type="number" min="0" max="100" step="0.5" value={liveConfig.impostoPercent} onChange={(e) => setLiveConfig({ ...liveConfig, impostoPercent: parseFloat(e.target.value) || 0 })} style={styles.configInput} />
              </div>
              <div style={styles.configRow}>
                <label style={styles.configLabel}>Estrutura (%)<span style={styles.configHint}>Custos operacionais sobre o valor total</span></label>
                <input type="number" min="0" max="100" step="0.5" value={liveConfig.estruturaPercent} onChange={(e) => setLiveConfig({ ...liveConfig, estruturaPercent: parseFloat(e.target.value) || 0 })} style={styles.configInput} />
              </div>
              <div style={styles.styleDivider} />
              <div style={styles.configRow}>
                <label style={styles.configLabel}>UOU — % do valor líquido<span style={styles.configHint}>Criador recebe: {100 - liveConfig.uouPercent}%</span></label>
                <input type="number" min="0" max="100" step="1" value={liveConfig.uouPercent} onChange={(e) => setLiveConfig({ ...liveConfig, uouPercent: parseFloat(e.target.value) || 0 })} style={styles.configInput} />
              </div>
              <div style={styles.splitBar}>
                <div style={{ ...styles.splitUou, width: liveConfig.uouPercent + '%' }}>UOU {liveConfig.uouPercent}%</div>
                <div style={{ ...styles.splitCriador, width: (100 - liveConfig.uouPercent) + '%' }}>Criador {100 - liveConfig.uouPercent}%</div>
              </div>
            </div>
            <div style={styles.simulatorCard}>
              <h2 style={styles.cardTitle}>Simulador</h2>
              <div style={styles.configRow}>
                <label style={styles.configLabel}>Valor da live (R$)</label>
                <input type="number" min="0" step="1" value={simulatorValue} onChange={(e) => setSimulatorValue(e.target.value)} style={styles.configInput} />
              </div>
              <div style={styles.calcResult}>
                <div style={styles.calcRow}><span style={styles.calcLabel}>Valor da live</span><span style={styles.calcValue}>R$ {sim.x.toFixed(2)}</span></div>
                <div style={styles.calcRow}><span style={{ ...styles.calcLabel, color: '#ef4444' }}>- Imposto ({liveConfig.impostoPercent}%)</span><span style={{ ...styles.calcValue, color: '#ef4444' }}>- R$ {sim.imposto.toFixed(2)}</span></div>
                <div style={styles.calcRow}><span style={{ ...styles.calcLabel, color: '#ef4444' }}>- Estrutura ({liveConfig.estruturaPercent}%)</span><span style={{ ...styles.calcValue, color: '#ef4444' }}>- R$ {sim.estrutura.toFixed(2)}</span></div>
                <div style={styles.calcDivider} />
                <div style={styles.calcRow}><span style={{ ...styles.calcLabel, fontWeight: '700', color: '#111' }}>Valor líquido</span><span style={{ ...styles.calcValue, fontWeight: '700', color: '#111' }}>R$ {sim.liquido.toFixed(2)}</span></div>
                <div style={styles.calcDivider} />
                <div style={styles.calcRow}><span style={{ ...styles.calcLabel, color: '#6366f1' }}>UOU ({liveConfig.uouPercent}%)</span><span style={{ ...styles.calcValue, color: '#6366f1' }}>R$ {sim.uou.toFixed(2)}</span></div>
                <div style={{ ...styles.calcRow, backgroundColor: 'rgba(34,197,94,0.1)', borderRadius: '8px', padding: '10px 12px', marginTop: '4px' }}>
                  <span style={{ ...styles.calcLabel, color: '#22c55e', fontWeight: '700' }}>Criador recebe</span>
                  <span style={{ ...styles.calcValue, color: '#22c55e', fontWeight: '700', fontSize: '20px' }}>R$ {sim.criador.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'dashboard' && (
      <div>
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
      )}
    </div>
  );
}