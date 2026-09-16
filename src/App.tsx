import { useEffect, useState, useMemo } from 'react';
import { onAuthStateChanged, signOut, sendPasswordResetEmail, User } from 'firebase/auth';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { auth, db } from './firebase';
import { DynamicQRCode } from './types';
import { RedirectView } from './components/RedirectView';
import { LoginView } from './components/LoginView';
import { QRCodeCard } from './components/QRCodeCard';
import { CreateQRModal } from './components/CreateQRModal';
import { EditDestinationModal } from './components/EditDestinationModal';
import { DeleteConfirmModal } from './components/DeleteConfirmModal';
import { GoogleReviewGenerator } from './components/GoogleReviewGenerator';
import {
  QrCode,
  Plus,
  Search,
  LogOut,
  X,
  ChevronDown,
  User as UserIcon,
  LayoutDashboard,
  ListFilter,
  Star,
  Shield,
  Smartphone,
  ExternalLink,
  Copy,
  Check,
  Sparkles,
  ArrowRight,
  Mail,
  Lock,
} from 'lucide-react';

/**
 * Extracts the dynamic slug if the user opened /q/:slug or ?q=:slug
 */
function getSlugFromCurrentUrl(): string | null {
  const pathname = window.location.pathname;
  const match = pathname.match(/^\/q\/([^/?#]+)/i);
  if (match && match[1]) {
    return match[1].trim();
  }
  const params = new URLSearchParams(window.location.search);
  const qParam = params.get('q');
  if (qParam) {
    return qParam.trim();
  }
  const hashMatch = window.location.hash.match(/^#\/?q\/([^/?#]+)/i);
  if (hashMatch && hashMatch[1]) {
    return hashMatch[1].trim();
  }
  return null;
}

const PAGE_SIZE = 20;

type NavigationTab = 'dashboard' | 'qrcodes' | 'google' | 'account';

export default function App() {
  const [activeSlug, setActiveSlug] = useState<string | null>(() => getSlugFromCurrentUrl());
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Active Menu Tab
  const [activeTab, setActiveTab] = useState<NavigationTab>('dashboard');

  // User's Dynamic QR Codes Data
  const [qrCodes, setQrCodes] = useState<DynamicQRCode[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingQR, setEditingQR] = useState<DynamicQRCode | null>(null);
  const [deletingQR, setDeletingQR] = useState<DynamicQRCode | null>(null);

  // Account reset password status
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [resetEmailLoading, setResetEmailLoading] = useState(false);

  // Listen to browser navigation
  useEffect(() => {
    const handleLocationChange = () => {
      setActiveSlug(getSlugFromCurrentUrl());
    };
    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('hashchange', handleLocationChange);
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('hashchange', handleLocationChange);
    };
  }, []);

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Firestore listener: isolated to the authenticated user
  useEffect(() => {
    if (!user) {
      setQrCodes([]);
      setDataLoading(false);
      return;
    }

    setDataLoading(true);

    const userQuery = query(
      collection(db, 'dynamicQRCodes'),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(
      userQuery,
      (snapshot) => {
        const list: DynamicQRCode[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          list.push({
            id: data.id || docSnap.id,
            userId: data.userId || user.uid,
            name: data.name || 'Sem nome',
            slug: data.slug || docSnap.id,
            destinationUrl: data.destinationUrl || '',
            active: data.active !== false,
            createdAt: data.createdAt || 0,
            updatedAt: data.updatedAt || 0,
            scansCount: data.scansCount || 0,
            lastScanAt: data.lastScanAt || null,
          });
        });

        // Client-side sort descending by updatedAt / createdAt
        list.sort((a, b) => {
          const timeA =
            typeof a.updatedAt?.toMillis === 'function'
              ? a.updatedAt.toMillis()
              : Number(a.updatedAt || a.createdAt || 0);
          const timeB =
            typeof b.updatedAt?.toMillis === 'function'
              ? b.updatedAt.toMillis()
              : Number(b.updatedAt || b.createdAt || 0);
          return timeB - timeA;
        });

        setQrCodes(list);
        setDataLoading(false);
      },
      (error) => {
        console.error('Erro ao escutar dynamicQRCodes do usuário:', error);
        setDataLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  // Reset pagination when searching or changing filter
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [searchTerm, filterStatus]);

  // Summary counts
  const totalCount = qrCodes.length;
  const activeCount = useMemo(
    () => qrCodes.filter((q) => q.active !== false).length,
    [qrCodes]
  );
  const inactiveCount = totalCount - activeCount;
  const totalScans = useMemo(
    () => qrCodes.reduce((acc, q) => acc + (q.scansCount || 0), 0),
    [qrCodes]
  );

  // Filtered QR codes by status and search term (by name or code/slug)
  const filteredQRCodes = useMemo(() => {
    let list = qrCodes;

    // Status filter
    if (filterStatus === 'active') {
      list = list.filter((item) => item.active !== false);
    } else if (filterStatus === 'inactive') {
      list = list.filter((item) => item.active === false);
    }

    // Search filter (by name or code)
    const term = searchTerm.trim().toLowerCase();
    if (term) {
      list = list.filter(
        (item) =>
          item.name.toLowerCase().includes(term) ||
          item.slug.toLowerCase().includes(term) ||
          item.destinationUrl.toLowerCase().includes(term)
      );
    }

    return list;
  }, [qrCodes, filterStatus, searchTerm]);

  // Paginated slice
  const paginatedQRCodes = useMemo(() => {
    return filteredQRCodes.slice(0, visibleCount);
  }, [filteredQRCodes, visibleCount]);

  const hasMore = visibleCount < filteredQRCodes.length;

  const handleLoadMore = () => {
    setVisibleCount((prev) => prev + PAGE_SIZE);
  };

  // Password reset from account view
  const handleSendPasswordReset = async () => {
    if (!user?.email) return;
    try {
      setResetEmailLoading(true);
      await sendPasswordResetEmail(auth, user.email);
      setResetEmailSent(true);
      setTimeout(() => setResetEmailSent(false), 5000);
    } catch (err) {
      console.error('Erro ao enviar e-mail de recuperação:', err);
    } finally {
      setResetEmailLoading(false);
    }
  };

  // 1. PUBLIC REDIRECT ROUTE (/q/:slug) - No login required
  if (activeSlug) {
    return <RedirectView slug={activeSlug} />;
  }

  // 2. CHECKING AUTH STATUS
  if (authLoading) {
    return (
      <div
        id="app-loading-screen"
        className="min-h-screen bg-[#070a12] flex flex-col items-center justify-center text-slate-400 gap-3 font-mono"
      >
        <div className="w-10 h-10 border-3 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
        <span className="text-xs uppercase tracking-widest text-blue-400 font-bold">
          JZN CODE...
        </span>
      </div>
    );
  }

  // 3. IF NOT AUTHENTICATED, SHOW LOGIN/REGISTER VIEW
  if (!user) {
    return <LoginView />;
  }

  const userName = user.displayName || user.email?.split('@')[0] || 'Usuário';

  // 4. MAIN APP SHELL
  return (
    <div
      id="dashboard-root"
      className="min-h-screen bg-[#070a12] text-slate-100 flex flex-col selection:bg-blue-600 selection:text-white relative font-sans max-w-full overflow-x-hidden"
    >
      {/* CABEÇALHO COMPACTO & PROFISSIONAL */}
      <header
        id="main-header"
        className="sticky top-0 z-40 bg-[#0d121f]/95 backdrop-blur-md border-b border-slate-800/90 px-3 sm:px-6 py-2.5 max-w-full"
      >
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
          {/* Logo & Identidade */}
          <div
            onClick={() => setActiveTab('dashboard')}
            className="flex items-center gap-2 cursor-pointer select-none shrink-0"
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-400 flex items-center justify-center text-white shadow-md shadow-blue-600/30">
              <QrCode className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            </div>
            <div>
              <div className="font-mono text-sm sm:text-base font-black tracking-tight leading-tight flex items-center gap-1">
                <span className="text-blue-400">JZN</span>
                <span className="text-white">CODE</span>
              </div>
              <p className="text-[9px] sm:text-[10px] text-slate-400 leading-none">
                Gerenciador Dinâmico
              </p>
            </div>
          </div>

          {/* Navegação Principal Desktop */}
          <nav className="hidden md:flex items-center gap-1 bg-[#050811] p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setActiveTab('dashboard')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'dashboard'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Dashboard</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('qrcodes')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'qrcodes'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <ListFilter className="w-3.5 h-3.5" />
              <span>Meus QR Codes</span>
            </button>

            <button
              type="button"
              onClick={() => setIsCreateOpen(true)}
              className="px-3 py-1.5 rounded-lg text-xs font-bold text-blue-300 hover:text-blue-200 hover:bg-blue-950/50 border border-blue-500/30 flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Novo QR Code</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('google')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'google'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-amber-400 hover:text-amber-300 hover:bg-slate-800/50'
              }`}
            >
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span>⭐ Avaliação Google</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('account')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'account'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <UserIcon className="w-3.5 h-3.5" />
              <span>Minha Conta</span>
            </button>
          </nav>

          {/* Ações Rápidas Direita (+ Novo QR Code Mobile & Logout) */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Botão + Novo QR Code no cabeçalho em mobile */}
            <button
              type="button"
              onClick={() => setIsCreateOpen(true)}
              className="md:hidden py-1.5 px-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1 shadow-sm shadow-blue-600/30 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Novo</span>
            </button>

            {/* Perfil / Sair */}
            <button
              type="button"
              onClick={() => setActiveTab('account')}
              className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-[#050811] hover:bg-slate-800 text-slate-300 border border-slate-800 flex items-center gap-1.5 text-xs font-medium cursor-pointer"
            >
              <UserIcon className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <span className="hidden sm:inline max-w-[100px] truncate">{userName}</span>
            </button>
          </div>
        </div>

        {/* NAVEGAÇÃO COMPACTA PARA CELULAR (ABAIXO DO HEADER) */}
        <div className="flex md:hidden items-center justify-around gap-1 pt-2 border-t border-slate-800/60 mt-2 max-w-full overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('dashboard')}
            className={`flex-1 py-1.5 px-1 rounded-lg text-[11px] font-semibold flex flex-col items-center gap-0.5 transition-colors ${
              activeTab === 'dashboard'
                ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                : 'text-slate-400'
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>Dashboard</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('qrcodes')}
            className={`flex-1 py-1.5 px-1 rounded-lg text-[11px] font-semibold flex flex-col items-center gap-0.5 transition-colors ${
              activeTab === 'qrcodes'
                ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                : 'text-slate-400'
            }`}
          >
            <ListFilter className="w-3.5 h-3.5" />
            <span>QR Codes</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('google')}
            className={`flex-1 py-1.5 px-1 rounded-lg text-[11px] font-semibold flex flex-col items-center gap-0.5 transition-colors ${
              activeTab === 'google'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'text-amber-400/80'
            }`}
          >
            <Star className="w-3.5 h-3.5 fill-amber-400" />
            <span>Avaliação</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('account')}
            className={`flex-1 py-1.5 px-1 rounded-lg text-[11px] font-semibold flex flex-col items-center gap-0.5 transition-colors ${
              activeTab === 'account'
                ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                : 'text-slate-400'
            }`}
          >
            <UserIcon className="w-3.5 h-3.5" />
            <span>Conta</span>
          </button>
        </div>
      </header>

      {/* CONTEÚDO PRINCIPAL DINÂMICO DE ACORDO COM A ABA ATIVA */}
      <main
        id="main-content"
        className="flex-1 max-w-6xl w-full mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-5 max-w-full"
      >
        {/* ========================================================
            ABA 1: DASHBOARD
           ======================================================== */}
        {activeTab === 'dashboard' && (
          <div className="space-y-5 animate-fadeIn">
            {/* DASHBOARD COMPACTO: ÚNICO CARD HORIZONTAL DIVIDIDO EM 4 INFORMAÇÕES */}
            <div className="bg-[#0d121f] border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center justify-between">
                <span>Resumo da Plataforma</span>
                <span className="text-[10px] text-blue-400 font-mono">Sincronizado</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-0 sm:divide-x divide-slate-800/80">
                {/* 1. Total QR Codes */}
                <div className="px-2 sm:px-4 py-1">
                  <span className="text-[11px] font-semibold text-slate-400 block">QR Codes</span>
                  <span className="text-2xl sm:text-3xl font-black text-white">{totalCount}</span>
                </div>

                {/* 2. Ativos */}
                <div className="px-2 sm:px-4 py-1">
                  <span className="text-[11px] font-semibold text-emerald-400 block">Ativos</span>
                  <span className="text-2xl sm:text-3xl font-black text-emerald-400">{activeCount}</span>
                </div>

                {/* 3. Inativos */}
                <div className="px-2 sm:px-4 py-1">
                  <span className="text-[11px] font-semibold text-amber-400 block">Inativos</span>
                  <span className="text-2xl sm:text-3xl font-black text-amber-400">{inactiveCount}</span>
                </div>

                {/* 4. Leituras Totais */}
                <div className="px-2 sm:px-4 py-1">
                  <span className="text-[11px] font-semibold text-blue-400 block">Leituras Totais</span>
                  <span className="text-2xl sm:text-3xl font-black text-blue-400">{totalScans}</span>
                </div>
              </div>
            </div>

            {/* ATALHOS RÁPIDOS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Card Atalho Novo QR Code */}
              <div
                onClick={() => setIsCreateOpen(true)}
                className="bg-[#0d121f] border border-blue-500/30 hover:border-blue-500/60 rounded-2xl p-4 sm:p-5 shadow-md flex items-center justify-between gap-3 cursor-pointer transition-all hover:bg-[#111827]"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-blue-400 font-bold text-sm sm:text-base">
                    <Plus className="w-4 h-4" />
                    <span>Criar QR Code Dinâmico</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Crie um código permanente para sites, catálogos, WhatsApp ou redes sociais.
                  </p>
                </div>
                <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 shrink-0">
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>

              {/* Card Atalho Gerador de Avaliação Google */}
              <div
                onClick={() => setActiveTab('google')}
                className="bg-[#0d121f] border border-amber-500/30 hover:border-amber-500/60 rounded-2xl p-4 sm:p-5 shadow-md flex items-center justify-between gap-3 cursor-pointer transition-all hover:bg-[#111827]"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-amber-400 font-bold text-sm sm:text-base">
                    <Star className="w-4 h-4 fill-amber-400" />
                    <span>⭐ Gerador de Avaliação Google</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Converta o link da sua empresa no Google Maps em link direto de avaliação e plaquinha.
                  </p>
                </div>
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </div>

            {/* SEÇÃO RECENTES & LISTA NO DASHBOARD */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                  <QrCode className="w-4 h-4 text-blue-400" />
                  <span>QR Codes Recentes</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setActiveTab('qrcodes')}
                  className="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1 cursor-pointer"
                >
                  <span>Ver todos ({totalCount})</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {dataLoading ? (
                <div className="py-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                  <span>Carregando seus QR Codes...</span>
                </div>
              ) : qrCodes.length === 0 ? (
                <div className="p-8 text-center bg-[#0d121f] border border-slate-800 rounded-2xl space-y-3">
                  <QrCode className="w-10 h-10 text-slate-600 mx-auto" />
                  <p className="text-sm font-bold text-white">Nenhum QR Code cadastrado ainda.</p>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Crie seu primeiro QR Code dinâmico para imprimir em suas placas ou materiais promocionais.
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsCreateOpen(true)}
                    className="py-2.5 px-5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold inline-flex items-center gap-2 shadow-md shadow-blue-600/30 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ Novo QR Code</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {qrCodes.slice(0, 5).map((qr) => (
                    <QRCodeCard
                      key={qr.slug || qr.id}
                      qr={qr}
                      onEdit={(target) => setEditingQR(target)}
                      onDelete={(target) => setDeletingQR(target)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================
            ABA 2: MEUS QR CODES
           ======================================================== */}
        {activeTab === 'qrcodes' && (
          <div className="space-y-4 animate-fadeIn">
            {/* NO TOPO: TÍTULO "Meus QR Codes" + BOTÃO "+ Novo QR Code" */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                  Meus QR Codes
                </h2>
                <p className="text-xs text-slate-400">
                  Gerencie o destino e baixe seus códigos dinâmicos permanentes.
                </p>
              </div>

              <button
                id="btn-novo-qr-code"
                type="button"
                onClick={() => setIsCreateOpen(true)}
                className="py-2 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 shadow-md shadow-blue-600/30 transition-all cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>+ Novo QR Code</span>
              </button>
            </div>

            {/* ABAIXO: BUSCA POR NOME OU CÓDIGO */}
            <div className="relative w-full">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
              <input
                id="input-pesquisa"
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="🔎 Buscar por nome ou código..."
                className="w-full pl-10 pr-9 py-2.5 bg-[#0d121f] border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
              />
              {searchTerm && (
                <button
                  id="btn-clear-search"
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-1 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* DEPOIS: FILTROS "Todos | Ativos | Inativos" */}
            <div className="flex items-center gap-1.5 border-b border-slate-800/80 pb-3">
              <button
                type="button"
                onClick={() => setFilterStatus('all')}
                className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  filterStatus === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-[#0d121f] text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                Todos ({totalCount})
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus('active')}
                className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  filterStatus === 'active'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-[#0d121f] text-slate-400 hover:text-emerald-400 border border-slate-800'
                }`}
              >
                Ativos ({activeCount})
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus('inactive')}
                className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  filterStatus === 'inactive'
                    ? 'bg-amber-600 text-white'
                    : 'bg-[#0d121f] text-slate-400 hover:text-amber-400 border border-slate-800'
                }`}
              >
                Inativos ({inactiveCount})
              </button>
            </div>

            {/* LISTAGEM DE CARDS COMPACTOS */}
            {dataLoading ? (
              <div className="py-12 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                <span>Carregando seus QR Codes...</span>
              </div>
            ) : filteredQRCodes.length === 0 ? (
              <div className="p-8 text-center bg-[#0d121f] border border-slate-800 rounded-2xl space-y-2">
                <p className="text-sm font-bold text-white">Nenhum QR Code encontrado.</p>
                <p className="text-xs text-slate-400">
                  {searchTerm
                    ? `Nenhum resultado para "${searchTerm}". Tente buscar por outro nome ou código.`
                    : 'Você não tem nenhum QR Code nesta categoria.'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {paginatedQRCodes.map((qr) => (
                  <QRCodeCard
                    key={qr.slug || qr.id}
                    qr={qr}
                    onEdit={(target) => setEditingQR(target)}
                    onDelete={(target) => setDeletingQR(target)}
                  />
                ))}

                {/* Paginação */}
                {hasMore && (
                  <div className="pt-2 text-center">
                    <button
                      type="button"
                      onClick={handleLoadMore}
                      className="py-2 px-5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors cursor-pointer"
                    >
                      Carregar mais QR Codes
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ========================================================
            ABA 3: ⭐ AVALIAÇÃO GOOGLE
           ======================================================== */}
        {activeTab === 'google' && (
          <div className="animate-fadeIn">
            <GoogleReviewGenerator
              user={user}
              allQRCodes={qrCodes}
              onOpenQRInList={(slug) => {
                setSearchTerm(slug);
                setActiveTab('qrcodes');
              }}
              onEditQR={(target) => setEditingQR(target)}
            />
          </div>
        )}

        {/* ========================================================
            ABA 4: MINHA CONTA
           ======================================================== */}
        {activeTab === 'account' && (
          <div className="space-y-5 animate-fadeIn max-w-xl mx-auto">
            <div className="bg-[#0d121f] border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-5">
              <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-400 flex items-center justify-center text-white shadow-md shadow-blue-600/30">
                  <UserIcon className="w-6 h-6" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-bold text-white truncate">{userName}</h3>
                  <p className="text-xs text-slate-400 font-mono truncate">{user.email}</p>
                </div>
              </div>

              {/* Informações da Conta */}
              <div className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#050811] border border-slate-800">
                  <span className="text-slate-400">Total de QR Codes</span>
                  <strong className="text-white font-bold">{totalCount}</strong>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#050811] border border-slate-800">
                  <span className="text-slate-400">Total de Leituras</span>
                  <strong className="text-blue-400 font-bold">{totalScans}</strong>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#050811] border border-slate-800">
                  <span className="text-slate-400">Sincronização Cloud</span>
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" />
                    <span>Ativa (Firestore)</span>
                  </span>
                </div>

                {/* Suporte a NFC para Placas */}
                <div className="p-3 rounded-xl bg-[#050811] border border-blue-500/20 space-y-1">
                  <div className="flex items-center gap-1.5 text-blue-400 font-bold">
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>Pronto para Placas com NFC</span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    O link dinâmico permanente de cada QR Code (<code className="text-blue-400">dominio.com/q/:slug</code>) pode ser gravado diretamente em chips NFC para placas inteligentes de acrílico ou metal.
                  </p>
                </div>
              </div>

              {/* Ações da Conta */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                {/* Redefinir senha */}
                <button
                  type="button"
                  onClick={handleSendPasswordReset}
                  disabled={resetEmailLoading}
                  className="w-full py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>
                    {resetEmailLoading
                      ? 'Enviando e-mail...'
                      : resetEmailSent
                      ? '✓ E-mail de redefinição enviado!'
                      : 'Redefinir senha da conta'}
                  </span>
                </button>

                {/* Sair da conta */}
                <button
                  type="button"
                  onClick={() => signOut(auth)}
                  className="w-full py-2.5 px-3 rounded-xl bg-red-950/40 hover:bg-red-900/40 text-red-300 border border-red-500/30 text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sair da conta</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* MODAL 1: CRIAR NOVO QR CODE */}
      <CreateQRModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={(newQR) => {
          setIsCreateOpen(false);
          setActiveTab('qrcodes');
        }}
      />

      {/* MODAL 2: EDITAR DESTINO */}
      <EditDestinationModal
        qr={editingQR}
        isOpen={!!editingQR}
        onClose={() => setEditingQR(null)}
        onUpdated={() => {
          setEditingQR(null);
        }}
      />

      {/* MODAL 3: CONFIRMAÇÃO DE EXCLUSÃO */}
      <DeleteConfirmModal
        qr={deletingQR}
        isOpen={!!deletingQR}
        onClose={() => setDeletingQR(null)}
        onDeleted={() => {
          setDeletingQR(null);
        }}
        onDeactivated={() => {
          setDeletingQR(null);
        }}
      />
    </div>
  );
}
