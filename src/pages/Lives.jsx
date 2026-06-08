import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Search, Trash2, Eye, Edit, Play, Calendar, XCircle } from 'lucide-react';

export default function Lives() {
  const [lives, setLives] = useState([]);
  const [filteredLives, setFilteredLives] = useState([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [loading, setLoading] = useState(true);
  const [selectedLive, setSelectedLive] = useState(null);

  useEffect(() => {
    loadLives();
  }, []);

  useEffect(() => {
    let filtered = lives;

    // Filter by search
    if (search) {
      filtered = filtered.filter(live =>
        live.title?.toLowerCase().includes(search.toLowerCase()) ||
        live.userName?.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Filter by status
    if (filterStatus !== 'all') {
      filtered = filtered.filter(live => live.status === filterStatus);
    }

    setFilteredLives(filtered);
  }, [search, filterStatus, lives]);

  const loadLives = async () => {
    try {
      const livesSnapshot = await getDocs(collection(db, 'lives'));
      const livesData = [];
      livesSnapshot.forEach((doc) => {
        livesData.push({ id: doc.id, ...doc.data() });
      });
      const toDate = (val) => val?.toDate ? val.toDate() : new Date(val || 0);
      livesData.sort((a, b) => toDate(b.createdAt) - toDate(a.createdAt));
      setLives(livesData);
      setFilteredLives(livesData);
    } catch (error) {
      console.error('Erro ao carregar lives:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteLive = async (liveId) => {
    if (window.confirm('Deseja deletar esta live? Esta ação não pode ser desfeita!')) {
      try {
        await deleteDoc(doc(db, 'lives', liveId));
        setLives(prev => prev.filter(l => l.id !== liveId));
        alert('Live deletada com sucesso!');
      } catch (error) {
        console.error('Erro ao deletar live:', error);
        alert('Erro ao deletar live: ' + error.message + '\n\nVerifique as regras do Firestore.');
      }
    }
  };

  const handleUpdateStatus = async (liveId, newStatus) => {
    try {
      await updateDoc(doc(db, 'lives', liveId), {
        status: newStatus
      });
      loadLives();
      alert('Status atualizado!');
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      alert('Erro ao atualizar status');
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'live':
        return { ...styles.statusBadge, ...styles.statusLive };
      case 'scheduled':
        return { ...styles.statusBadge, ...styles.statusScheduled };
      case 'ended':
        return { ...styles.statusBadge, ...styles.statusEnded };
      default:
        return styles.statusBadge;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'live': return 'AO VIVO';
      case 'scheduled': return 'AGENDADA';
      case 'ended': return 'ENCERRADA';
      default: return status;
    }
  };

  if (loading) {
    return <div style={styles.loading}>Carregando lives...</div>;
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Lives</h1>
          <p style={styles.subtitle}>{lives.length} lives cadastradas</p>
        </div>
      </div>

      {/* Filters */}
      <div style={styles.filters}>
        <div style={styles.searchContainer}>
          <Search size={20} color="#999" />
          <input
            type="text"
            placeholder="Buscar por título ou criador..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={styles.searchInput}
          />
        </div>

        <div style={styles.statusFilters}>
          <button
            style={{
              ...styles.filterButton,
              ...(filterStatus === 'all' ? styles.filterButtonActive : {})
            }}
            onClick={() => setFilterStatus('all')}
          >
            Todas
          </button>
          <button
            style={{
              ...styles.filterButton,
              ...(filterStatus === 'live' ? styles.filterButtonActive : {})
            }}
            onClick={() => setFilterStatus('live')}
          >
            Ao Vivo
          </button>
          <button
            style={{
              ...styles.filterButton,
              ...(filterStatus === 'scheduled' ? styles.filterButtonActive : {})
            }}
            onClick={() => setFilterStatus('scheduled')}
          >
            Agendadas
          </button>
          <button
            style={{
              ...styles.filterButton,
              ...(filterStatus === 'ended' ? styles.filterButtonActive : {})
            }}
            onClick={() => setFilterStatus('ended')}
          >
            Encerradas
          </button>
        </div>
      </div>

      {/* Lives Table */}
      <div style={styles.table}>
        <div style={styles.tableHeader}>
          <div style={{ ...styles.tableCell, flex: 2 }}>Live</div>
          <div style={styles.tableCell}>Criador</div>
          <div style={styles.tableCell}>Categoria</div>
          <div style={styles.tableCell}>Preço</div>
          <div style={styles.tableCell}>Viewers</div>
          <div style={styles.tableCell}>Status</div>
          <div style={styles.tableCell}>Ações</div>
        </div>

        <div style={styles.tableBody}>
          {filteredLives.map((live) => (
            <div key={live.id} style={styles.tableRow}>
              <div style={{ ...styles.tableCell, flex: 2 }}>
                <img
                  src={live.thumbnail || 'https://via.placeholder.com/60x40'}
                  alt={live.title}
                  style={styles.thumbnail}
                />
                <div>
                  <p style={styles.liveTitle}>{live.title}</p>
                  <p style={styles.liveDate}>
                    {new Date(live.createdAt).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>
              <div style={styles.tableCell}>
                <p style={styles.cellValue}>{live.userName}</p>
              </div>
              <div style={styles.tableCell}>
                <p style={styles.cellValue}>{live.category}</p>
              </div>
              <div style={styles.tableCell}>
                <p style={styles.cellValue}>R$ {live.price?.toFixed(2)}</p>
              </div>
              <div style={styles.tableCell}>
                <p style={styles.cellValue}>{live.viewers || 0}</p>
              </div>
              <div style={styles.tableCell}>
                <span style={getStatusBadge(live.status)}>
                  {getStatusText(live.status)}
                </span>
              </div>
              <div style={{ ...styles.tableCell, ...styles.actions }}>
                <button
                  style={styles.actionButton}
                  onClick={() => setSelectedLive(live)}
                  title="Ver detalhes"
                >
                  <Eye size={16} />
                </button>
                {live.status === 'live' && (
                  <button
                    style={{ ...styles.actionButton, ...styles.actionWarning }}
                    onClick={() => handleUpdateStatus(live.id, 'ended')}
                    title="Encerrar live"
                  >
                    <XCircle size={16} />
                  </button>
                )}
                <button
                  style={{ ...styles.actionButton, ...styles.actionDanger }}
                  onClick={() => handleDeleteLive(live.id)}
                  title="Deletar"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Live Detail Modal */}
      {selectedLive && (
        <div style={styles.modal} onClick={() => setSelectedLive(null)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>Detalhes da Live</h2>
              <button
                style={styles.closeButton}
                onClick={() => setSelectedLive(null)}
              >
                ×
              </button>
            </div>
            <div style={styles.modalBody}>
              <img
                src={selectedLive.thumbnail || 'https://via.placeholder.com/400x225'}
                alt={selectedLive.title}
                style={styles.modalThumbnail}
              />
              <h3 style={styles.modalLiveTitle}>{selectedLive.title}</h3>
              <p style={styles.modalDescription}>{selectedLive.description}</p>
              
              <div style={styles.modalGrid}>
                <div style={styles.modalInfo}>
                  <p style={styles.modalLabel}>Criador</p>
                  <p style={styles.modalValue}>{selectedLive.userName}</p>
                </div>
                <div style={styles.modalInfo}>
                  <p style={styles.modalLabel}>Categoria</p>
                  <p style={styles.modalValue}>{selectedLive.category}</p>
                </div>
                <div style={styles.modalInfo}>
                  <p style={styles.modalLabel}>Preço</p>
                  <p style={styles.modalValue}>R$ {selectedLive.price?.toFixed(2)}</p>
                </div>
                <div style={styles.modalInfo}>
                  <p style={styles.modalLabel}>Duração</p>
                  <p style={styles.modalValue}>{selectedLive.duration} min</p>
                </div>
                <div style={styles.modalInfo}>
                  <p style={styles.modalLabel}>Viewers</p>
                  <p style={styles.modalValue}>{selectedLive.viewers || 0}</p>
                </div>
                <div style={styles.modalInfo}>
                  <p style={styles.modalLabel}>Likes</p>
                  <p style={styles.modalValue}>{selectedLive.likes || 0}</p>
                </div>
              </div>

              <div style={styles.modalInfo}>
                <p style={styles.modalLabel}>Status</p>
                <span style={getStatusBadge(selectedLive.status)}>
                  {getStatusText(selectedLive.status)}
                </span>
              </div>

              <div style={styles.modalInfo}>
                <p style={styles.modalLabel}>Criada em</p>
                <p style={styles.modalValue}>
                  {new Date(selectedLive.createdAt).toLocaleString('pt-BR')}
                </p>
              </div>

              {selectedLive.scheduledDate && (
                <div style={styles.modalInfo}>
                  <p style={styles.modalLabel}>Agendada para</p>
                  <p style={styles.modalValue}>
                    {new Date(selectedLive.scheduledDate).toLocaleString('pt-BR')}
                  </p>
                </div>
              )}

              <div style={styles.modalActions}>
                {selectedLive.status === 'live' && (
                  <button
                    style={{ ...styles.modalButton, ...styles.modalButtonWarning }}
                    onClick={() => {
                      handleUpdateStatus(selectedLive.id, 'ended');
                      setSelectedLive(null);
                    }}
                  >
                    Encerrar Live
                  </button>
                )}
                <button
                  style={{ ...styles.modalButton, ...styles.modalButtonDanger }}
                  onClick={() => {
                    handleDeleteLive(selectedLive.id);
                    setSelectedLive(null);
                  }}
                >
                  Deletar Live
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
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
    color: '#666',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '30px',
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
    backgroundColor: '#fff',
    borderRadius: '8px',
    border: '1px solid #e0e0e0',
    flex: 1,
    minWidth: '300px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
  },
  searchInput: {
    flex: 1,
    border: 'none',
    backgroundColor: 'transparent',
    color: '#111',
    fontSize: '14px',
    outline: 'none',
  },
  statusFilters: {
    display: 'flex',
    gap: '8px',
  },
  filterButton: {
    padding: '12px 20px',
    borderRadius: '8px',
    border: '1px solid #e0e0e0',
    backgroundColor: '#fff',
    color: '#666',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  filterButtonActive: {
    backgroundColor: '#111',
    color: '#fff',
    borderColor: '#111',
  },
  table: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    border: '1px solid #e0e0e0',
    overflow: 'hidden',
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
  },
  tableHeader: {
    display: 'flex',
    padding: '16px 20px',
    backgroundColor: '#f9f9f9',
    borderBottom: '1px solid #e0e0e0',
    fontWeight: 'bold',
    fontSize: '12px',
    color: '#666',
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
    borderBottom: '1px solid #f0f0f0',
  },
  tableCell: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  thumbnail: {
    width: '60px',
    height: '40px',
    borderRadius: '4px',
    objectFit: 'cover',
    backgroundColor: '#f0f0f0',
  },
  liveTitle: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#111',
    marginBottom: '4px',
  },
  liveDate: {
    fontSize: '12px',
    color: '#666',
  },
  cellValue: {
    fontSize: '14px',
    color: '#111',
  },
  statusBadge: {
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  statusLive: {
    backgroundColor: 'rgba(255, 0, 0, 0.1)',
    color: '#c62828',
  },
  statusScheduled: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    color: '#b45309',
  },
  statusEnded: {
    backgroundColor: 'rgba(100, 100, 100, 0.1)',
    color: '#555',
  },
  actions: {
    gap: '8px',
  },
  actionButton: {
    padding: '8px',
    borderRadius: '6px',
    border: '1px solid #e0e0e0',
    backgroundColor: 'transparent',
    color: '#666',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
  },
  actionWarning: {
    borderColor: '#f59e0b',
    color: '#f59e0b',
  },
  actionDanger: {
    borderColor: '#ef4444',
    color: '#ef4444',
  },
  modal: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    border: '1px solid #e0e0e0',
    width: '90%',
    maxWidth: '600px',
    maxHeight: '80vh',
    overflow: 'auto',
    boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px',
    borderBottom: '1px solid #e0e0e0',
  },
  modalTitle: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#111',
  },
  closeButton: {
    background: 'none',
    border: 'none',
    color: '#666',
    fontSize: '32px',
    cursor: 'pointer',
    lineHeight: '20px',
  },
  modalBody: {
    padding: '20px',
  },
  modalThumbnail: {
    width: '100%',
    height: 'auto',
    borderRadius: '8px',
    marginBottom: '20px',
  },
  modalLiveTitle: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#111',
    marginBottom: '12px',
  },
  modalDescription: {
    fontSize: '14px',
    color: '#666',
    lineHeight: '1.6',
    marginBottom: '24px',
  },
  modalGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '16px',
    marginBottom: '20px',
  },
  modalInfo: {
    marginBottom: '16px',
  },
  modalLabel: {
    fontSize: '12px',
    color: '#666',
    marginBottom: '4px',
  },
  modalValue: {
    fontSize: '14px',
    color: '#111',
    fontWeight: '500',
  },
  modalActions: {
    display: 'flex',
    gap: '12px',
    marginTop: '24px',
    paddingTop: '20px',
    borderTop: '1px solid #e0e0e0',
  },
  modalButton: {
    flex: 1,
    padding: '12px',
    borderRadius: '8px',
    border: 'none',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  modalButtonWarning: {
    backgroundColor: '#f59e0b',
    color: '#fff',
  },
  modalButtonDanger: {
    backgroundColor: '#ef4444',
    color: '#fff',
  },
};
