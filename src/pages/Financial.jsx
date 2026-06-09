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
      if (configDoc.exists()) {
        setLiveConfig({ ...liveConfig, ...configDoc.data() });
      }
    } catch (error) {
      console.error('Erro ao carregar config:', error);
    }
  };

  const saveLiveConfig = async () => {
    setSavingConfig(true);
    try {
      await setDoc(doc(db, 'settings', 'liveConfig'), liveConfig);
      alert('Configurações salvas!');
    } catch (error) {
      alert('Erro ao salvar: ' + error.message);
    } finally {
      setSavingConfig(false);
    }
  };

  // Cálculo do simulador
  const calcSimulator = () => {
    const x = parseFloat(simulatorValue) || 0;
    const imposto = x * (liveConfig.impostoPercent / 100);
    const estrutura = x * (liveConfig.estruturaPercent / 100);
    const liquido = x - imposto - estrutura;
    const uou = liquido * (liveConfig.uouPercent / 100);
    const criador = liquido - uou;
    return { x, imposto, estrutura, liquido, uou, criador };
    internalTabBar: {
    display: 'flex',
    gap: '4px',
    marginBottom: '32px',
    borderBottom: '1px solid #e0e0e0',
    paddingBottom: '0',
  },
  internalTab: {
    padding: '10px 20px',
    border: 'none',
    backgroundColor: 'transparent',
    color: '#666',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    borderBottom: '2px solid transparent',
    marginBottom: '-1px',
  },
  internalTabActive: {
    color: '#111',
    borderBottom: '2px solid #111',
  },
  livesHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '32px',
  },
  saveBtn: {
    padding: '10px 24px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: '#111',
    color: '#fff',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  livesGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '24px',
  },
  configCard: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    border: '1px solid #e0e0e0',
    padding: '24px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
  },
  simulatorCard: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    border: '1px solid #e0e0e0',
    padding: '24px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
  },
  cardTitle: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#111',
    marginBottom: '24px',
  },
  configRow: {
    marginBottom: '20px',
  },
  configLabel: {
    display: 'flex',
    flexDirection: 'column',
    gap: '3px',
    fontSize: '14px',
    fontWeight: '500',
    color: '#111',
    marginBottom: '8px',
  },
  configHint: {
    fontSize: '12px',
    color: '#666',
    fontWeight: 'normal',
  },
  configInput: {
    width: '100%',
    padding: '10px 14px',
    borderRadius: '8px',
    border: '1px solid #e0e0e0',
    backgroundColor: '#f9f9f9',
    color: '#111',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box',
  },
  divider: {
    borderTop: '1px solid #e0e0e0',
    marginBottom: '20px',
  },
  splitBar: {
    display: 'flex',
    borderRadius: '8px',
    overflow: 'hidden',
    height: '36px',
    marginTop: '8px',
  },
  splitUou: {
    backgroundColor: '#6366f1',
    color: '#fff',
    fontSize: '12px',
    fontWeight: '700',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'width 0.3s',
    minWidth: '40px',
  },
  splitCriador: {
    backgroundColor: '#22c55e',
    color: '#fff',
    fontSize: '12px',
    fontWeight: '700',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'width 0.3s',
    minWidth: '40px',
  },
  calcResult: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginTop: '16px',
  },
  calcRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  calcLabel: {
    fontSize: '14px',
    color: '#666',
  },
  calcValue: {
    fontSize: '14px',
    color: '#111',
  },
  calcDivider: {
    borderTop: '1px solid #e0e0e0',
    margin: '4px 0',
  },
};