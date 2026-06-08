import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Search, Ban, Check, Trash2, Eye } from 'lucide-react';

export default function Users() {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    if (search) {
      const filtered = users.filter(user =>
        user.name?.toLowerCase().includes(search.toLowerCase()) ||
        user.email?.toLowerCase().includes(search.toLowerCase())
      );
      setFilteredUsers(filtered);
    } else {
      setFilteredUsers(users);
    }
  }, [search, users]);

  const loadUsers = async () => {
    try {
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const usersData = [];
      usersSnapshot.forEach((doc) => {
        usersData.push({ id: doc.id, ...doc.data() });
      });
      const toDate = (val) => val?.toDate ? val.toDate() : new Date(val || 0);
      usersData.sort((a, b) => toDate(b.createdAt) - toDate(a.createdAt));
      setUsers(usersData);
      setFilteredUsers(usersData);
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBanUser = async (userId, currentStatus) => {
    const action = currentStatus ? 'desbanir' : 'banir';
    if (window.confirm(`Deseja ${action} este usuário?`)) {
      try {
        await updateDoc(doc(db, 'users', userId), {
          banned: !currentStatus
        });
        loadUsers();
        alert(`Usuário ${action === 'banir' ? 'banido' : 'desbanido'} com sucesso!`);
      } catch (error) {
        console.error('Erro ao atualizar usuário:', error);
        alert('Erro ao atualizar usuário');
      }
    }
  };

  const handleDeleteUser = async (userId) => {
    if (window.confirm('Deseja deletar este usuário? Esta ação não pode ser desfeita!')) {
      try {
        await deleteDoc(doc(db, 'users', userId));
        loadUsers();
        alert('Usuário deletado com sucesso!');
      } catch (error) {
        console.error('Erro ao deletar usuário:', error);
        alert('Erro ao deletar usuário');
      }
    }
  };

  if (loading) {
    return <div style={styles.loading}>Carregando usuários...</div>;
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Usuários</h1>
          <p style={styles.subtitle}>{users.length} usuários cadastrados</p>
        </div>
      </div>

      {/* Search */}
      <div style={styles.searchContainer}>
        <Search size={20} color="#999" />
        <input
          type="text"
          placeholder="Buscar por nome ou email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={styles.searchInput}
        />
      </div>

      {/* Users Table */}
      <div style={styles.table}>
        <div style={styles.tableHeader}>
          <div style={{ ...styles.tableCell, flex: 2 }}>Usuário</div>
          <div style={styles.tableCell}>Seguidores</div>
          <div style={styles.tableCell}>Lives</div>
          <div style={styles.tableCell}>Carteira</div>
          <div style={styles.tableCell}>Status</div>
          <div style={styles.tableCell}>Ações</div>
        </div>

        <div style={styles.tableBody}>
          {filteredUsers.map((user) => (
            <div key={user.id} style={styles.tableRow}>
              <div style={{ ...styles.tableCell, flex: 2 }}>
                <img
                  src={user.photoURL || 'https://via.placeholder.com/40'}
                  alt={user.name}
                  style={styles.userPhoto}
                />
                <div>
                  <p style={styles.userName}>{user.name}</p>
                  <p style={styles.userEmail}>{user.email}</p>
                </div>
              </div>
              <div style={styles.tableCell}>
                <p style={styles.cellValue}>{user.followers || 0}</p>
              </div>
              <div style={styles.tableCell}>
                <p style={styles.cellValue}>-</p>
              </div>
              <div style={styles.tableCell}>
                <p style={styles.cellValue}>
                  R$ {(user.wallet || 0).toFixed(2)}
                </p>
              </div>
              <div style={styles.tableCell}>
                <span style={{
                  ...styles.statusBadge,
                  ...(user.banned ? styles.statusBanned : styles.statusActive)
                }}>
                  {user.banned ? 'Banido' : 'Ativo'}
                </span>
              </div>
              <div style={{ ...styles.tableCell, ...styles.actions }}>
                <button
                  style={styles.actionButton}
                  onClick={() => setSelectedUser(user)}
                  title="Ver detalhes"
                >
                  <Eye size={16} />
                </button>
                <button
                  style={{
                    ...styles.actionButton,
                    ...(user.banned ? styles.actionSuccess : styles.actionWarning)
                  }}
                  onClick={() => handleBanUser(user.id, user.banned)}
                  title={user.banned ? 'Desbanir' : 'Banir'}
                >
                  {user.banned ? <Check size={16} /> : <Ban size={16} />}
                </button>
                <button
                  style={{ ...styles.actionButton, ...styles.actionDanger }}
                  onClick={() => handleDeleteUser(user.id)}
                  title="Deletar"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* User Detail Modal */}
      {selectedUser && (
        <div style={styles.modal} onClick={() => setSelectedUser(null)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>Detalhes do Usuário</h2>
              <button
                style={styles.closeButton}
                onClick={() => setSelectedUser(null)}
              >
                ×
              </button>
            </div>
            <div style={styles.modalBody}>
              <img
                src={selectedUser.photoURL || 'https://via.placeholder.com/100'}
                alt={selectedUser.name}
                style={styles.modalPhoto}
              />
              <div style={styles.modalInfo}>
                <p style={styles.modalLabel}>Nome</p>
                <p style={styles.modalValue}>{selectedUser.name}</p>
              </div>
              <div style={styles.modalInfo}>
                <p style={styles.modalLabel}>Email</p>
                <p style={styles.modalValue}>{selectedUser.email}</p>
              </div>
              <div style={styles.modalInfo}>
                <p style={styles.modalLabel}>Bio</p>
                <p style={styles.modalValue}>{selectedUser.bio || 'Sem bio'}</p>
              </div>
              <div style={styles.modalStats}>
                <div style={styles.modalStat}>
                  <p style={styles.modalStatValue}>{selectedUser.followers || 0}</p>
                  <p style={styles.modalStatLabel}>Seguidores</p>
                </div>
                <div style={styles.modalStat}>
                  <p style={styles.modalStatValue}>{selectedUser.following || 0}</p>
                  <p style={styles.modalStatLabel}>Seguindo</p>
                </div>
                <div style={styles.modalStat}>
                  <p style={styles.modalStatValue}>
                    R$ {(selectedUser.wallet || 0).toFixed(2)}
                  </p>
                  <p style={styles.modalStatLabel}>Carteira</p>
                </div>
              </div>
              <div style={styles.modalInfo}>
                <p style={styles.modalLabel}>Cadastrado em</p>
                <p style={styles.modalValue}>
                  {(selectedUser.createdAt?.toDate ? selectedUser.createdAt.toDate() : new Date(selectedUser.createdAt || 0)).toLocaleString('pt-BR')}
                </p>
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
  searchContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    backgroundColor: '#fff',
    borderRadius: '8px',
    border: '1px solid #e0e0e0',
    marginBottom: '24px',
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
    transition: 'background-color 0.2s',
  },
  tableCell: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  userPhoto: {
    width: '40px',
    height: '40px',
    borderRadius: '20px',
    objectFit: 'cover',
  },
  userName: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#111',
    marginBottom: '4px',
  },
  userEmail: {
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
  statusActive: {
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
    color: '#2e7d32',
  },
  statusBanned: {
    backgroundColor: 'rgba(255, 0, 0, 0.1)',
    color: '#c62828',
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
    transition: 'all 0.2s',
  },
  actionWarning: {
    borderColor: '#f59e0b',
    color: '#f59e0b',
  },
  actionSuccess: {
    borderColor: '#4CAF50',
    color: '#4CAF50',
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
    maxWidth: '500px',
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
  modalPhoto: {
    width: '100px',
    height: '100px',
    borderRadius: '50px',
    objectFit: 'cover',
    display: 'block',
    margin: '0 auto 24px',
  },
  modalInfo: {
    marginBottom: '20px',
  },
  modalLabel: {
    fontSize: '12px',
    color: '#666',
    marginBottom: '4px',
  },
  modalValue: {
    fontSize: '14px',
    color: '#111',
  },
  modalStats: {
    display: 'flex',
    justifyContent: 'space-around',
    padding: '20px',
    backgroundColor: '#f9f9f9',
    borderRadius: '8px',
    marginBottom: '20px',
    border: '1px solid #e0e0e0',
  },
  modalStat: {
    textAlign: 'center',
  },
  modalStatValue: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#111',
    marginBottom: '4px',
  },
  modalStatLabel: {
    fontSize: '12px',
    color: '#666',
  },
};
