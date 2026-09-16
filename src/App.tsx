import { useEffect, useState, useMemo } from 'react';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { auth, db } from './firebase';
import { DynamicQRCode } from './types';
import { RedirectView } from './components/RedirectView';
import { LoginView } from './components/LoginView';
import { QRCodeCard } from './components/QRCodeCard';
import { CreateQRModal } from './components/CreateQRModal';
import { EditDestinationModal } from './components/EditDestinationModal';
import { DeleteConfirmModal } from './components/DeleteConfirmModal';
import {
  QrCode,
  Plus,
  Search,
  LogOut,
  X,
  ChevronDown,
  User as UserIcon,
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

export default function App() {
  const [activeSlug, setActiveSlug] = useState<string | null>(() => getSlugFromCurrentUrl());
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

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

  // Filtered QR codes by status and search term (primarily by name)
  const filteredQRCodes = useMemo(() => {
    let list = qrCodes;

    // Status filter
    if (filterStatus === 'active') {
      list = list.filter((item) => item.active !== false);
    } else if (filterStatus === 'inactive') {
      list = list.filter((item) => item.active === false);
    }

    // Search filter (primarily by name)
    const term = searchTerm.trim().toLowerCase();
    if (term) {
      list = list.filter(
        (item) =>
          item.name.toLowerCase().includes(term) ||
          item.slug.toLowerCase().includes(term)
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

  // User display title
  const userName = user.displayName || user.email?.split('@')[0] || 'Usuário';

  // 4. MAIN DASHBOARD VIEW (MOBILE-FIRST)
  return (
    <div
      id="dashboard-root"
      className="min-h-screen bg-[#070a12] text-slate-100 flex flex-col selection:bg-blue-600 selection:text-white relative font-sans max-w-full overflow-x-hidden"
    >
      {/* 2. CABEÇALHO COMPACTO */}
      <header
        id="main-header"
        className="sticky top-0 z-30 bg-[#0d121f]/95 backdrop-blur-md border-b border-slate-800/90 px-4 sm:px-6 py-2.5 max-w-full"
      >
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          {/* Esquerda: Ícone + JZN CODE + abaixo pequeno: QR Codes Dinâmicos */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-400 flex items-center justify-center text-white shadow-md shadow-blue-600/30 shrink-0">
              <QrCode className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="font-mono text-base font-black tracking-tight leading-tight flex items-center gap-1">
                <span className="text-blue-400">JZN</span>
                <span className="text-white">CODE</span>
              </div>
              <p className="text-[10px] text-slate-400 leading-none truncate">
                QR Codes Dinâmicos
              </p>
            </div>
          </div>

          {/* Direita: Perfil do usuário + Botão Sair */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Perfil */}
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#050811] border border-slate-800 text-slate-300 text-xs max-w-[130px] sm:max-w-[200px]">
              <UserIcon className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <span className="truncate font-medium text-[11px] sm:text-xs">
                {userName}
              </span>
            </div>

            {/* Botão Sair */}
            <button
              id="btn-logout"
              type="button"
              onClick={() => signOut(auth)}
              title="Sair da conta"
              className="p-2 rounded-lg bg-[#050811] hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        </div>
      </header>

      {/* CONTEÚDO PRINCIPAL */}
      <main
        id="main-content"
        className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-5 sm:py-6 space-y-4 max-w-full"
      >
        {/* BOTÃO PRINCIPAL GRANDE: + NOVO QR CODE */}
        <div className="w-full">
          <button
            id="btn-novo-qr-code"
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="w-full py-3.5 px-5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-xl shadow-blue-600/30 transition-all active:scale-[0.99] cursor-pointer"
          >
            <Plus className="w-5 h-5 stroke-[3]" />
            <span>+ NOVO QR CODE</span>
          </button>
        </div>

        {/* 3. PESQUISA */}
        <div className="w-full">
          <div className="relative w-full">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            <input
              id="input-pesquisa"
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="🔎 Pesquisar QR Code pelo nome…"
              className="w-full pl-10 pr-9 py-2.5 bg-[#0d121f] border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-medium"
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
        </div>

        {/* 4. RESUMO / INDICADORES (FUNCIONAM COMO FILTROS) */}
        <div
          id="filtros-resumo"
          className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full"
        >
          {/* Todos */}
          <button
            id="filtro-todos"
            type="button"
            onClick={() => setFilterStatus('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer border ${
              filterStatus === 'all'
                ? 'bg-blue-600 border-blue-500 text-white shadow-md shadow-blue-600/30'
                : 'bg-[#0d121f] border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Todos</span>
            <span
              className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono ${
                filterStatus === 'all'
                  ? 'bg-blue-800 text-white'
                  : 'bg-[#050811] text-slate-300'
              }`}
            >
              {totalCount}
            </span>
          </button>

          {/* Ativos */}
          <button
            id="filtro-ativos"
            type="button"
            onClick={() => setFilterStatus('active')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer border ${
              filterStatus === 'active'
                ? 'bg-emerald-600 border-emerald-500 text-white shadow-md shadow-emerald-600/30'
                : 'bg-[#0d121f] border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Ativos</span>
            <span
              className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono ${
                filterStatus === 'active'
                  ? 'bg-emerald-800 text-white'
                  : 'bg-[#050811] text-slate-300'
              }`}
            >
              {activeCount}
            </span>
          </button>

          {/* Inativos */}
          <button
            id="filtro-inativos"
            type="button"
            onClick={() => setFilterStatus('inactive')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer border ${
              filterStatus === 'inactive'
                ? 'bg-amber-600 border-amber-500 text-white shadow-md shadow-amber-600/30'
                : 'bg-[#0d121f] border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span>Inativos</span>
            <span
              className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono ${
                filterStatus === 'inactive'
                  ? 'bg-amber-800 text-white'
                  : 'bg-[#050811] text-slate-300'
              }`}
            >
              {inactiveCount}
            </span>
          </button>
        </div>

        {/* 5. LISTA / GRID DE CARDS DOS QR CODES */}
        {dataLoading ? (
          <div id="loading-qr-grid" className="py-16 text-center space-y-2.5 font-mono">
            <div className="w-8 h-8 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mx-auto" />
            <p className="text-xs text-slate-400">Carregando seus QR Codes...</p>
          </div>
        ) : filteredQRCodes.length === 0 ? (
          <div
            id="empty-state-card"
            className="text-center py-12 px-4 bg-[#0d121f] border border-slate-800 rounded-2xl max-w-md mx-auto space-y-3 animate-fadeIn"
          >
            <div className="w-12 h-12 rounded-xl bg-blue-600/10 border border-blue-500/30 text-blue-400 flex items-center justify-center mx-auto">
              <QrCode className="w-6 h-6 opacity-80" />
            </div>

            {searchTerm ? (
              <div className="space-y-1">
                <h3 className="font-bold text-white text-sm">Nenhum QR Code encontrado</h3>
                <p className="text-xs text-slate-400">
                  Nenhum código corresponde a "{searchTerm}".
                </p>
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="mt-2 text-xs text-blue-400 hover:underline font-semibold cursor-pointer"
                >
                  Limpar pesquisa
                </button>
              </div>
            ) : filterStatus !== 'all' ? (
              <div className="space-y-1">
                <h3 className="font-bold text-white text-sm">
                  Nenhum QR Code {filterStatus === 'active' ? 'ativo' : 'inativo'}
                </h3>
                <button
                  type="button"
                  onClick={() => setFilterStatus('all')}
                  className="mt-2 text-xs text-blue-400 hover:underline font-semibold cursor-pointer"
                >
                  Ver todos os QR Codes
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <h3 className="font-bold text-white text-base">Nenhum QR Code cadastrado</h3>
                <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                  Crie seu primeiro QR Code agora. Você poderá informar o nome e o link de destino.
                </p>
                <button
                  id="btn-empty-novo"
                  type="button"
                  onClick={() => setIsCreateOpen(true)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-600/30 transition-all cursor-pointer active:scale-98"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>CRIAR PRIMEIRO QR CODE</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-5">
            {/* GRID RESPONSIVO: MOBILE FIRST (VERTICAL 1 COLUNA NO CELULAR) */}
            <div
              id="qr-codes-grid"
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 w-full max-w-full"
            >
              {paginatedQRCodes.map((qr) => (
                <QRCodeCard
                  key={qr.slug || qr.id}
                  qr={qr}
                  onEdit={(item) => setEditingQR(item)}
                  onDelete={(item) => setDeletingQR(item)}
                />
              ))}
            </div>

            {/* 13. PAGINAÇÃO: CARREGAR MAIS */}
            {hasMore && (
              <div className="flex flex-col items-center justify-center pt-2 pb-2 space-y-1.5">
                <button
                  id="btn-carregar-mais"
                  type="button"
                  onClick={handleLoadMore}
                  className="px-6 py-2.5 rounded-xl bg-[#0d121f] hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-bold flex items-center gap-2 transition-all shadow-md cursor-pointer hover:border-blue-500/40 active:scale-98"
                >
                  <ChevronDown className="w-4 h-4 text-blue-400" />
                  <span>CARREGAR MAIS</span>
                </button>
                <span className="text-[11px] text-slate-500 font-mono">
                  Mostrando {paginatedQRCodes.length} de {filteredQRCodes.length}
                </span>
              </div>
            )}
          </div>
        )}
      </main>

      {/* FOOTER */}
      <footer
        id="main-footer"
        className="mt-auto border-t border-slate-900 py-4 text-center text-xs text-slate-500 bg-[#06080f]"
      >
        <div className="flex items-center justify-center gap-2 font-mono text-[11px]">
          <span className="text-blue-400 font-bold">JZN CODE</span>
          <span>•</span>
          <span>QR Codes Dinâmicos</span>
        </div>
      </footer>

      {/* MODALS */}
      <CreateQRModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={() => {
          // Automaticamente sincronizado via listener em tempo real
        }}
      />

      <EditDestinationModal
        qr={editingQR}
        isOpen={Boolean(editingQR)}
        onClose={() => setEditingQR(null)}
        onUpdated={() => {
          // Automaticamente sincronizado via listener em tempo real
        }}
      />

      <DeleteConfirmModal
        qr={deletingQR}
        isOpen={Boolean(deletingQR)}
        onClose={() => setDeletingQR(null)}
        onDeleted={() => {
          // Automaticamente sincronizado via listener em tempo real
        }}
      />
    </div>
  );
}
