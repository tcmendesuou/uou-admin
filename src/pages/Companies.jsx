import React, { useEffect, useState } from 'react';
import {
  collection, query, onSnapshot, doc, getDoc, setDoc, updateDoc, deleteDoc,
} from 'firebase/firestore';
import { ref, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, auth, storage } from '../firebase';
import { Building2, FileText, Check, X, FilePlus, Ban, RotateCcw, Trash2 } from 'lucide-react';

const TABS = [
  { key: 'open', label: 'Pendentes', statuses: ['pending'] },
  { key: 'needs_docs', label: 'Aguardando documento', statuses: ['needs_docs'] },
  { key: 'approved', label: 'Aprovados', statuses: ['approved'] },
  { key: 'rejected', label: 'Recusados', statuses: ['rejected'] },
  { key: 'companies', label: 'Empresas ativas', statuses: [] },
];
const DOC_LABELS = {
  cnpjCard: 'Cartão CNPJ',
  idDoc: 'Documento com foto',
  authLetter: 'Carta de autorização',
};
const RELATION = {
  partner: 'Sócio(a) ou representante legal',
  authorized: 'Tem autorização da empresa',
};

const fmtCnpj = (v) => String(v || '')
  .replace(/\D/g, '')
  .replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
const fmtPhone = (v) => {
  const d = String(v || '').replace(/\D/g, '');
  return d.length === 11 ? d.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3')
    : d.length === 10 ? d.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3') : v;
};

export default function Companies() {
  const [requests, setRequests] = useState(null);
  const [companies, setCompanies] = useState(null);
  const [tab, setTab] = useState('open');
  const [names, setNames] = useState({});
  const [busy, setBusy] = useState(null);

  useEffect(() => {
    const q = query(collection(db, 'company_requests'));
    return onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
      setRequests(list);
    }, (err) => { console.error('[Companies]', err); setRequests([]); });
  }, []);

  useEffect(() => onSnapshot(collection(db, 'companies'), (snap) => {
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    list.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
    setCompanies(list);
  }, (err) => { console.error('[Companies] empresas', err); setCompanies([]); }), []);

  // Nome de quem pediu (busca uma vez por usuário)
  useEffect(() => {
    if (!requests) return;
    const missing = [...new Set(requests.map((r) => r.uid))].filter((u) => u && !names[u]);
    missing.forEach(async (u) => {
      try {
        const s = await getDoc(doc(db, 'users', u));
        setNames((n) => ({ ...n, [u]: s.exists() ? (s.data().name || s.data().email || u) : u }));
      } catch { setNames((n) => ({ ...n, [u]: u })); }
    });
  }, [requests]); // eslint-disable-line react-hooks/exhaustive-deps

  const counts = {};
  TABS.forEach((t) => { counts[t.key] = (requests || []).filter((r) => t.statuses.includes(r.status)).length; });
  counts.companies = (companies || []).length;
  const current = TABS.find((t) => t.key === tab);
  const shown = (requests || []).filter((r) => current.statuses.includes(r.status));

  // Apaga os documentos do Storage (LGPD) — chamado ao aprovar ou recusar
  const wipeDocs = async (r) => {
    for (const path of Object.values(r.docs || {})) {
      try { await deleteObject(ref(storage, path)); } catch { /* já não existe */ }
    }
  };

  const openDoc = async (path) => {
    try { window.open(await getDownloadURL(ref(storage, path)), '_blank', 'noopener'); }
    catch (e) { alert('Não foi possível abrir o arquivo: ' + (e?.code || e?.message)); }
  };

  const approve = async (r) => {
    if (!window.confirm(`Aprovar "${r.tradeName || r.legalName}" e criar o perfil da empresa?\nOs documentos serão apagados depois.`)) return;
    setBusy(r.id);
    try {
      const companyRef = doc(db, 'companies', r.cnpj);
      if ((await getDoc(companyRef)).exists()) {
        alert('Já existe uma empresa com esse CNPJ. Recuse este pedido.');
        return;
      }
      await setDoc(companyRef, {
        legalName: r.legalName,
        tradeName: r.tradeName || r.legalName,
        cnpj: r.cnpj,
        email: r.email,
        phone: r.phone,
        site: r.site || '',
        photoURL: '',
        bannerURL: '',
        bio: '',
        status: 'active',
        ownerUid: r.uid,
        memberUids: [r.uid],
        members: { [r.uid]: 'owner' },
        createdAt: new Date().toISOString(),
        approvedBy: auth.currentUser?.uid || '',
      });
      await wipeDocs(r);
      await updateDoc(doc(db, 'company_requests', r.id), {
        status: 'approved', reason: '', docs: {},
        reviewedBy: auth.currentUser?.uid || '', reviewedAt: new Date().toISOString(),
      });
    } catch (e) {
      console.error(e);
      alert('Erro ao aprovar: ' + (e?.code || e?.message));
    } finally { setBusy(null); }
  };

  const reject = async (r) => {
    const reason = window.prompt('Motivo da recusa (a pessoa verá essa mensagem):');
    if (!reason || !reason.trim()) return;
    setBusy(r.id);
    try {
      await wipeDocs(r);
      await updateDoc(doc(db, 'company_requests', r.id), {
        status: 'rejected', reason: reason.trim(), docs: {},
        reviewedBy: auth.currentUser?.uid || '', reviewedAt: new Date().toISOString(),
      });
    } catch (e) { alert('Erro ao recusar: ' + (e?.code || e?.message)); }
    finally { setBusy(null); }
  };

  const askDocs = async (r) => {
    const reason = window.prompt('Qual documento ou correção você precisa? (a pessoa verá essa mensagem)');
    if (!reason || !reason.trim()) return;
    setBusy(r.id);
    try {
      await updateDoc(doc(db, 'company_requests', r.id), {
        status: 'needs_docs', reason: reason.trim(),
        reviewedBy: auth.currentUser?.uid || '', reviewedAt: new Date().toISOString(),
      });
    } catch (e) { alert('Erro: ' + (e?.code || e?.message)); }
    finally { setBusy(null); }
  };

  const suspend = async (c) => {
    const reason = window.prompt(`Suspender "${c.tradeName || c.legalName}"?\nMotivo (a equipe da empresa verá essa mensagem):`);
    if (reason === null) return;
    setBusy(c.id);
    try {
      await updateDoc(doc(db, 'companies', c.id), {
        status: 'suspended', suspendedReason: reason.trim(),
        suspendedAt: new Date().toISOString(), suspendedBy: auth.currentUser?.uid || '',
      });
    } catch (e) { alert('Erro ao suspender: ' + (e?.code || e?.message)); }
    finally { setBusy(null); }
  };

  const reactivate = async (c) => {
    if (!window.confirm(`Reativar "${c.tradeName || c.legalName}"?`)) return;
    setBusy(c.id);
    try {
      await updateDoc(doc(db, 'companies', c.id), { status: 'active', suspendedReason: '' });
    } catch (e) { alert('Erro ao reativar: ' + (e?.code || e?.message)); }
    finally { setBusy(null); }
  };

  const removeCompany = async (c) => {
    const typed = window.prompt(`Excluir "${c.tradeName || c.legalName}" é permanente.\nPara confirmar, digite EXCLUIR:`);
    if (typed !== 'EXCLUIR') return;
    setBusy(c.id);
    try {
      for (const url of [c.photoURL, c.bannerURL]) {
        if (!url) continue;
        try { await deleteObject(ref(storage, url)); } catch { /* já não existe */ }
      }
      await deleteDoc(doc(db, 'companies', c.id));
    } catch (e) { alert('Erro ao excluir: ' + (e?.code || e?.message)); }
    finally { setBusy(null); }
  };

  return (
    <div>
      <h1 style={s.title}>Empresas</h1>
      <p style={s.sub}>Pedidos de abertura de perfil de empresa.</p>

      <div style={s.tabs}>
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            style={{ ...s.tab, ...(tab === t.key ? s.tabActive : {}) }}
          >
            {t.label} <span style={s.count}>{counts[t.key]}</span>
          </button>
        ))}
      </div>

      {tab === 'companies' && companies === null && <p style={s.muted}>Carregando…</p>}
      {tab === 'companies' && companies && companies.length === 0 && <p style={s.muted}>Nenhuma empresa ativa ainda.</p>}
      {tab === 'companies' && (companies || []).map((c) => (
        <div key={c.id} style={s.card}>
          <div style={s.head}>
            <div style={s.icon}><Building2 size={20} /></div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={s.name}>
                {c.tradeName || c.legalName}
                {c.status === 'suspended' && <span style={s.suspendedTag}>Suspensa</span>}
              </div>
              <div style={s.muted}>{c.legalName} · CNPJ {fmtCnpj(c.cnpj)}</div>
            </div>
            <div style={s.muted}>{c.createdAt ? new Date(c.createdAt).toLocaleString('pt-BR') : ''}</div>
          </div>
          <div style={s.grid}>
            <Info label="E-mail" value={c.email} />
            <Info label="Telefone" value={fmtPhone(c.phone)} />
            <Info label="Membros" value={String((c.memberUids || []).length)} />
          </div>
          {c.status === 'suspended' && c.suspendedReason && <div style={s.reason}>Motivo da suspensão: {c.suspendedReason}</div>}
          <div style={s.actions}>
            {c.status === 'suspended' ? (
              <button type="button" disabled={busy === c.id} style={s.approve} onClick={() => reactivate(c)}>
                <RotateCcw size={16} /> Reativar
              </button>
            ) : (
              <button type="button" disabled={busy === c.id} style={s.ask} onClick={() => suspend(c)}>
                <Ban size={16} /> Suspender
              </button>
            )}
            <button type="button" disabled={busy === c.id} style={s.reject} onClick={() => removeCompany(c)}>
              <Trash2 size={16} /> Excluir
            </button>
          </div>
        </div>
      ))}

      {tab !== 'companies' && requests === null && <p style={s.muted}>Carregando…</p>}
      {tab !== 'companies' && requests && shown.length === 0 && <p style={s.muted}>Nenhum pedido nessa aba.</p>}

      {tab !== 'companies' && shown.map((r) => (
        <div key={r.id} style={s.card}>
          <div style={s.head}>
            <div style={s.icon}><Building2 size={20} /></div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={s.name}>{r.tradeName || r.legalName}</div>
              <div style={s.muted}>{r.legalName} · CNPJ {fmtCnpj(r.cnpj)}</div>
            </div>
            <div style={s.muted}>{r.createdAt ? new Date(r.createdAt).toLocaleString('pt-BR') : ''}</div>
          </div>

          <div style={s.grid}>
            <Info label="Solicitante" value={names[r.uid] || r.uid} />
            <Info label="Relação" value={RELATION[r.relation] || r.relation} />
            <Info label="E-mail" value={r.email} />
            <Info label="Telefone" value={fmtPhone(r.phone)} />
            {r.site && <Info label="Site" value={r.site} />}
          </div>

          {Object.keys(r.docs || {}).length > 0 && (
            <div style={s.docs}>
              {Object.entries(r.docs).map(([k, path]) => (
                <button key={k} type="button" style={s.docBtn} onClick={() => openDoc(path)}>
                  <FileText size={14} /> {DOC_LABELS[k] || k}
                </button>
              ))}
            </div>
          )}

          {r.reason && <div style={s.reason}>Mensagem: {r.reason}</div>}

          {(r.status === 'pending' || r.status === 'needs_docs') && (
            <div style={s.actions}>
              <button type="button" disabled={busy === r.id} style={s.approve} onClick={() => approve(r)}>
                <Check size={16} /> Aprovar
              </button>
              {r.status === 'pending' && (
                <button type="button" disabled={busy === r.id} style={s.ask} onClick={() => askDocs(r)}>
                  <FilePlus size={16} /> Pedir documento
                </button>
              )}
              <button type="button" disabled={busy === r.id} style={s.reject} onClick={() => reject(r)}>
                <X size={16} /> Recusar
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div>
      <div style={s.infoLabel}>{label}</div>
      <div style={s.infoValue}>{value || '—'}</div>
    </div>
  );
}

const s = {
  title: { fontSize: 28, fontWeight: 800, color: '#f0f0f0', margin: 0 },
  sub: { color: '#8a8a95', fontSize: 14, margin: '4px 0 20px' },
  tabs: { display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 },
  tab: {
    background: '#1b1b1d', border: '1px solid #2f2f33', borderRadius: 20, padding: '8px 16px',
    fontSize: 13, fontWeight: 600, color: '#cfcfd6', cursor: 'pointer',
  },
  tabActive: {
    background: 'rgba(255,255,255,0.08)', color: '#fff', borderColor: '#fff', fontWeight: 700
  },
  count: { opacity: 0.6, marginLeft: 4 },
  muted: { color: '#8a8a95', fontSize: 13 },
  card: {
    background: '#1b1b1d', border: '1px solid #2a2a2d', borderRadius: 12, padding: 20, marginBottom: 14,
  },
  head: { display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 },
  icon: {
    width: 42, height: 42, borderRadius: 10, background: '#222224', display: 'flex',
    alignItems: 'center', justifyContent: 'center', color: '#f0f0f0',
  },
  name: { fontSize: 17, fontWeight: 700, color: '#f0f0f0' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 },
  infoLabel: { fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5 },
  infoValue: { fontSize: 14, color: '#f0f0f0', marginTop: 2, wordBreak: 'break-word' },
  docs: { display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 16 },
  docBtn: {
    display: 'flex', alignItems: 'center', gap: 6, background: '#222224', border: '1px solid #2f2f33',
    borderRadius: 8, padding: '7px 12px', fontSize: 13, cursor: 'pointer', color: '#f0f0f0',
  },
  suspendedTag: {
    marginLeft: 10, background: 'rgba(255,68,68,0.12)', color: '#ff6b6b', borderRadius: 8, padding: '2px 8px',
    fontSize: 11, fontWeight: 700,
  },
  reason: { marginTop: 14, fontSize: 13, color: '#a0a0aa', background: '#222224', borderRadius: 8, padding: '8px 12px' },
  actions: { display: 'flex', gap: 10, marginTop: 18, flexWrap: 'wrap' },
  approve: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 18px',
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
  ask: {
    display: 'flex', alignItems: 'center', gap: 6, background: '#1b1b1d', color: '#f0f0f0', border: '1px solid #2f2f33',
    borderRadius: 8, padding: '10px 18px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
  },
  reject: {
    display: 'flex', alignItems: 'center', gap: 6, background: '#1b1b1d', color: '#ff6b6b', border: '1px solid rgba(255,68,68,0.4)',
    borderRadius: 8, padding: '10px 18px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
  },
};
