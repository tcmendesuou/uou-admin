import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Settings as SettingsIcon, Save, Plus, Trash2 } from 'lucide-react';

export default function Settings() {
  const [settings, setSettings] = useState({
    platformCommission: 20,
    minWithdrawal: 50,
    categories: [
      'Turismo',
      'Culinária',
      'Música',
      'Esportes',
      'Games',
      'Educação',
      'Arte',
      'Tecnologia',
      'Outros',
    ],
    featuredCreators: [],
    appVersion: '1.0.0',
  });
  const [newCategory, setNewCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const settingsDoc = await getDoc(doc(db, 'settings', 'platform'));
      if (settingsDoc.exists()) {
        setSettings({ ...settings, ...settingsDoc.data() });
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'platform'), settings);
      alert('Configurações salvas com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      alert('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  const handleAddCategory = () => {
    if (newCategory.trim() && !settings.categories.includes(newCategory.trim())) {
      setSettings({
        ...settings,
        categories: [...settings.categories, newCategory.trim()]
      });
      setNewCategory('');
    }
  };

  const handleRemoveCategory = (category) => {
    if (window.confirm(`Remover categoria "${category}"?`)) {
      setSettings({
        ...settings,
        categories: settings.categories.filter(c => c !== category)
      });
    }
  };

  if (loading) {
    return <div style={styles.loading}>Carregando configurações...</div>;
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Configurações</h1>
          <p style={styles.subtitle}>Gerencie as configurações da plataforma</p>
        </div>
        <button
          style={styles.saveButton}
          onClick={handleSaveSettings}
          disabled={saving}
        >
          <Save size={20} />
          <span>{saving ? 'Salvando...' : 'Salvar Alterações'}</span>
        </button>
      </div>

      <div style={styles.sections}>
        {/* Comissão */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Financeiro</h2>
          
          <div style={styles.settingGroup}>
            <label style={styles.label}>
              Comissão da Plataforma (%)
              <span style={styles.labelHint}>
                Percentual cobrado sobre cada transação
              </span>
            </label>
            <input
              type="number"
              value={settings.platformCommission}
              onChange={(e) => setSettings({
                ...settings,
                platformCommission: parseFloat(e.target.value)
              })}
              style={styles.input}
              min="0"
              max="100"
              step="1"
            />
          </div>

          <div style={styles.settingGroup}>
            <label style={styles.label}>
              Saque Mínimo (R$)
              <span style={styles.labelHint}>
                Valor mínimo para solicitar saque
              </span>
            </label>
            <input
              type="number"
              value={settings.minWithdrawal}
              onChange={(e) => setSettings({
                ...settings,
                minWithdrawal: parseFloat(e.target.value)
              })}
              style={styles.input}
              min="0"
              step="10"
            />
          </div>
        </div>

        {/* Categorias */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Categorias de Lives</h2>
          
          <div style={styles.categoriesAddContainer}>
            <input
              type="text"
              placeholder="Nova categoria..."
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddCategory()}
              style={styles.input}
            />
            <button
              style={styles.addButton}
              onClick={handleAddCategory}
            >
              <Plus size={20} />
              Adicionar
            </button>
          </div>

          <div style={styles.categoriesList}>
            {settings.categories.map((category) => (
              <div key={category} style={styles.categoryItem}>
                <span style={styles.categoryName}>{category}</span>
                <button
                  style={styles.removeButton}
                  onClick={() => handleRemoveCategory(category)}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Informações da Plataforma */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Informações da Plataforma</h2>
          
          <div style={styles.settingGroup}>
            <label style={styles.label}>
              Versão do App
              <span style={styles.labelHint}>
                Versão atual do aplicativo móvel
              </span>
            </label>
            <input
              type="text"
              value={settings.appVersion}
              onChange={(e) => setSettings({
                ...settings,
                appVersion: e.target.value
              })}
              style={styles.input}
              placeholder="1.0.0"
            />
          </div>

          <div style={styles.infoCard}>
            <h3 style={styles.infoCardTitle}>Informações do Sistema</h3>
            <div style={styles.infoGrid}>
              <div style={styles.infoItem}>
                <p style={styles.infoLabel}>Ambiente</p>
                <p style={styles.infoValue}>Produção</p>
              </div>
              <div style={styles.infoItem}>
                <p style={styles.infoLabel}>Database</p>
                <p style={styles.infoValue}>Firestore</p>
              </div>
              <div style={styles.infoItem}>
                <p style={styles.infoLabel}>Storage</p>
                <p style={styles.infoValue}>Firebase Storage</p>
              </div>
              <div style={styles.infoItem}>
                <p style={styles.infoLabel}>Streaming</p>
                <p style={styles.infoValue}>GetStream.io</p>
              </div>
            </div>
          </div>
        </div>

        {/* Regras da Plataforma */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Regras e Políticas</h2>
          
          <div style={styles.rulesCard}>
            <h3 style={styles.rulesTitle}>Diretrizes da Comunidade</h3>
            <ul style={styles.rulesList}>
              <li style={styles.ruleItem}>Conteúdo adulto ou explícito é proibido</li>
              <li style={styles.ruleItem}>Respeite os direitos autorais</li>
              <li style={styles.ruleItem}>Não promova ódio ou discriminação</li>
              <li style={styles.ruleItem}>Mantenha um ambiente seguro e respeitoso</li>
              <li style={styles.ruleItem}>Lives devem ter conteúdo real e relevante</li>
            </ul>
          </div>

          <div style={styles.rulesCard}>
            <h3 style={styles.rulesTitle}>Política de Reembolso</h3>
            <ul style={styles.rulesList}>
              <li style={styles.ruleItem}>Reembolso disponível em até 24h após a compra</li>
              <li style={styles.ruleItem}>Live deve ter problemas técnicos graves</li>
              <li style={styles.ruleItem}>Análise caso a caso pela equipe</li>
            </ul>
          </div>
        </div>

        {/* Zona de Perigo */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Zona de Perigo</h2>
          
          <div style={styles.dangerCard}>
            <h3 style={styles.dangerTitle}>Ações Irreversíveis</h3>
            <p style={styles.dangerText}>
              As ações abaixo são permanentes e não podem ser desfeitas. Use com cautela.
            </p>
            <div style={styles.dangerActions}>
              <button style={styles.dangerButton}>
                Limpar Cache do Sistema
              </button>
              <button style={styles.dangerButton}>
                Resetar Estatísticas
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: '1000px',
    margin: '0 auto',
  },
  loading: {
    textAlign: 'center',
    padding: '40px',
    color: '#8a8a95',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '40px',
  },
  title: {
    fontSize: '28px',
    fontWeight: '800',
    color: '#fff',
    marginBottom: '8px',
  },
  subtitle: {
    fontSize: '14px',
    color: '#8a8a95',
  },
  saveButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 24px',
    borderRadius: '10px',
    border: '1px solid #52fa35',
    backgroundColor: 'rgba(82,250,53,0.05)',
    color: '#52fa35',
    fontSize: '14px',
    fontWeight: '700',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    fontFamily: 'inherit',
  },
  sections: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  section: {
    backgroundColor: '#1b1b1d',
    borderRadius: '12px',
    border: '1px solid #2a2a2d',
    padding: '24px',
  },
  sectionTitle: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: '24px',
  },
  settingGroup: {
    marginBottom: '24px',
  },
  label: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    fontSize: '14px',
    fontWeight: '500',
    color: '#fff',
    marginBottom: '8px',
  },
  labelHint: {
    fontSize: '12px',
    color: '#8a8a95',
    fontWeight: 'normal',
  },
  input: {
    width: '100%',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
    padding: '12px 16px',
    borderRadius: '8px',
    border: '1px solid #2a2a2d',
    backgroundColor: '#222224',
    color: '#fff',
    fontSize: '14px',
    outline: 'none',
  },
  categoriesAddContainer: {
    display: 'flex',
    gap: '12px',
    marginBottom: '20px',
  },
  addButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 20px',
    borderRadius: '10px',
    border: '1px solid #52fa35',
    backgroundColor: 'rgba(82,250,53,0.05)',
    color: '#52fa35',
    fontSize: '14px',
    fontWeight: '700',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    fontFamily: 'inherit',
  },
  categoriesList: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '12px',
  },
  categoryItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    backgroundColor: '#222224',
    borderRadius: '8px',
    border: '1px solid #2a2a2d',
  },
  categoryName: {
    fontSize: '14px',
    color: '#fff',
  },
  removeButton: {
    padding: '6px',
    borderRadius: '4px',
    border: 'none',
    backgroundColor: 'transparent',
    color: '#ff0000',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
  },
  infoCard: {
    backgroundColor: '#222224',
    borderRadius: '8px',
    padding: '20px',
    border: '1px solid #2a2a2d',
  },
  infoCardTitle: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: '16px',
  },
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '16px',
  },
  infoItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  infoLabel: {
    fontSize: '12px',
    color: '#8a8a95',
  },
  infoValue: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#fff',
  },
  rulesCard: {
    backgroundColor: '#222224',
    borderRadius: '8px',
    padding: '20px',
    border: '1px solid #2a2a2d',
    marginBottom: '16px',
  },
  rulesTitle: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: '12px',
  },
  rulesList: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
  },
  ruleItem: {
    fontSize: '14px',
    color: '#8a8a95',
    marginBottom: '8px',
    paddingLeft: '20px',
    position: 'relative',
    '::before': {
      content: '"•"',
      position: 'absolute',
      left: 0,
      color: '#FFD700',
    },
  },
  dangerCard: {
    backgroundColor: 'rgba(255, 0, 0, 0.1)',
    borderRadius: '8px',
    padding: '20px',
    border: '1px solid #ff0000',
  },
  dangerTitle: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#ff0000',
    marginBottom: '8px',
  },
  dangerText: {
    fontSize: '14px',
    color: '#8a8a95',
    marginBottom: '16px',
  },
  dangerActions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  dangerButton: {
    padding: '10px 16px',
    borderRadius: '6px',
    border: '1px solid #ff0000',
    backgroundColor: 'transparent',
    color: '#ff0000',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    textAlign: 'left',
  },
};
