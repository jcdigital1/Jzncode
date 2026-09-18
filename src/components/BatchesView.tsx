import { useState, useMemo } from 'react';
import { QRBatch, DynamicQRCode } from '../types';
import {
  generateIdentifiedQRCodeDataUrl,
  getIdentifiedFilename,
  downloadDataUrl,
  getDynamicQRUrl,
  formatDisplayUrl,
} from '../utils/qr';
import {
  Layers,
  Search,
  ArrowLeft,
  QrCode,
  Download,
  Settings,
  ExternalLink,
  CheckCircle2,
  Clock,
  Filter,
  Sparkles,
  ChevronRight,
  Plus,
} from 'lucide-react';

interface BatchesViewProps {
  batches: QRBatch[];
  qrCodes: DynamicQRCode[];
  onOpenCreateBulk: () => void;
  onConfigureQR: (qr: DynamicQRCode) => void;
  initialSelectedBatchId?: string | null;
}

export function BatchesView({
  batches,
  qrCodes,
  onOpenCreateBulk,
  onConfigureQR,
  initialSelectedBatchId,
}: BatchesViewProps) {
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(
    initialSelectedBatchId || (batches.length === 1 ? batches[0].id : null)
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'available' | 'configured'>('all');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const selectedBatch = useMemo(() => {
    return batches.find((b) => b.id === selectedBatchId) || null;
  }, [batches, selectedBatchId]);

  // QR Codes do lote selecionado
  const batchQRCodes = useMemo(() => {
    if (!selectedBatchId) return [];
    return qrCodes
      .filter((q) => q.batchId === selectedBatchId)
      .sort((a, b) => (a.sequenceNumber || 0) - (b.sequenceNumber || 0));
  }, [qrCodes, selectedBatchId]);

  // Contadores dinâmicos calculados a partir dos QR Codes reais
  const batchStats = useMemo(() => {
    const total = batchQRCodes.length;
    const available = batchQRCodes.filter(
      (q) => q.status === 'available' || !q.destinationUrl
    ).length;
    const configured = total - available;
    return { total, available, configured };
  }, [batchQRCodes]);

  // Filtro e Busca dentro do lote
  const filteredBatchQRCodes = useMemo(() => {
    let list = batchQRCodes;

    if (filterStatus === 'available') {
      list = list.filter((q) => q.status === 'available' || !q.destinationUrl);
    } else if (filterStatus === 'configured') {
      list = list.filter((q) => (q.status === 'active' || q.active) && !!q.destinationUrl);
    }

    const term = searchTerm.trim().toLowerCase();
    if (term) {
      list = list.filter((q) => {
        const seqStr = String(q.sequenceNumber || '');
        const padSeqStr = String(q.sequenceNumber || '').padStart(3, '0');
        const name = (q.name || '').toLowerCase();
        const slug = (q.slug || '').toLowerCase();
        const client = (q.clientName || '').toLowerCase();
        const dest = (q.destinationUrl || '').toLowerCase();

        return (
          seqStr.includes(term) ||
          padSeqStr.includes(term) ||
          name.includes(term) ||
          slug.includes(term) ||
          client.includes(term) ||
          dest.includes(term)
        );
      });
    }

    return list;
  }, [batchQRCodes, filterStatus, searchTerm]);

  // Download individual de plaquinha identificada
  const handleDownloadIdentifiedQR = async (qr: DynamicQRCode) => {
    try {
      setDownloadingId(qr.id || qr.slug);
      const dynamicUrl = getDynamicQRUrl(qr.slug);
      const seq = qr.sequenceNumber || 1;
      const title = qr.name || `${qr.prefix || 'Plaquinha'} ${String(seq).padStart(3, '0')}`;
      
      const pngDataUrl = await generateIdentifiedQRCodeDataUrl(
        dynamicUrl,
        title,
        qr.slug,
        1024
      );

      const filename = getIdentifiedFilename(qr.prefix || 'plaquinha', seq, 'png');
      downloadDataUrl(pngDataUrl, filename);
    } catch (err) {
      console.error('Erro ao baixar QR Code identificado:', err);
    } finally {
      setDownloadingId(null);
    }
  };

  // ========================================================
  // 1. VISÃO DENTRO DO LOTE (SELECIONADO)
  // ========================================================
  if (selectedBatch) {
    return (
      <div className="space-y-4 animate-fadeIn">
        {/* BARRA SUPERIOR DO LOTE */}
        <div className="bg-[#0d121f] border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSelectedBatchId(null)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                title="Voltar aos Lotes"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-blue-400 bg-blue-950/40 border border-blue-500/30 px-2 py-0.5 rounded">
                    LOTE
                  </span>
                  <h2 className="text-base sm:text-lg font-bold text-white">
                    {selectedBatch.name}
                  </h2>
                </div>
                <p className="text-xs text-slate-400">
                  Prefixo: <strong className="text-slate-200">{selectedBatch.prefix}</strong> • Faixa: {String(selectedBatch.startNumber || 1).padStart(3, '0')} a {String(selectedBatch.endNumber || selectedBatch.quantity).padStart(3, '0')}
                </p>
              </div>
            </div>

            {/* Contadores do lote */}
            <div className="flex items-center gap-2 bg-[#050811] p-1.5 rounded-xl border border-slate-800 text-xs">
              <div className="px-2.5 py-1 text-center">
                <span className="text-[10px] text-slate-500 block">Total</span>
                <span className="font-bold text-white">{batchStats.total}</span>
              </div>
              <div className="w-[1px] h-6 bg-slate-800" />
              <div className="px-2.5 py-1 text-center">
                <span className="text-[10px] text-slate-400 block">⚪ Disponíveis</span>
                <span className="font-bold text-slate-300">{batchStats.available}</span>
              </div>
              <div className="w-[1px] h-6 bg-slate-800" />
              <div className="px-2.5 py-1 text-center">
                <span className="text-[10px] text-emerald-400 block">🟢 Configurados</span>
                <span className="font-bold text-emerald-400">{batchStats.configured}</span>
              </div>
            </div>
          </div>

          {/* BUSCA E FILTROS */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-2 border-t border-slate-800/80">
            {/* Campo de busca */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar número (ex: 37), nome, código ou cliente..."
                className="w-full bg-[#050811] border border-slate-800 focus:border-blue-500 rounded-xl pl-9 pr-3.5 py-2 text-xs text-white placeholder:text-slate-600 outline-none transition-colors"
              />
            </div>

            {/* Filtros rápidos com contadores */}
            <div className="flex items-center gap-1 bg-[#050811] p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setFilterStatus('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  filterStatus === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Todos ({batchStats.total})
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus('available')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  filterStatus === 'available'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                ⚪ Disponíveis ({batchStats.available})
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus('configured')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  filterStatus === 'configured'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                🟢 Configurados ({batchStats.configured})
              </button>
            </div>
          </div>
        </div>

        {/* LISTA / GRID DE QR CODES DO LOTE */}
        {filteredBatchQRCodes.length === 0 ? (
          <div className="p-8 text-center bg-[#0d121f] border border-slate-800 rounded-2xl space-y-2">
            <QrCode className="w-10 h-10 text-slate-600 mx-auto" />
            <p className="text-sm font-bold text-white">Nenhum QR Code encontrado neste filtro.</p>
            <p className="text-xs text-slate-400">
              Tente pesquisar por outro número ou alterar o filtro selecionado.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {filteredBatchQRCodes.map((qr) => {
              const isAvailable = qr.status === 'available' || !qr.destinationUrl;
              const seqFormatted = String(qr.sequenceNumber || 1).padStart(3, '0');
              const dynamicUrl = getDynamicQRUrl(qr.slug);
              const isDownloading = downloadingId === (qr.id || qr.slug);

              return (
                <div
                  key={qr.slug || qr.id}
                  id={`batch-qr-card-${qr.slug}`}
                  className="bg-[#0d121f] border border-slate-800 hover:border-blue-500/40 rounded-xl p-3 shadow-sm transition-all flex flex-col justify-between gap-3"
                >
                  <div className="flex items-start justify-between gap-2.5">
                    {/* Número visual em destaque + Nome */}
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-11 h-11 rounded-xl bg-white p-1 flex items-center justify-center shrink-0 border border-slate-300/40">
                        {/* QR Code SVG miniatura */}
                        <QrCode className="w-8 h-8 text-slate-900" />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs font-black text-blue-400 bg-blue-950/50 px-1.5 py-0.5 rounded border border-blue-500/30">
                            {seqFormatted}
                          </span>
                          <span className="text-sm font-bold text-white truncate">
                            {qr.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                          <span className="font-mono text-slate-400">
                            Cód: <strong className="text-slate-200">{qr.slug}</strong>
                          </span>
                          <span>•</span>
                          <span>{qr.scansCount || 0} leituras</span>
                        </div>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border shrink-0 ${
                        isAvailable
                          ? 'bg-slate-800/80 text-slate-300 border-slate-700'
                          : 'bg-emerald-950/40 text-emerald-300 border-emerald-500/30'
                      }`}
                    >
                      {isAvailable ? '⚪ Disponível' : '🟢 Configurado'}
                    </span>
                  </div>

                  {/* Destino atual ou cliente */}
                  <div className="bg-[#050811] rounded-lg px-2.5 py-1.5 text-[11px] border border-slate-800/70">
                    {isAvailable ? (
                      <span className="text-slate-500 italic">
                        Destino ainda não configurado (ao escanear: página neutra)
                      </span>
                    ) : (
                      <div className="truncate text-slate-300">
                        {qr.clientName && (
                          <span className="font-semibold text-white mr-1.5">
                            [{qr.clientName}]
                          </span>
                        )}
                        <span className="text-blue-400 font-mono">
                          {formatDisplayUrl(qr.destinationUrl, 32)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Ações */}
                  <div className="flex items-center justify-between gap-1.5 pt-1 border-t border-slate-800/80 text-xs">
                    {/* Botão Configurar Destino */}
                    <button
                      type="button"
                      onClick={() => onConfigureQR(qr)}
                      className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                        isAvailable
                          ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-sm'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                      }`}
                    >
                      <Settings className="w-3.5 h-3.5" />
                      <span>{isAvailable ? 'Configurar destino' : 'Editar destino'}</span>
                    </button>

                    <div className="flex items-center gap-1">
                      {/* Botão Baixar QR identificado */}
                      <button
                        type="button"
                        onClick={() => handleDownloadIdentifiedQR(qr)}
                        disabled={isDownloading}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1 transition-colors cursor-pointer text-xs font-semibold disabled:opacity-50"
                        title="Baixar QR Code identificado com nome e código para impressão"
                      >
                        <Download className="w-3.5 h-3.5 text-blue-400" />
                        <span>{isDownloading ? 'Baixando...' : 'Baixar QR'}</span>
                      </button>

                      {/* Botão Testar */}
                      <a
                        href={dynamicUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors"
                        title="Testar redirecionamento em nova aba"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ========================================================
  // 2. VISÃO GERAL DE LOTES (MEUS LOTES)
  // ========================================================
  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Cabeçalho de Lotes */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-blue-400" />
            <span>Meus Lotes de Plaquinhas</span>
          </h2>
          <p className="text-xs text-slate-400">
            Gerencie lotes de QR Codes dinâmicos gerados em massa
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenCreateBulk}
          className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-600/30 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>+ Novo Lote</span>
        </button>
      </div>

      {batches.length === 0 ? (
        <div className="p-10 text-center bg-[#0d121f] border border-slate-800 rounded-2xl space-y-3">
          <Layers className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-base font-bold text-white">Nenhum lote criado ainda</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
            Você pode gerar até 100 QR Codes dinâmicos de uma vez com identificação sequencial (ex: Google 001 até 100).
          </p>
          <button
            type="button"
            onClick={onOpenCreateBulk}
            className="py-2.5 px-5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold inline-flex items-center gap-2 shadow-md shadow-blue-600/30 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>▦ Gerar QR Codes em Massa</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {batches.map((batch) => {
            const batchItems = qrCodes.filter((q) => q.batchId === batch.id);
            const total = batchItems.length || batch.quantity;
            const available = batchItems.filter(
              (q) => q.status === 'available' || !q.destinationUrl
            ).length;
            const configured = total - available;

            let formattedDate = 'Recentemente';
            if (batch.createdAt) {
              const d = typeof batch.createdAt?.toDate === 'function'
                ? batch.createdAt.toDate()
                : new Date(batch.createdAt);
              if (!isNaN(d.getTime())) {
                formattedDate = d.toLocaleDateString('pt-BR');
              }
            }

            return (
              <div
                key={batch.id}
                id={`batch-card-${batch.id}`}
                className="bg-[#0d121f] border border-slate-800 hover:border-blue-500/50 rounded-2xl p-4 sm:p-5 shadow-md flex flex-col justify-between gap-4 transition-all"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="text-sm sm:text-base font-bold text-white uppercase tracking-tight">
                      {batch.name}
                    </h3>
                    <span className="font-mono text-xs font-bold text-blue-400 bg-blue-950/40 border border-blue-500/30 px-2 py-0.5 rounded shrink-0">
                      {total} QRs
                    </span>
                  </div>

                  <p className="text-xs text-slate-400">
                    Faixa: {batch.prefix} {String(batch.startNumber || 1).padStart(3, '0')} a {String(batch.endNumber || batch.quantity).padStart(3, '0')}
                  </p>
                </div>

                {/* Status com contadores */}
                <div className="grid grid-cols-2 gap-2 bg-[#050811] p-2.5 rounded-xl border border-slate-800 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">
                      ⚪ Disponíveis
                    </span>
                    <span className="text-base font-black text-slate-200">
                      {available}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-emerald-400 block font-semibold">
                      🟢 Configurados
                    </span>
                    <span className="text-base font-black text-emerald-400">
                      {configured}
                    </span>
                  </div>
                </div>

                {/* Rodapé do Card */}
                <div className="flex items-center justify-between pt-1 text-xs">
                  <span className="text-[11px] text-slate-500">
                    Criado em: {formattedDate}
                  </span>

                  <button
                    type="button"
                    onClick={() => setSelectedBatchId(batch.id)}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold flex items-center gap-1.5 shadow-md shadow-blue-600/30 transition-colors cursor-pointer"
                  >
                    <span>ABRIR LOTE</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
