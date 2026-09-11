import React, { useState, useEffect } from 'react';
import {
  collection, getDocs, query, where, doc, updateDoc,
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import {
  Search, Ban, Check, Trash2, Eye, Pause, Save,
  Image as ImageIcon, Video, DollarSign, MessageCircle, User as UserIcon,
} from 'lucide-react';

// Status possíveis de uma conta
const STATUS = {
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
  BANNED: 'banned',
};

function getUserStatus(user) {
  // Compatibilidade com o campo antigo "banned" (booleano)
  if (user.status) return user.status;
  if (user.banned) return STATUS.BANNED;
  return STATUS.ACTIVE;
}

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
      const filtered = users.filter((user) =>
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
      usersSnapshot.forEach((docSnap) => {
        usersData.push({ id: docSnap.id, ...docSnap.data() });
      });
      const toDate = (val) => (val?.toDate ? val.toDate() : new Date(val || 0));
      usersData.sort((a, b) => toDate(b.createdAt) - toDate(a.createdAt));
      setUsers(usersData);
      setFilteredUsers(usersData);
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
    } finally {
      setLoading(false);
    }
  };

  // Muda o status da conta (ativo / suspenso / banido)
  const handleChangeStatus = async (userId, newStatus, label) => {
    if (!window.confirm(`Deseja marcar essa conta como "${label}"?`)) return;
    try {
      await updateDoc(doc(db, 'users', userId), {
        status: newStatus,
        banned: newStatus === STATUS.BANNED,
      });
      await loadUsers();
      if (selectedUser?.id === userId) {
        setSelectedUser((prev) => ({ ...prev, status: newStatus, banned: newStatus === STATUS.BANNED }));
      }
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      alert('Erro ao atualizar status');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (window.confirm('Deseja deletar este usuário? Esta ação não pode ser desfeita!')) {
      try {
        const idToken = await auth.currentUser.getIdToken();
        const response = await fetch('https://us-central1-butter-1a8d4.cloudfunctions.net/deleteUser', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({ userId }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Erro desconhecido');
        setUsers((prev) => prev.filter((u) => u.id !== userId));
        setSelectedUser(null);
        alert('Usuário deletado com sucesso!');
      } catch (error) {
        console.error('Erro ao deletar usuário:', error);
        alert('Erro ao deletar usuário: ' + error.message);
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

      <div style={styles.table}>
        <div style={styles.tableHeader}>
          <div style={{ ...styles.tableCell, flex: 2 }}>Usuário</div>
          <div style={styles.tableCell}>Seguidores</div>
          <div style={styles.tableCell}>Carteira</div>
          <div style={styles.tableCell}>Status</div>
          <div style={styles.tableCell}>Ações</div>
        </div>

        <div style={styles.tableBody}>
          {filteredUsers.map((user) => {
            const status = getUserStatus(user);
            return (
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
                  <p style={styles.cellValue}>R$ {(user.wallet || 0).toFixed(2)}</p>
                </div>
                <div style={styles.tableCell}>
                  <span
                    style={{
                      ...styles.statusBadge,
                      ...(status === STATUS.BANNED
                        ? styles.statusBanned
                        : status === STATUS.SUSPENDED
                        ? styles.statusSuspended
                        : styles.statusActive),
                    }}
                  >
                    {status === STATUS.BANNED ? 'Banido' : status === STATUS.SUSPENDED ? 'Suspenso' : 'Ativo'}
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
                    style={{ ...styles.actionButton, ...styles.actionDanger }}
                    onClick={() => handleDeleteUser(user.id)}
                    title="Deletar"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {selectedUser && (
        <UserDetailPanel
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          onChangeStatus={handleChangeStatus}
          onSaved={loadUsers}
        />
      )}
    </div>
  );
}

function UserDetailPanel({ user, onClose, onChangeStatus, onSaved }) {
  const [tab, setTab] = useState('perfil');
  const status = getUserStatus(user);

  return (
    <div style={styles.modal} onClick={onClose}>
      <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img src={user.photoURL || 'https://via.placeholder.com/50'} alt={user.name} style={styles.headerPhoto} />
            <div>
              <h2 style={styles.modalTitle}>{user.name}</h2>
              <p style={styles.userEmail}>{user.email}</p>
            </div>
          </div>
          <button style={styles.closeButton} onClick={onClose}>×</button>
        </div>

        <div style={styles.statusActionsRow}>
          <span
            style={{
              ...styles.statusBadge,
              ...(status === STATUS.BANNED
                ? styles.statusBanned
                : status === STATUS.SUSPENDED
                ? styles.statusSuspended
                : styles.statusActive),
            }}
          >
            {status === STATUS.BANNED ? 'Banido' : status === STATUS.SUSPENDED ? 'Suspenso' : 'Ativo'}
          </span>
          {status !== STATUS.ACTIVE && (
            <button
              style={{ ...styles.pillButton, ...styles.pillSuccess }}
              onClick={() => onChangeStatus(user.id, STATUS.ACTIVE, 'Ativo')}
            >
              <Check size={14} /> Reativar
            </button>
          )}
          {status !== STATUS.SUSPENDED && (
            <button
              style={{ ...styles.pillButton, ...styles.pillWarning }}
              onClick={() => onChangeStatus(user.id, STATUS.SUSPENDED, 'Suspenso')}
            >
              <Pause size={14} /> Suspender
            </button>
          )}
          {status !== STATUS.BANNED && (
            <button
              style={{ ...styles.pillButton, ...styles.pillDanger }}
              onClick={() => onChangeStatus(user.id, STATUS.BANNED, 'Banido')}
            >
              <Ban size={14} /> Banir
            </button>
          )}
        </div>

        <div style={styles.tabsRow}>
          {[
            { id: 'perfil', label: 'Perfil', icon: UserIcon },
            { id: 'posts', label: 'Posts', icon: ImageIcon },
            { id: 'lives', label: 'Lives', icon: Video },
            { id: 'financeiro', label: 'Financeiro', icon: DollarSign },
            { id: 'mensagens', label: 'Mensagens', icon: MessageCircle },
          ].map((t) => (
            <button
              key={t.id}
              style={{ ...styles.tabButton, ...(tab === t.id ? styles.tabButtonActive : {}) }}
              onClick={() => setTab(t.id)}
            >
              <t.icon size={14} /> {t.label}
            </button>
          ))}
        </div>

        <div style={styles.modalBody}>
          {tab === 'perfil' && <ProfileTab user={user} onSaved={onSaved} />}
          {tab === 'posts' && <PostsTab userId={user.id} />}
          {tab === 'lives' && <LivesTab userId={user.id} />}
          {tab === 'financeiro' && <FinanceiroTab user={user} onSaved={onSaved} />}
          {tab === 'mensagens' && <MensagensTab userId={user.id} />}
        </div>
      </div>
    </div>
  );
}

function ProfileTab({ user, onSaved }) {
  const [name, setName] = useState(user.name || '');
  const [bio, setBio] = useState(user.bio || '');
  const [saving, setSaving] = useState(false);

  const hasChanges = name !== (user.name || '') || bio !== (user.bio || '');

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', user.id), { name, bio });
      await onSaved();
      alert('Perfil atualizado!');
    } catch (error) {
      console.error('Erro ao salvar perfil:', error);
      alert('Erro ao salvar perfil');
    } finally {
      setSaving(false);
    }
  };

  const toDate = (val) => (val?.toDate ? val.toDate() : new Date(val || 0));

  return (
    <div>
      <div style={styles.field}>
        <label style={styles.fieldLabel}>Nome</label>
        <input style={styles.fieldInput} value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div style={styles.field}>
        <label style={styles.fieldLabel}>Bio</label>
        <textarea
          style={{ ...styles.fieldInput, minHeight: '70px' }}
          value={bio}
          onChange={(e) => setBio(e.target.value)}
        />
      </div>
      {hasChanges && (
        <button style={styles.saveButton} onClick={handleSave} disabled={saving}>
          <Save size={14} /> {saving ? 'Salvando...' : 'Salvar alterações'}
        </button>
      )}

      <div style={styles.modalStats}>
        <div style={styles.modalStat}>
          <p style={styles.modalStatValue}>{user.followers || 0}</p>
          <p style={styles.modalStatLabel}>Seguidores</p>
        </div>
        <div style={styles.modalStat}>
          <p style={styles.modalStatValue}>{user.following || 0}</p>
          <p style={styles.modalStatLabel}>Seguindo</p>
        </div>
        <div style={styles.modalStat}>
          <p style={styles.modalStatValue}>{user.isPrivate ? 'Sim' : 'Não'}</p>
          <p style={styles.modalStatLabel}>Conta Privada</p>
        </div>
      </div>

      <div style={styles.field}>
        <p style={styles.fieldLabel}>Cadastrado em</p>
        <p style={styles.modalValue}>{toDate(user.createdAt).toLocaleString('pt-BR')}</p>
      </div>
      <div style={styles.field}>
        <p style={styles.fieldLabel}>ID da conta</p>
        <p style={{ ...styles.modalValue, fontFamily: 'monospace', fontSize: '12px' }}>{user.id}</p>
      </div>
    </div>
  );
}

function PostsTab({ userId }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const q = query(collection(db, 'posts'), where('userId', '==', userId));
        const snap = await getDocs(q);
        const data = [];
        snap.forEach((d) => data.push({ id: d.id, ...d.data() }));
        const toDate = (val) => (val?.toDate ? val.toDate() : new Date(val || 0));
        data.sort((a, b) => toDate(b.createdAt) - toDate(a.createdAt));
        setPosts(data);
      } catch (error) {
        console.error('Erro ao carregar posts:', error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [userId]);

  if (loading) return <p style={styles.emptyText}>Carregando...</p>;
  if (posts.length === 0) return <p style={styles.emptyText}>Nenhum post publicado</p>;

  const byType = posts.reduce((acc, p) => {
    const t = p.mediaType || p.type || 'outro';
    acc[t] = (acc[t] || 0) + 1;
    return acc;
  }, {});

  return (
    <div>
      <div style={styles.modalStats}>
        <div style={styles.modalStat}>
          <p style={styles.modalStatValue}>{posts.length}</p>
          <p style={styles.modalStatLabel}>Total</p>
        </div>
        {Object.entries(byType).map(([type, count]) => (
          <div key={type} style={styles.modalStat}>
            <p style={styles.modalStatValue}>{count}</p>
            <p style={styles.modalStatLabel}>{type}</p>
          </div>
        ))}
      </div>
      <div style={styles.listContainer}>
        {posts.map((p) => (
          <div key={p.id} style={styles.listRow}>
            <span style={styles.listRowTitle}>{p.caption || '(sem legenda)'}</span>
            <span style={styles.listRowMeta}>
              curtidas: {p.likes || 0} · comentarios: {p.commentsCount || 0}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function LivesTab({ userId }) {
  const [lives, setLives] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const q = query(collection(db, 'lives'), where('userId', '==', userId));
        const snap = await getDocs(q);
        const data = [];
        snap.forEach((d) => data.push({ id: d.id, ...d.data() }));
        const toDate = (val) => (val?.toDate ? val.toDate() : new Date(val || 0));
        data.sort((a, b) => toDate(b.createdAt) - toDate(a.createdAt));
        setLives(data);
      } catch (error) {
        console.error('Erro ao carregar lives:', error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [userId]);

  if (loading) return <p style={styles.emptyText}>Carregando...</p>;
  if (lives.length === 0) return <p style={styles.emptyText}>Nenhuma live criada</p>;

  return (
    <div>
      <div style={styles.modalStats}>
        <div style={styles.modalStat}>
          <p style={styles.modalStatValue}>{lives.length}</p>
          <p style={styles.modalStatLabel}>Total</p>
        </div>
        <div style={styles.modalStat}>
          <p style={styles.modalStatValue}>{lives.filter((l) => l.isPremium).length}</p>
          <p style={styles.modalStatLabel}>Premiadas</p>
        </div>
      </div>
      <div style={styles.listContainer}>
        {lives.map((l) => (
          <div key={l.id} style={styles.listRow}>
            <span style={styles.listRowTitle}>{l.title || '(sem título)'}</span>
            <span style={styles.listRowMeta}>
              {l.isPremium ? 'Premiada' : 'Grátis'} · {l.status || '-'}
              {l.location ? ` · localizacao: ${l.location.lat?.toFixed(2)}, ${l.location.lng?.toFixed(2)}` : ''}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function FinanceiroTab({ user, onSaved }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newWallet, setNewWallet] = useState((user.wallet || 0).toFixed(2));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const q = query(collection(db, 'transactions'), where('userId', '==', user.id));
        const snap = await getDocs(q);
        const data = [];
        snap.forEach((d) => data.push({ id: d.id, ...d.data() }));
        data.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
        setTransactions(data);
      } catch (error) {
        console.error('Erro ao carregar transações:', error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user.id]);

  const handleSaveWallet = async () => {
    const value = parseFloat(newWallet.replace(',', '.'));
    if (isNaN(value) || value < 0) return alert('Valor inválido');
    if (!window.confirm(`Alterar saldo de R$ ${(user.wallet || 0).toFixed(2)} para R$ ${value.toFixed(2)}?`)) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', user.id), { wallet: value });
      await onSaved();
      alert('Saldo atualizado!');
    } catch (error) {
      console.error('Erro ao atualizar saldo:', error);
      alert('Erro ao atualizar saldo');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div style={styles.field}>
        <label style={styles.fieldLabel}>Saldo atual — editar manualmente</label>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            style={styles.fieldInput}
            value={newWallet}
            onChange={(e) => setNewWallet(e.target.value)}
          />
          <button style={styles.saveButton} onClick={handleSaveWallet} disabled={saving}>
            <Save size={14} /> {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>

      <p style={{ ...styles.fieldLabel, marginTop: '20px' }}>Extrato</p>
      {loading ? (
        <p style={styles.emptyText}>Carregando...</p>
      ) : transactions.length === 0 ? (
        <p style={styles.emptyText}>Nenhuma transação</p>
      ) : (
        <div style={styles.listContainer}>
          {transactions.map((t) => (
            <div key={t.id} style={styles.listRow}>
              <span style={styles.listRowTitle}>{t.description || t.type}</span>
              <span style={styles.listRowMeta}>
                R$ {(t.amount || 0).toFixed(2)} · {new Date(t.date).toLocaleDateString('pt-BR')}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MensagensTab({ userId }) {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const q = query(collection(db, 'conversations'), where('participants', 'array-contains', userId));
        const snap = await getDocs(q);
        const data = [];
        snap.forEach((d) => data.push({ id: d.id, ...d.data() }));
        data.sort((a, b) => new Date(b.lastMessageTime || 0) - new Date(a.lastMessageTime || 0));
        setConversations(data);
      } catch (error) {
        console.error('Erro ao carregar conversas:', error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [userId]);

  if (loading) return <p style={styles.emptyText}>Carregando...</p>;
  if (conversations.length === 0) return <p style={styles.emptyText}>Nenhuma conversa</p>;

  return (
    <div>
      <p style={{ ...styles.emptyText, marginBottom: '12px' }}>
        Por privacidade, o conteúdo das mensagens não é exibido aqui — só a lista de conversas.
      </p>
      <div style={styles.listContainer}>
        {conversations.map((c) => (
          <div key={c.id} style={styles.listRow}>
            <span style={styles.listRowTitle}>{c.lastMessage || '(sem mensagens)'}</span>
            <span style={styles.listRowMeta}>
              {c.lastMessageTime ? new Date(c.lastMessageTime).toLocaleString('pt-BR') : '-'}
            </span>
          </div>
        ))}
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
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '30px',
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
  },
  searchContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    backgroundColor: '#1a1a1a',
    borderRadius: '8px',
    border: '1px solid #e0e0e0',
    marginBottom: '24px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
  },
  searchInput: {
    flex: 1,
    border: 'none',
    backgroundColor: 'transparent',
    color: '#fff',
    fontSize: '14px',
    outline: 'none',
  },
  table: {
    backgroundColor: '#1a1a1a',
    borderRadius: '12px',
    border: '1px solid #e0e0e0',
    overflow: 'hidden',
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
  },
  tableHeader: {
    display: 'flex',
    padding: '16px 20px',
    backgroundColor: '#0a0a0a',
    borderBottom: '1px solid #e0e0e0',
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
    color: '#fff',
    marginBottom: '4px',
  },
  userEmail: {
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
  statusActive: {
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
    color: '#4ade80',
  },
  statusSuspended: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    color: '#fbbf24',
  },
  statusBanned: {
    backgroundColor: 'rgba(255, 0, 0, 0.1)',
    color: '#f87171',
  },
  actions: {
    gap: '8px',
  },
  actionButton: {
    padding: '8px',
    borderRadius: '6px',
    border: '1px solid #e0e0e0',
    backgroundColor: 'transparent',
    color: '#999',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    transition: 'all 0.2s',
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
    backgroundColor: '#1a1a1a',
    borderRadius: '12px',
    border: '1px solid #e0e0e0',
    width: '90%',
    maxWidth: '700px',
    maxHeight: '85vh',
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
  headerPhoto: {
    width: '50px',
    height: '50px',
    borderRadius: '25px',
    objectFit: 'cover',
  },
  modalTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#fff',
  },
  closeButton: {
    background: 'none',
    border: 'none',
    color: '#999',
    fontSize: '32px',
    cursor: 'pointer',
    lineHeight: '20px',
  },
  statusActionsRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '16px 20px',
    borderBottom: '1px solid #f0f0f0',
    flexWrap: 'wrap',
  },
  pillButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 14px',
    borderRadius: '20px',
    border: '1px solid #e0e0e0',
    backgroundColor: '#1a1a1a',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  pillSuccess: { borderColor: '#4CAF50', color: '#4ade80' },
  pillWarning: { borderColor: '#f59e0b', color: '#fbbf24' },
  pillDanger: { borderColor: '#ef4444', color: '#f87171' },
  tabsRow: {
    display: 'flex',
    gap: '4px',
    padding: '12px 20px 0',
    borderBottom: '1px solid #f0f0f0',
    overflowX: 'auto',
  },
  tabButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '10px 14px',
    border: 'none',
    borderBottom: '2px solid transparent',
    backgroundColor: 'transparent',
    fontSize: '13px',
    fontWeight: '500',
    color: '#999',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  tabButtonActive: {
    color: '#fff',
    borderBottomColor: '#fff',
    fontWeight: 'bold',
  },
  modalBody: {
    padding: '20px',
  },
  field: {
    marginBottom: '16px',
  },
  fieldLabel: {
    fontSize: '12px',
    color: '#999',
    marginBottom: '6px',
    display: 'block',
  },
  fieldInput: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '8px',
    border: '1px solid #e0e0e0',
    fontSize: '14px',
    color: '#fff',
    boxSizing: 'border-box',
  },
  saveButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '10px 16px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: '#fff',
    color: '#1a1a1a',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  modalValue: {
    fontSize: '14px',
    color: '#fff',
  },
  modalStats: {
    display: 'flex',
    justifyContent: 'space-around',
    padding: '16px',
    backgroundColor: '#0a0a0a',
    borderRadius: '8px',
    marginBottom: '16px',
    border: '1px solid #e0e0e0',
    flexWrap: 'wrap',
    gap: '10px',
  },
  modalStat: {
    textAlign: 'center',
  },
  modalStatValue: {
    fontSize: '22px',
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: '2px',
  },
  modalStatLabel: {
    fontSize: '11px',
    color: '#999',
    textTransform: 'capitalize',
  },
  listContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    maxHeight: '350px',
    overflowY: 'auto',
  },
  listRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 12px',
    borderRadius: '8px',
    backgroundColor: '#0a0a0a',
    border: '1px solid #f0f0f0',
    gap: '10px',
  },
  listRowTitle: {
    fontSize: '13px',
    color: '#fff',
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  listRowMeta: {
    fontSize: '11px',
    color: '#999',
    flexShrink: 0,
  },
  emptyText: {
    color: '#999',
    fontSize: '13px',
    textAlign: 'center',
    padding: '20px',
  },
};
