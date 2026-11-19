import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Save, RotateCcw } from 'lucide-react';

// ===========================================================================
// Parâmetros das Lives (T1 a T13) — Livro de Regras do UOU
// Salvos em settings/liveParams. O app lê daqui; sem o documento, usa defaults.
// Os percentuais financeiros NÃO ficam aqui: continuam em settings/financeConfig
// (Financeiro > Regras).
// ===========================================================================

const DEFAULTS = {
  creatorDropToleranceMinutes: 5,
  maxPauseMinutes: 10,
  scheduledNoShowMinutes: 15,
  regretWindowMinutes: 2,
  walletHoldHours: 24,
  earlyEndThresholdPercent: 20,
  emptyLiveWarnSeconds: 120,
  emptyLiveEndSeconds: 300,
  maxGuests: 3,
  maxLiveDurationMinutes: 360,
  refundCutoffBeforeStartMinutes: 60,
  refundRequestWindowAfterEndMinutes: 15,
  prizeDrawLeadSeconds: 150,
  maxSchedulingDaysAhead: 45,
};

const FIELDS = {
  creatorDropToleranceMinutes: { code: 'T1', label: 'Tolerância de queda do criador', unit: 'min', min: 1, max: 30, hint: 'Tempo para o criador voltar de uma queda. Os usuários veem "criador reconectando".' },
  maxPauseMinutes: { code: 'T2', label: 'Espera e pausa máximas', unit: 'min', min: 1, max: 60, hint: 'Vale para queda, pausa voluntária e ligação. Passou disso, a live é encerrada.' },
  maxLiveDurationMinutes: { code: 'T9', label: 'Duração máxima de uma live', unit: 'min', min: 15, max: 720, hint: 'Maior tempo que o criador pode escolher ao criar a live.' },
  scheduledNoShowMinutes: { code: 'T3', label: 'Atraso máximo da live agendada', unit: 'min', min: 5, max: 60, hint: 'Passou disso sem o criador entrar, a live é cancelada e todos são reembolsados.' },
  maxSchedulingDaysAhead: { code: 'T13', label: 'Antecedência máxima para agendar', unit: 'dias', min: 1, max: 180, hint: 'Data mais distante que o criador pode agendar.' },
  earlyEndThresholdPercent: { code: 'T6', label: 'Encerramento antecipado', unit: '%', min: 0, max: 90, hint: 'Se o criador encerrar com mais que isso do tempo faltando, avisa e reembolsa todos.' },
  emptyLiveWarnSeconds: { code: 'T7', label: 'Live vazia: aviso', unit: 's', min: 30, max: 600, hint: 'Tempo sem áudio e vídeo até avisar o criador.' },
  emptyLiveEndSeconds: { code: 'T7', label: 'Live vazia: encerrar', unit: 's', min: 60, max: 3600, hint: 'Tempo sem áudio e vídeo até encerrar a live. Precisa ser maior que o aviso.' },
  prizeDrawLeadSeconds: { code: 'T12', label: 'Sorteio da Premiada', unit: 's', min: 30, max: 900, hint: 'Quanto antes do fim da live o sorteio acontece (150 s = 2 min 30 s).' },
  regretWindowMinutes: { code: 'T4', label: 'Janela de arrependimento', unit: 'min', min: 1, max: 15, hint: 'Quem sai da live nesse tempo pode pedir reembolso integral.' },
  walletHoldHours: { code: 'T5', label: 'Tempo em Pendente na wallet', unit: 'h', min: 0, max: 168, hint: 'O valor cai na wallet como Pendente e vira Disponível para saque depois disso.' },
  refundCutoffBeforeStartMinutes: { code: 'T10', label: 'Reembolso antes do início', unit: 'min', min: 0, max: 1440, hint: 'Até quanto tempo antes do início da live o ingresso pode ser reembolsado.' },
  refundRequestWindowAfterEndMinutes: { code: 'T11', label: 'Pedido de reembolso depois do fim', unit: 'min', min: 0, max: 1440, hint: 'Prazo para o usuário pedir reembolso depois que a live termina.' },
  maxGuests: { code: 'T8', label: 'Limite de convidados no palco', unit: 'pessoas', min: 1, max: 10, hint: 'Quantos convidados podem estar no palco junto com o criador.' },
};

const GROUPS = [
  { title: 'Criador', keys: ['creatorDropToleranceMinutes', 'maxPauseMinutes', 'maxLiveDurationMinutes'] },
  { title: 'Live agendada', keys: ['scheduledNoShowMinutes', 'maxSchedulingDaysAhead'] },
  { title: 'Encerramento', keys: ['earlyEndThresholdPercent', 'emptyLiveWarnSeconds', 'emptyLiveEndSeconds', 'prizeDrawLeadSeconds'] },
  { title: 'Dinheiro', keys: ['regretWindowMinutes', 'walletHoldHours', 'refundCutoffBeforeStartMinutes', 'refundRequestWindowAfterEndMinutes'] },
  { title: 'Palco', keys: ['maxGuests'] },
];

const KEYS = Object.keys(DEFAULTS);

function toForm(timings) {
  const out = {};
  KEYS.forEach((k) => {
    const n = Number(timings && timings[k]);
    out[k] = Number.isFinite(n) && timings && timings[k] !== null && timings[k] !== '' ? String(n) : String(DEFAULTS[k]);
  });
  return out;
}

function formatWhen(v) {
  if (!v) return null;
  let d = null;
  if (typeof v.toDate === 'function') d = v.toDate();
  else if (typeof v === 'string' || typeof v === 'number') d = new Date(v);
  else if (typeof v.seconds === 'number') d = new Date(v.seconds * 1000);
  if (!d || isNaN(d.getTime())) return null;
  return d.toLocaleString('pt-BR');
}

function validate(form) {
  const nums = {};
  for (const k of KEYS) {
    const f = FIELDS[k];
    const raw = String(form[k]).trim();
    const n = Number(raw);
    if (raw === '' || !Number.isInteger(n)) return { error: `${f.code} · ${f.label}: use um número inteiro.` };
    if (n < f.min || n > f.max) return { error: `${f.code} · ${f.label}: o valor precisa estar entre ${f.min} e ${f.max} ${f.unit}.` };
    nums[k] = n;
  }
  if (nums.emptyLiveEndSeconds <= nums.emptyLiveWarnSeconds) {
    return { error: 'T7 · Live vazia: o tempo para encerrar precisa ser maior que o tempo do aviso.' };
  }
  return { nums };
}

export default function LiveParams() {
  const [form, setForm] = useState(toForm(null));
  const [saved, setSaved] = useState(toForm(null));
  const [exists, setExists] = useState(true);
  const [meta, setMeta] = useState({ updatedAt: null, updatedBy: null });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const snap = await getDoc(doc(db, 'settings', 'liveParams'));
      if (snap.exists()) {
        const data = snap.data();
        const f = toForm(data.timings);
        setForm(f);
        setSaved(f);
        setExists(true);
        setMeta({ updatedAt: data.updatedAt || null, updatedBy: data.updatedBy || null });
      } else {
        const f = toForm(null);
        setForm(f);
        setSaved(f);
        setExists(false);
        setMeta({ updatedAt: null, updatedBy: null });
      }
    } catch (e) {
      console.error('Erro ao carregar parâmetros das lives:', e);
      alert('Erro ao carregar os parâmetros: ' + e.message);
    }
    setLoading(false);
  }

  const dirty = KEYS.some((k) => String(form[k]) !== String(saved[k]));

  function setField(k, v) {
    setForm((prev) => ({ ...prev, [k]: v }));
  }

  async function handleSave() {
    const res = validate(form);
    if (res.error) { alert(res.error); return; }
    setSaving(true);
    try {
      await setDoc(
        doc(db, 'settings', 'liveParams'),
        {
          version: 1,
          timings: res.nums,
          updatedAt: serverTimestamp(),
          updatedBy: (auth.currentUser && auth.currentUser.uid) || null,
        },
        { merge: true }
      );
      alert('Parâmetros salvos.');
      await load();
    } catch (e) {
      console.error('Erro ao salvar parâmetros das lives:', e);
      alert('Erro ao salvar: ' + e.message);
    }
    setSaving(false);
  }

  function handleRestore() {
    if (!window.confirm('Repor todos os campos para os valores padrão? Nada é salvo até você clicar em Salvar.')) return;
    const f = {};
    KEYS.forEach((k) => { f[k] = String(DEFAULTS[k]); });
    setForm(f);
  }

  if (loading) return <div style={styles.loading}>Carregando...</div>;

  const when = formatWhen(meta.updatedAt);

  return (
    <div style={styles.container}>
      <div style={styles.headerRow}>
        <div>
          <h1 style={styles.title}>Parâmetros das Lives</h1>
          <p style={styles.subtitle}>
            Os tempos e limites T1 a T13 do Livro de Regras. O app lê estes valores, então a mudança vale sem publicar uma nova versão.
          </p>
        </div>
        <div style={styles.actions}>
          <button type="button" style={styles.secondaryBtn} onClick={handleRestore} disabled={saving}>
            <RotateCcw size={16} /> Restaurar padrões
          </button>
          <button type="button" style={{ ...styles.saveBtn, opacity: saving ? 0.6 : 1 }} onClick={handleSave} disabled={saving}>
            <Save size={16} /> {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>

      <p style={styles.statusLine}>
        {!exists && 'Ainda não salvo: mostrando os valores padrão. '}
        {exists && when && `Última atualização: ${when}. `}
        {dirty && <span style={styles.dirty}>Há alterações não salvas.</span>}
      </p>

      <div style={styles.grid}>
        {GROUPS.map((g) => (
          <div key={g.title} style={styles.card}>
            <h2 style={styles.cardTitle}>{g.title}</h2>
            {g.keys.map((k) => {
              const f = FIELDS[k];
              return (
                <div key={k} style={styles.field}>
                  <label style={styles.label} htmlFor={`lp-${k}`}>
                    <span style={styles.labelTop}>
                      <span style={styles.code}>{f.code}</span> {f.label}
                    </span>
                    <span style={styles.hint}>{f.hint}</span>
                  </label>
                  <div style={styles.inputWrap}>
                    <input
                      id={`lp-${k}`}
                      type="number"
                      inputMode="numeric"
                      min={f.min}
                      max={f.max}
                      step="1"
                      value={form[k]}
                      onChange={(e) => setField(k, e.target.value)}
                      style={styles.input}
                    />
                    <span style={styles.suffix}>{f.unit}</span>
                  </div>
                  <span style={styles.range}>Entre {f.min} e {f.max} {f.unit}. Padrão: {DEFAULTS[k]}.</span>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <p style={styles.note}>
        Os percentuais financeiros (estrutura, taxa UOU, donations) ficam em Financeiro &gt; Regras.
      </p>
    </div>
  );
}

const styles = {
  container: { maxWidth: '1400px', margin: '0 auto' },
  loading: { textAlign: 'center', padding: '40px', color: '#8a8a95' },
  headerRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '24px', flexWrap: 'wrap' },
  title: { fontSize: '28px', fontWeight: '800', color: '#fff', marginBottom: '8px' },
  subtitle: { fontSize: '14px', color: '#8a8a95', marginBottom: '16px', maxWidth: '640px', lineHeight: 1.5 },
  actions: { display: 'flex', gap: '12px', flexWrap: 'wrap' },
  saveBtn: {
    display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 24px', borderRadius: '10px',
    border: '1px solid #52fa35', backgroundColor: 'rgba(82,250,53,0.05)', color: '#52fa35',
    fontSize: '14px', fontWeight: '700', cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit',
  },
  secondaryBtn: {
    display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '10px',
    border: '1px solid #2a2a2d', backgroundColor: 'transparent', color: '#f0f0f0',
    fontSize: '14px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit',
  },
  statusLine: { fontSize: '13px', color: '#8a8a95', margin: '0 0 24px 0' },
  dirty: { color: '#ffb020', fontWeight: '600' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '24px', alignItems: 'start' },
  card: { backgroundColor: '#1b1b1d', borderRadius: '12px', border: '1px solid #2a2a2d', padding: '24px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' },
  cardTitle: { fontSize: '18px', fontWeight: '700', color: '#f0f0f0', marginBottom: '20px' },
  field: { marginBottom: '22px' },
  label: { display: 'flex', flexDirection: 'column', gap: '3px', marginBottom: '8px' },
  labelTop: { fontSize: '14px', fontWeight: '500', color: '#f0f0f0' },
  code: { display: 'inline-block', fontSize: '11px', fontWeight: '700', color: '#52fa35', border: '1px solid rgba(82,250,53,0.4)', borderRadius: '6px', padding: '1px 6px', marginRight: '6px' },
  hint: { fontSize: '12px', color: '#8a8a95', lineHeight: 1.4 },
  inputWrap: { position: 'relative' },
  input: {
    width: '100%', padding: '10px 64px 10px 14px', borderRadius: '8px', border: '1px solid #2a2a2d',
    backgroundColor: '#222224', color: '#f0f0f0', fontSize: '14px', outline: 'none', boxSizing: 'border-box',
  },
  suffix: { position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', color: '#8a8a95', fontSize: '13px', pointerEvents: 'none' },
  range: { display: 'block', marginTop: '6px', fontSize: '11px', color: '#6a6a74' },
  note: { color: '#8a8a95', fontSize: '12px', margin: '24px 0 0 0', lineHeight: 1.5 },
};
