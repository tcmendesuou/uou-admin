import React, { useState, useEffect } from 'react';
import { 
  collection, 
  doc, 
  setDoc, 
  getDocs,
  query,
  orderBy 
} from 'firebase/firestore';
import { db } from '../firebase';
import './CreatorLevels.css';

// 🎯 VALORES PRÉ-DEFINIDOS (1-200)
const generateDefaultLevels = () => {
  const levels = [];
  
  for (let i = 1; i <= 200; i++) {
    let lives, hours, followers, revenue;
    
    // NÍVEL 1-50: INICIANTE → INTERMEDIÁRIO
    if (i <= 50) {
      lives = Math.round(i * 2);              // 2 → 100
      hours = Math.round(i * 3);              // 3 → 150
      followers = Math.round(i * 20);         // 20 → 1.000
      revenue = Math.round(i * 50);           // 50 → 2.500
    }
    // NÍVEL 51-100: INTERMEDIÁRIO → AVANÇADO
    else if (i <= 100) {
      const offset = i - 50;
      lives = 100 + Math.round(offset * 4);         // 100 → 300
      hours = 150 + Math.round(offset * 6);         // 150 → 450
      followers = 1000 + Math.round(offset * 50);   // 1.000 → 3.500
      revenue = 2500 + Math.round(offset * 150);    // 2.500 → 10.000
    }
    // NÍVEL 101-150: AVANÇADO → PROFISSIONAL
    else if (i <= 150) {
      const offset = i - 100;
      lives = 300 + Math.round(offset * 8);          // 300 → 700
      hours = 450 + Math.round(offset * 15);         // 450 → 1.200
      followers = 3500 + Math.round(offset * 200);   // 3.500 → 13.500
      revenue = 10000 + Math.round(offset * 400);    // 10.000 → 30.000
    }
    // NÍVEL 151-200: PROFISSIONAL → MR. BEAST! 🔥
    else {
      const offset = i - 150;
      lives = 700 + Math.round(offset * 20);          // 700 → 1.700
      hours = 1200 + Math.round(offset * 40);         // 1.200 → 3.200
      followers = 13500 + Math.round(offset * 1000);  // 13.500 → 63.500
      revenue = 30000 + Math.round(offset * 2000);    // 30.000 → 130.000
    }
    
    levels.push({
      level: i,
      lives_count: lives,
      hours_streamed: hours,
      followers_count: followers,
      total_revenue: revenue,
    });
  }
  
  return levels;
};

export default function CreatorLevels() {
  const [levels, setLevels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingCell, setEditingCell] = useState(null);

  useEffect(() => {
    loadLevels();
  }, []);

  const loadLevels = async () => {
    try {
      const levelsRef = collection(db, 'creator_levels');
      const q = query(levelsRef, orderBy('level'));
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        // Se não existe, criar com valores padrão
        console.log('📊 Nenhum nível encontrado, carregando valores padrão...');
        const defaultLevels = generateDefaultLevels();
        setLevels(defaultLevels);
        setLoading(false);
        return;
      }
      
      const loadedLevels = [];
      snapshot.forEach(doc => {
        loadedLevels.push({
          level: doc.data().level,
          lives_count: doc.data().lives_count,
          hours_streamed: doc.data().hours_streamed,
          followers_count: doc.data().followers_count,
          total_revenue: doc.data().total_revenue,
        });
      });
      
      // Ordenar por nível
      loadedLevels.sort((a, b) => a.level - b.level);
      setLevels(loadedLevels);
      setLoading(false);
      
    } catch (error) {
      console.error('Erro ao carregar níveis:', error);
      // Em caso de erro, carregar valores padrão
      console.log('⚠️ Erro ao carregar, usando valores padrão...');
      const defaultLevels = generateDefaultLevels();
      setLevels(defaultLevels);
      setLoading(false);
    }
  };

  const handleCellChange = (levelIndex, field, value) => {
    const newLevels = [...levels];
    newLevels[levelIndex][field] = parseInt(value) || 0;
    setLevels(newLevels);
  };

  const saveLevels = async () => {
    if (!window.confirm('Salvar configurações de todos os 200 níveis?')) {
      return;
    }

    setSaving(true);
    
    try {
      // Salvar cada nível
      const promises = levels.map(level => {
        const levelRef = doc(db, 'creator_levels', `level_${level.level}`);
        return setDoc(levelRef, {
          level: level.level,
          lives_count: level.lives_count,
          hours_streamed: level.hours_streamed,
          followers_count: level.followers_count,
          total_revenue: level.total_revenue,
          required_criteria: 3, // Precisa 3 de 4
          updated_at: new Date().toISOString(),
        });
      });

      await Promise.all(promises);
      
      alert('✅ Níveis salvos com sucesso!');
      setSaving(false);
    } catch (error) {
      console.error('Erro ao salvar:', error);
      alert('❌ Erro ao salvar níveis!');
      setSaving(false);
    }
  };

  const resetToDefault = () => {
    if (!window.confirm('Resetar TODOS os níveis para valores padrão?')) {
      return;
    }
    
    const defaultLevels = generateDefaultLevels();
    setLevels(defaultLevels);
  };

  if (loading) {
    return (
      <div className="creator-levels-container">
        <div className="loading">Carregando níveis...</div>
      </div>
    );
  }

  return (
    <div className="creator-levels-container">
      <div className="header">
        <h1>📊 Configuração de Níveis de Criadores</h1>
        <p className="subtitle">
          200 níveis • Criador precisa atingir <strong>3 de 4 critérios</strong> para subir de nível
        </p>
      </div>

      <div className="actions">
        <button 
          onClick={saveLevels} 
          disabled={saving}
          className="btn-save"
        >
          {saving ? '💾 Salvando...' : '💾 Salvar Todos os Níveis'}
        </button>
        <button 
          onClick={resetToDefault}
          className="btn-reset"
        >
          🔄 Resetar para Padrão
        </button>
      </div>

      <div className="levels-info">
        <div className="info-card">
          <span className="badge blue">1-50</span>
          <span>Iniciante → Intermediário</span>
        </div>
        <div className="info-card">
          <span className="badge green">51-100</span>
          <span>Intermediário → Avançado</span>
        </div>
        <div className="info-card">
          <span className="badge purple">101-150</span>
          <span>Avançado → Profissional</span>
        </div>
        <div className="info-card">
          <span className="badge gold">151-200</span>
          <span>Profissional → LENDÁRIO 🔥</span>
        </div>
      </div>

      <div className="table-wrapper">
        <table className="levels-table">
          <thead>
            <tr>
              <th>NÍVEL</th>
              <th>LIVES</th>
              <th>HORAS</th>
              <th>SEGUIDORES</th>
              <th>FATURAMENTO (R$)</th>
            </tr>
          </thead>
          <tbody>
            {levels.map((level, index) => (
              <tr 
                key={level.level}
                className={
                  level.level <= 50 ? 'tier-beginner' :
                  level.level <= 100 ? 'tier-intermediate' :
                  level.level <= 150 ? 'tier-advanced' :
                  'tier-legendary'
                }
              >
                <td className="level-number">
                  {level.level}
                  {level.level === 200 && ' 👑'}
                </td>
                <td>
                  <input
                    type="number"
                    value={level.lives_count}
                    onChange={(e) => handleCellChange(index, 'lives_count', e.target.value)}
                    className="cell-input"
                  />
                </td>
                <td>
                  <input
                    type="number"
                    value={level.hours_streamed}
                    onChange={(e) => handleCellChange(index, 'hours_streamed', e.target.value)}
                    className="cell-input"
                  />
                </td>
                <td>
                  <input
                    type="number"
                    value={level.followers_count}
                    onChange={(e) => handleCellChange(index, 'followers_count', e.target.value)}
                    className="cell-input"
                  />
                </td>
                <td>
                  <input
                    type="number"
                    value={level.total_revenue}
                    onChange={(e) => handleCellChange(index, 'total_revenue', e.target.value)}
                    className="cell-input"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="footer-actions">
        <button 
          onClick={saveLevels} 
          disabled={saving}
          className="btn-save-large"
        >
          {saving ? '💾 Salvando...' : '💾 Salvar Configurações'}
        </button>
      </div>
    </div>
  );
}
