// Dashboard do Admin — mesmo estilo do dashboard da Web: painéis cinza compactos,
// que podem ser arrastados para trocar de lugar, com filtro de período.
// Todos os números vêm do Firestore (nada estimado).
import React, { useEffect, useMemo, useState } from 'react';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import Panel from '../components/Panel';
import { usePanelLayout } from '../lib/panelLayout';
import {
  Users, UserCheck, DollarSign, Wallet, Radio, Image as ImageIcon, Heart, MessageCircle, Building2,
  Trophy, ShieldAlert, Clock, Lock, Video as VideoIcon, Repeat,
} from 'lucide-react';

const GREEN = '#52fa35';
const GOLD = '#FFD700';
const DAY = 24 * 60 * 60 * 1000;

// Lugares do mosaico (veja o CSS no fim do arquivo)
const SLOTS = ['chart', 'k1', 'k2', 'k3', 'k4', 'tl', 'tp', 'b1', 'b2', 'b3', 'b4', 'b5', 'b6', 'b7', 'b8'];

const PERIODS = [
  { id: '1', label: 'Hoje', days: 1 },
  { id: '7', label: '7 dias', days: 7 },
  { id: '30', label: '30 dias', days: 30 },
  { id: '90', label: '90 dias', days: 90 },
  { id: '365', label: '1 ano', days: 365 },
  { id: 'all', label: 'Tudo', days: null },
];

const toMs = (v) => {
  if (!v) return null;
  if (typeof v?.toMillis === 'function') return v.toMillis();
  if (typeof v?.seconds === 'number') return v.seconds * 1000;
  const t = typeof v === 'number' ? v : new Date(v).getTime();
  return Number.isNaN(t) ? null : t;
};
const num = (n) => (Number(n) || 0).toLocaleString('pt-BR');
const brl = (n) => `R$ ${(Number(n) || 0).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
const dec = (n) => (Number(n) || 0).toFixed(1).replace('.', ',');
const dayLabel = (ms) => new Date(ms).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
const startOfDay = (ms) => { const d = new Date(ms); d.setHours(0, 0, 0, 0); return d.getTime(); };

// Lê uma coleção; se não houver permissão/coleção, devolve lista vazia (o resto do painel segue)
async function readAll(name) {
  try {
    const snap = await getDocs(collection(db, name));
    const out = [];
    snap.forEach((d) => out.push({ id: d.id, ...d.data() }));
    return out;
  } catch (e) {
    console.warn('[Dashboard] sem acesso a', name, e?.code || e?.message);
    return [];
  }
}

const ACTIVITY_LABEL = {
  company_created: 'criou a empresa', profile_updated: 'editou o perfil', logo_updated: 'trocou o logo',
  banner_updated: 'trocou o banner', member_invited: 'convidou um membro', invite_accepted: 'entrou na equipe',
  member_removed: 'removeu um membro', member_left: 'saiu da equipe', role_changed: 'mudou um cargo',
};

export default function Dashboard() {
  const { order, dragProps, reset, changed } = usePanelLayout('uou_admin_dash_layout_v1', SLOTS);
  const [period, setPeriod] = useState('30');
  const [chartTab, setChartTab] = useState('users');
  const [data, setData] = useState({ loading: true });

  useEffect(() => {
    let off = false;
    (async () => {
      const [users, events, lives, trans, posts, companies, requests, activity, reports] = await Promise.all([
        readAll('users'), readAll('analytics_events'), readAll('lives'), readAll('transactions'), readAll('posts'),
        readAll('companies'), readAll('company_requests'), readAll('company_activity'), readAll('reports'),
      ]);
      let settings = {};
      try { const s = await getDoc(doc(db, 'settings', 'platform')); if (s.exists()) settings = s.data(); } catch { /* ok */ }
      if (!off) setData({ loading: false, users, events, lives, trans, posts, companies, requests, activity, reports, settings });
    })();
    return () => { off = true; };
  }, []);

  const m = useMemo(() => {
    if (data.loading) return null;
    const { users, events, lives, trans, posts, companies, requests, activity, reports, settings } = data;
    const now = Date.now();
    const days = PERIODS.find((x) => x.id === period).days;
    const since = days ? startOfDay(now - (days - 1) * DAY) : null;
    const inP = (ms) => (since === null ? ms !== null : ms !== null && ms >= since);

    const userMap = new Map(users.map((u) => [u.id, u]));
    const sessions = events.filter((e) => e.type === 'session_start' && e.userId).map((e) => ({ uid: e.userId, t: toMs(e.createdAt) })).filter((e) => e.t !== null);
    const activeSince = (ms) => new Set(sessions.filter((e) => e.t >= ms).map((e) => e.uid)).size;
    const activeToday = activeSince(startOfDay(now));
    const active7 = activeSince(now - 7 * DAY);
    const active30 = activeSince(now - 30 * DAY);
    const activeP = new Set(sessions.filter((e) => inP(e.t)).map((e) => e.uid)).size;

    // Usuários
    const created = users.map((u) => toMs(u.createdAt));
    const newUsers = created.filter(inP).length;
    const statusOf = (u) => u.status || (u.banned ? 'banned' : 'active');
    const suspended = users.filter((u) => statusOf(u) === 'suspended').length;
    const banned = users.filter((u) => statusOf(u) === 'banned').length;
    const verified = users.filter((u) => u.verification?.status === 'approved').length;
    const priv = users.filter((u) => u.isPrivate).length;
    const older7 = users.filter((u) => { const c = toMs(u.createdAt); return c !== null && c < now - 7 * DAY; });
    const activeSet7 = new Set(sessions.filter((e) => e.t >= now - 7 * DAY).map((e) => e.uid));
    const retention = older7.length ? (older7.filter((u) => activeSet7.has(u.id)).length / older7.length) * 100 : 0;
    const walletTotal = users.reduce((a, u) => a + (Number(u.wallet) || 0), 0);

    // Dinheiro
    const rev = trans.filter((t) => t.type === 'live_revenue').map((t) => ({ ...t, ms: toMs(t.date) }));
    const revP = rev.filter((t) => inP(t.ms));
    const uouRevenue = revP.reduce((a, t) => a + (Number(t.uouFee) || 0), 0);
    const grossRevenue = revP.reduce((a, t) => a + (Number(t.amountBruto) || 0), 0);
    const entries = trans.filter((t) => t.type === 'live_entry' && inP(toMs(t.date)));
    const ticket = entries.length ? entries.reduce((a, t) => a + (Number(t.amount) || 0), 0) / entries.length : 0;
    const wd = trans.filter((t) => t.type === 'withdrawal');
    const wdPending = wd.filter((t) => t.status === 'pending');
    const wdPendingSum = wdPending.reduce((a, t) => a + (Number(t.amount) || 0), 0);
    const wdDoneSum = wd.filter((t) => t.status === 'completed' && inP(toMs(t.date))).reduce((a, t) => a + (Number(t.amount) || 0), 0);

    // Lives
    const livesP = lives.filter((l) => inP(toMs(l.createdAt)));
    const liveNow = lives.filter((l) => l.status === 'live').length;
    const stuck = lives.filter((l) => l.status === 'live' && toMs(l.createdAt) !== null && now - toMs(l.createdAt) > 12 * 3600e3).length;
    const durs = lives.map((l) => { const a = toMs(l.startedAt); const b = toMs(l.endedAt); return a && b && b > a ? (b - a) / 60000 : null; }).filter((x) => x !== null);
    const avgDur = durs.length ? durs.reduce((a, b) => a + b, 0) / durs.length : 0;
    const viewersTot = livesP.reduce((a, l) => a + (Number(l.viewers) || 0), 0);
    const liveById = new Map(lives.map((l) => [l.id, l]));

    // Rankings
    const byLive = new Map();
    revP.forEach((t) => {
      const key = t.liveId || t.liveTitle || t.id;
      const cur = byLive.get(key) || { id: key, v: 0, title: t.liveTitle, n: 0 };
      cur.v += Number(t.uouFee) || 0; cur.n += 1; byLive.set(key, cur);
    });
    let topLives = [...byLive.values()].sort((a, b) => b.v - a.v).slice(0, 10).map((x) => {
      const l = liveById.get(x.id);
      return { id: x.id, img: l?.thumbnail || l?.teaserUrl, title: l?.title || x.title || 'Live', sub: `${num(x.n)} ${x.n === 1 ? 'venda' : 'vendas'} · ${l?.userName || ''}`, value: brl(x.v), raw: x.v, icon: DollarSign };
    });
    let livesRankIsRevenue = true;
    if (!topLives.length) {
      livesRankIsRevenue = false;
      topLives = [...livesP].sort((a, b) => (Number(b.viewers) || 0) - (Number(a.viewers) || 0)).slice(0, 10)
        .map((l) => ({ id: l.id, img: l.thumbnail || l.teaserUrl, title: l.title || 'Live', sub: `${l.userName || ''} · ${l.status === 'live' ? 'ao vivo' : l.status === 'scheduled' ? 'agendada' : 'encerrada'}`, value: num(l.viewers), raw: Number(l.viewers) || 0, icon: Users }));
    }
    const byCreator = new Map();
    revP.forEach((t) => {
      const key = t.creatorId || t.userId || t.userName;
      if (!key) return;
      const cur = byCreator.get(key) || { id: key, v: 0, n: 0, name: t.userName };
      cur.v += Number(t.amountBruto) || 0; cur.n += 1; byCreator.set(key, cur);
    });
    let topCreators = [...byCreator.values()].sort((a, b) => b.v - a.v).slice(0, 10).map((x) => {
      const u = userMap.get(x.id);
      return { id: x.id, img: u?.photoURL, title: u?.name || x.name || 'Criador', sub: `${num(x.n)} ${x.n === 1 ? 'venda' : 'vendas'}`, value: brl(x.v), raw: x.v, icon: DollarSign };
    });
    let creatorsRankIsRevenue = true;
    if (!topCreators.length) {
      creatorsRankIsRevenue = false;
      topCreators = [...users].sort((a, b) => (Number(b.followers) || 0) - (Number(a.followers) || 0)).slice(0, 10)
        .map((u) => ({ id: u.id, img: u.photoURL, title: u.name || 'Usuário', sub: u.email || '', value: num(u.followers), raw: Number(u.followers) || 0, icon: Users }));
    }

    // Conteúdo
    const postsP = posts.filter((p) => inP(toMs(p.createdAt)));
    const likes = postsP.reduce((a, p) => a + (Number(p.likes) || 0), 0);
    const comments = postsP.reduce((a, p) => a + (Number(p.commentsCount) || 0), 0);
    const byType = { photo: 0, video: 0, carousel: 0 };
    postsP.forEach((p) => { if (byType[p.type] !== undefined) byType[p.type] += 1; });

    // Empresas
    const coName = new Map(companies.map((c) => [c.id, c.tradeName || c.legalName]));
    const coActive = companies.filter((c) => c.status !== 'suspended').length;
    const coSusp = companies.length - coActive;
    const reqPending = requests.filter((r) => r.status === 'pending' || r.status === 'needs_docs').length;
    const recentAct = [...activity].map((a) => ({ ...a, ms: toMs(a.at) })).filter((a) => a.ms !== null).sort((a, b) => b.ms - a.ms).slice(0, 8);

    // Moderação / saúde
    const reportsOpen = reports.filter((r) => r.status !== 'resolved' && r.status !== 'dismissed').length;

    // ── Séries do gráfico (um ponto por dia) ──
    const allDates = {
      users: created.filter((x) => x !== null),
      active: sessions.map((e) => e.t),
      revenue: rev.map((t) => t.ms).filter((x) => x !== null),
      lives: lives.map((l) => toMs(l.createdAt)).filter((x) => x !== null),
    };
    const first = Object.values(allDates).reduce((acc, arr) => arr.reduce((mn, x) => (x < mn ? x : mn), acc), now);
    const fromMs = startOfDay(since !== null ? since : Math.max(first, now - 365 * DAY));
    const toDay = startOfDay(now);
    const build = (dates, weights, cumulative, unique) => {
      const pts = [];
      let before = 0;
      if (cumulative) before = dates.filter((d) => d < fromMs).length;
      for (let t = fromMs; t <= toDay; t += DAY) {
        let v = 0;
        if (cumulative) { before += dates.filter((d) => d >= t && d < t + DAY).length; v = before; }
        else if (unique) v = new Set(sessions.filter((e) => e.t >= t && e.t < t + DAY).map((e) => e.uid)).size;
        else v = dates.reduce((a, d, i) => (d >= t && d < t + DAY ? a + (weights ? weights[i] : 1) : a), 0);
        pts.push({ t, v });
      }
      return pts;
    };
    const revDates = rev.map((t) => t.ms ?? -1); const revW = rev.map((t) => Number(t.uouFee) || 0);
    const series = {
      users: { pts: build(allDates.users, null, true), unit: 'usuários', fmt: num },
      active: { pts: build(null, null, false, true), unit: 'ativos', fmt: num },
      revenue: { pts: build(revDates, revW, false), unit: 'de comissão', fmt: brl },
      lives: { pts: build(allDates.lives, null, false), unit: 'lives criadas', fmt: num },
    };

    return {
      totalUsers: users.length, newUsers, activeToday, active7, active30, activeP, suspended, banned, verified, priv, retention, walletTotal,
      uouRevenue, grossRevenue, ticket, wdPending: wdPending.length, wdPendingSum, wdDoneSum,
      livesP: livesP.length, liveNow, stuck, avgDur, viewersTot, scheduled: lives.filter((l) => l.status === 'scheduled').length,
      ended: lives.filter((l) => l.status === 'ended').length, premium: lives.filter((l) => l.isPremium).length, totalLives: lives.length,
      topLives, livesRankIsRevenue, topCreators, creatorsRankIsRevenue,
      postsP: postsP.length, likes, comments, byType, exclusive: postsP.filter((p) => p.exclusive).length,
      coActive, coSusp, reqPending, recentAct, coName,
      reportsOpen, appVersion: settings.appVersion || '—', series,
    };
  }, [data, period]);

  const none = '—';
  const v = (f) => (m ? f(m) : none);
  const sr = m?.series?.[chartTab];

  const blocks = m ? {
    chart: {
      tabs: [
        { id: 'users', label: 'Usuários' }, { id: 'active', label: 'Ativos por dia' },
        { id: 'revenue', label: 'Receita' }, { id: 'lives', label: 'Lives' },
      ],
      body: (
        <>
          <div style={s.bigRow}>
            <span style={s.bigNum}>{chartTab === 'users' ? num(m.totalUsers) : chartTab === 'active' ? num(m.activeP) : chartTab === 'revenue' ? brl(m.uouRevenue) : num(m.livesP)}</span>
            <span style={s.delta}>
              {chartTab === 'users' ? `+${num(m.newUsers)} no período` : chartTab === 'active' ? 'usuários únicos no período' : chartTab === 'revenue' ? `de ${brl(m.grossRevenue)} vendidos` : 'no período'}
            </span>
          </div>
          <LineChart points={sr.pts} fmt={sr.fmt} unit={sr.unit} />
        </>
      ),
    },
    k1: { title: 'Usuários', body: <Kpi icon={Users} value={num(m.totalUsers)} note={`+${num(m.newUsers)} no período`} /> },
    k2: { title: 'Ativos hoje', body: <Kpi icon={UserCheck} value={num(m.activeToday)} note={`${num(m.active7)} em 7 dias`} /> },
    k3: { title: 'Receita da UOU', body: <Kpi icon={DollarSign} value={brl(m.uouRevenue)} note={`${brl(m.grossRevenue)} vendidos`} /> },
    k4: { title: 'Saques pendentes', body: <Kpi icon={Wallet} value={brl(m.wdPendingSum)} note={`${num(m.wdPending)} ${m.wdPending === 1 ? 'pedido' : 'pedidos'}`} /> },
    tl: { title: m.livesRankIsRevenue ? 'Lives mais lucrativas' : 'Lives com mais espectadores', body: <Ranking empty="Sem lives no período." items={m.topLives} /> },
    tp: { title: m.creatorsRankIsRevenue ? 'Criadores que mais faturam' : 'Criadores com mais seguidores', body: <Ranking empty="Sem criadores no período." items={m.topCreators} /> },
    b1: { title: 'Lives', body: (<>
      <Stat label="Ao vivo agora" value={num(m.liveNow)} icon={Radio} />
      <Stat label="Agendadas" value={num(m.scheduled)} icon={Radio} />
      <Stat label="Encerradas" value={num(m.ended)} icon={Radio} />
      <Stat label="Premiadas" value={num(m.premium)} icon={Trophy} gold />
      <Stat label="Criadas no período" value={num(m.livesP)} icon={Radio} />
      <Stat label="Duração média" value={m.avgDur ? `${Math.round(m.avgDur)} min` : none} icon={Clock} />
    </>) },
    b2: { title: 'Dinheiro', body: (<>
      <Stat label="Receita da UOU" value={brl(m.uouRevenue)} icon={DollarSign} />
      <Stat label="Vendido (bruto)" value={brl(m.grossRevenue)} icon={DollarSign} />
      <Stat label="Ticket médio de entrada" value={m.ticket ? brl(m.ticket) : none} icon={DollarSign} />
      <Stat label="Saques pagos" value={brl(m.wdDoneSum)} icon={Wallet} />
      <Stat label="Saldo nas carteiras" value={brl(m.walletTotal)} icon={Wallet} gold />
    </>) },
    b3: { title: 'Empresas', body: (<>
      <Stat label="Pedidos pendentes" value={num(m.reqPending)} icon={Building2} gold={m.reqPending > 0} />
      <Stat label="Empresas ativas" value={num(m.coActive)} icon={Building2} />
      <Stat label="Suspensas" value={num(m.coSusp)} icon={Building2} />
    </>) },
    b4: { title: 'Conteúdo', body: (<>
      <Bars rows={[
        { label: 'Fotos', value: m.byType.photo, icon: ImageIcon }, { label: 'Vídeos', value: m.byType.video, icon: VideoIcon },
        { label: 'Carrosséis', value: m.byType.carousel, icon: ImageIcon }, { label: 'Exclusivos', value: m.exclusive, icon: Lock },
      ]} />
      <div style={{ marginTop: 10 }}>
        <Stat label="Posts no período" value={num(m.postsP)} icon={ImageIcon} />
        <Stat label="Curtidas" value={num(m.likes)} icon={Heart} />
        <Stat label="Comentários" value={num(m.comments)} icon={MessageCircle} />
      </div>
    </>) },
    b5: { title: 'Retenção', body: (<>
      <Stat label="Ativos hoje" value={num(m.activeToday)} icon={UserCheck} />
      <Stat label="Ativos em 7 dias" value={num(m.active7)} icon={UserCheck} />
      <Stat label="Ativos em 30 dias" value={num(m.active30)} icon={UserCheck} />
      <Stat label="Voltaram na última semana" value={`${dec(m.retention)}%`} icon={Repeat} />
      <p style={s.note}>Dos usuários com mais de 7 dias de conta, quantos abriram o app nos últimos 7 dias.</p>
    </>) },
    b6: { title: 'Contas', body: (<>
      <Stat label="Total" value={num(m.totalUsers)} icon={Users} />
      <Stat label="Verificadas" value={num(m.verified)} icon={UserCheck} />
      <Stat label="Privadas" value={num(m.priv)} icon={Lock} />
      <Stat label="Suspensas" value={num(m.suspended)} icon={ShieldAlert} gold={m.suspended > 0} />
      <Stat label="Banidas" value={num(m.banned)} icon={ShieldAlert} gold={m.banned > 0} />
    </>) },
    b7: { title: 'Atividade das empresas', body: m.recentAct.length ? (
      <ul style={s.actList}>
        {m.recentAct.map((a) => (
          <li key={a.id} style={s.actItem}>
            <span style={s.actTxt}><b>{m.coName.get(a.companyId) || 'Empresa'}</b> {ACTIVITY_LABEL[a.type] || a.type}</span>
            <span style={s.actTime}>{dayLabel(a.ms)}</span>
          </li>
        ))}
      </ul>
    ) : <p style={s.empty}>Nenhuma atividade registrada ainda.</p> },
    b8: { title: 'Saúde e moderação', body: (<>
      <Stat label="Denúncias em aberto" value={num(m.reportsOpen)} icon={ShieldAlert} gold={m.reportsOpen > 0} />
      <Stat label="Lives ao vivo há mais de 12h" value={num(m.stuck)} icon={Radio} gold={m.stuck > 0} />
      <Stat label="Versão do app" value={m.appVersion} icon={VideoIcon} />
      <p style={s.note}>Denúncias aparecem aqui quando o app passar a gravar a coleção "reports".</p>
    </>) },
  } : null;

  return (
    <div>
      <style>{CSS}</style>
      <div style={s.header}>
        <h1 style={s.title}>Dashboard</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {changed && <button type="button" style={s.resetBtn} onClick={reset}>Restaurar layout</button>}
          <div style={s.periods}>
            {PERIODS.map((p) => (
              <button key={p.id} type="button" style={s.periodBtn(period === p.id)} onClick={() => setPeriod(p.id)}>{p.label}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="uou-grid" style={{ opacity: data.loading ? 0.5 : 1 }}>
        {SLOTS.map((slot, i) => {
          const id = order[i];
          const b = blocks?.[id];
          const title = id === 'chart' ? undefined : (b?.title || '');
          return (
            <Panel
              key={id}
              area={slot}
              title={title || (data.loading ? 'Carregando…' : '')}
              tabs={b?.tabs}
              activeTab={chartTab}
              onTab={setChartTab}
              drag={dragProps(id)}
            >
              {b ? b.body : null}
            </Panel>
          );
        })}
      </div>
    </div>
  );
}

function Kpi({ icon: Icon, value, note }) {
  return (
    <>
      <div style={s.kpiTop}><Icon size={18} color={GREEN} /><span style={s.kpiValue}>{value}</span></div>
      <p style={s.kpiNote}>{note}</p>
    </>
  );
}

function Stat({ label, value, icon: Icon, gold }) {
  return (
    <div style={s.statRow}>
      <Icon size={14} color={gold ? GOLD : GREEN} />
      <span style={s.statLabel}>{label}</span>
      <b style={{ ...s.statValue, color: gold ? GOLD : '#f0f0f0' }}>{value}</b>
    </div>
  );
}

function Bars({ rows }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
      {rows.map((r) => (
        <div key={r.label}>
          <div style={s.barTop}><span style={s.statLabel}>{r.label}</span><b style={s.statValue}>{num(r.value)}</b></div>
          <div style={s.barTrack}><div style={{ ...s.barFill, width: `${(r.value / max) * 100}%` }} /></div>
        </div>
      ))}
    </div>
  );
}

function Ranking({ items, empty }) {
  if (!items.length) return <p style={s.empty}>{empty}</p>;
  const max = Math.max(1, ...items.map((i) => i.raw));
  return (
    <ol style={s.rankList}>
      {items.map((it, i) => (
        <li key={it.id} style={s.rankItem}>
          <span style={s.rankPos}>{i + 1}</span>
          <div style={{ ...s.rankImg, backgroundImage: it.img ? `url("${it.img}")` : 'none' }} />
          <div style={s.rankInfo}>
            <p style={s.rankTitle}>{it.title}</p>
            <p style={s.rankSub}>{it.sub}</p>
            <div style={s.rankBar}><div style={{ ...s.rankBarFill, width: `${(it.raw / max) * 100}%` }} /></div>
          </div>
          <span style={s.rankValue}><it.icon size={13} color={GREEN} /> {it.value}</span>
        </li>
      ))}
    </ol>
  );
}

function LineChart({ points, fmt, unit }) {
  const [hover, setHover] = useState(null);
  const W = 640; const H = 220; const PX = 34; const PY = 18;
  const vals = points.map((p) => p.v);
  const min = Math.min(...vals); const max = Math.max(...vals);
  const span = Math.max(1, max - min);
  const x = (i) => PX + (points.length <= 1 ? 0 : (i / (points.length - 1)) * (W - PX - 10));
  const y = (val) => H - PY - ((val - min) / span) * (H - PY * 2);
  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ');
  const area = `${line} L${x(points.length - 1).toFixed(1)},${H - PY} L${x(0).toFixed(1)},${H - PY} Z`;
  const onMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    const i = Math.round(((px - PX) / (W - PX - 10)) * (points.length - 1));
    setHover(Math.max(0, Math.min(points.length - 1, i)));
  };
  const h = hover !== null ? points[hover] : null;
  const labels = points.length > 2 ? [0, Math.floor((points.length - 1) / 2), points.length - 1] : points.map((_, i) => i);
  const axis = (n) => (fmt === num ? num(Math.round(n)) : `${Math.round(n)}`);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }} onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
      <defs>
        <linearGradient id="admDashFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={GREEN} stopOpacity="0.28" />
          <stop offset="1" stopColor={GREEN} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 0.5, 1].map((f) => (
        <g key={f}>
          <line x1={PX} x2={W - 10} y1={H - PY - f * (H - PY * 2)} y2={H - PY - f * (H - PY * 2)} stroke="#2c2c2f" strokeDasharray="3 4" />
          <text x={PX - 6} y={H - PY - f * (H - PY * 2) + 4} fill="#777" fontSize="11" textAnchor="end">{axis(min + f * span)}</text>
        </g>
      ))}
      <path d={area} fill="url(#admDashFill)" />
      <path d={line} fill="none" stroke={GREEN} strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />
      {labels.map((i) => (
        <text key={i} x={x(i)} y={H - 2} fill="#777" fontSize="11" textAnchor={i === 0 ? 'start' : i === points.length - 1 ? 'end' : 'middle'}>{dayLabel(points[i].t)}</text>
      ))}
      {h && (
        <g>
          <line x1={x(hover)} x2={x(hover)} y1={PY} y2={H - PY} stroke="#555" />
          <circle cx={x(hover)} cy={y(h.v)} r="4.5" fill={GREEN} stroke="#1b1b1d" strokeWidth="2" />
          <g transform={`translate(${Math.min(Math.max(x(hover) - 60, PX), W - 130)}, ${Math.max(y(h.v) - 44, 0)})`}>
            <rect width="120" height="34" rx="6" fill="#0b0b0c" stroke="#333" />
            <text x="60" y="14" fill="#aaa" fontSize="10.5" textAnchor="middle">{dayLabel(h.t)}</text>
            <text x="60" y="28" fill="#fff" fontSize="12" fontWeight="700" textAnchor="middle">{fmt(h.v)} {unit}</text>
          </g>
        </g>
      )}
    </svg>
  );
}

// Encaixe dos painéis (12 colunas, sem folga grande entre eles)
const CSS = `
.uou-grid{display:grid;gap:4px;grid-template-columns:repeat(12,minmax(0,1fr));grid-auto-rows:minmax(70px,auto);
  grid-template-areas:
   "chart chart chart chart chart chart chart k1 k1 k1 k2 k2"
   "chart chart chart chart chart chart chart k1 k1 k1 k2 k2"
   "chart chart chart chart chart chart chart k3 k3 k3 k4 k4"
   "chart chart chart chart chart chart chart k3 k3 k3 k4 k4"
   "tl tl tl tl tl tl tp tp tp tp tp tp"
   "tl tl tl tl tl tl tp tp tp tp tp tp"
   "tl tl tl tl tl tl tp tp tp tp tp tp"
   "tl tl tl tl tl tl tp tp tp tp tp tp"
   "b1 b1 b1 b2 b2 b2 b3 b3 b3 b4 b4 b4"
   "b1 b1 b1 b2 b2 b2 b3 b3 b3 b4 b4 b4"
   "b1 b1 b1 b2 b2 b2 b3 b3 b3 b4 b4 b4"
   "b5 b5 b5 b6 b6 b6 b7 b7 b7 b8 b8 b8"
   "b5 b5 b5 b6 b6 b6 b7 b7 b7 b8 b8 b8"
   "b5 b5 b5 b6 b6 b6 b7 b7 b7 b8 b8 b8";}
@media (max-width:1100px){
 .uou-grid{grid-template-columns:repeat(2,minmax(0,1fr));grid-template-areas:"chart chart" "k1 k2" "k3 k4" "tl tl" "tp tp" "b1 b2" "b3 b4" "b5 b6" "b7 b8"}
}
@media (max-width:620px){
 .uou-grid{grid-template-columns:minmax(0,1fr);grid-template-areas:"chart" "k1" "k2" "k3" "k4" "tl" "tp" "b1" "b2" "b3" "b4" "b5" "b6" "b7" "b8"}
}
`;

const s = {
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', margin: '0 0 14px 0' },
  title: { color: '#f0f0f0', fontSize: 22, fontWeight: 700, margin: 0 },
  periods: { display: 'flex', gap: 4, padding: 3, backgroundColor: '#1b1b1d', borderRadius: 8 },
  periodBtn: (a) => ({
    border: a ? `1px solid ${GREEN}` : '1px solid transparent', borderRadius: 6, padding: '5px 12px', fontSize: 12, fontWeight: 700,
    cursor: 'pointer', fontFamily: 'inherit', backgroundColor: a ? 'rgba(82, 250, 53, 0.1)' : 'transparent', color: a ? GREEN : '#999',
  }),
  resetBtn: {
    border: '1px solid #2a2a2d', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
    fontFamily: 'inherit', backgroundColor: 'transparent', color: '#aaa',
  },
  bigRow: { display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 8, flexWrap: 'wrap' },
  bigNum: { color: '#fff', fontSize: 30, fontWeight: 800 },
  delta: { color: GREEN, fontSize: 13, fontWeight: 600 },
  empty: { color: '#777', fontSize: 13, lineHeight: 1.6, margin: 0 },
  note: { color: '#6f6f75', fontSize: 11.5, lineHeight: 1.5, margin: '10px 0 0 0' },
  kpiTop: { display: 'flex', alignItems: 'center', gap: 10 },
  kpiValue: { color: '#fff', fontSize: 26, fontWeight: 800 },
  kpiNote: { color: '#888', fontSize: 12, margin: '6px 0 0 0' },
  statRow: { display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0', borderBottom: '1px solid #262628' },
  statLabel: { color: '#9a9a9f', fontSize: 12.5, flex: 1 },
  statValue: { fontSize: 13.5 },
  barTop: { display: 'flex', justifyContent: 'space-between', marginBottom: 5, color: '#f0f0f0' },
  barTrack: { height: 6, borderRadius: 3, backgroundColor: '#2a2a2d' },
  barFill: { height: '100%', borderRadius: 3, backgroundColor: GREEN },
  rankList: { listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 4 },
  rankItem: { display: 'flex', alignItems: 'center', gap: 10, padding: '6px 8px', borderRadius: 6, backgroundColor: '#222224' },
  rankPos: { width: 18, textAlign: 'center', color: '#777', fontSize: 12, fontWeight: 700, flexShrink: 0 },
  rankImg: { width: 38, height: 38, borderRadius: 6, backgroundColor: '#2f2f33', backgroundSize: 'cover', backgroundPosition: 'center', flexShrink: 0 },
  rankInfo: { flex: 1, minWidth: 0 },
  rankTitle: { color: '#f0f0f0', fontSize: 13, fontWeight: 600, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  rankSub: { color: '#777', fontSize: 11, margin: '1px 0 4px 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  rankBar: { height: 3, borderRadius: 2, backgroundColor: '#2f2f33' },
  rankBarFill: { height: '100%', borderRadius: 2, backgroundColor: GREEN },
  rankValue: { display: 'flex', alignItems: 'center', gap: 4, color: '#f0f0f0', fontSize: 13, fontWeight: 700, flexShrink: 0 },
  actList: { listStyle: 'none', margin: 0, padding: 0 },
  actItem: { display: 'flex', justifyContent: 'space-between', gap: 8, padding: '7px 0', borderBottom: '1px solid #262628', fontSize: 12.5, color: '#cfcfd6' },
  actTxt: { minWidth: 0 },
  actTime: { color: '#777', fontSize: 11.5, flexShrink: 0 },
};
