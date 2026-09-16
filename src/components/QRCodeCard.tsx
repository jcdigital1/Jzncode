import { useState, useEffect, useRef, type Key } from 'react';
import { DynamicQRCode } from '../types';
import {
  generateQRCodeDataUrl,
  generateQRCodeSvg,
  getQRCodeFilename,
  downloadDataUrl,
  downloadSvg,
  formatDisplayUrl,
  getDynamicQRUrl,
} from '../utils/qr';
import { formatScanDate } from '../utils/date';
import {
  Download,
  Edit3,
  Trash2,
  ExternalLink,
  QrCode,
  FileCode,
  FileImage,
  ChevronDown,
  Copy,
  Check,
} from 'lucide-react';

interface QRCodeCardProps {
  key?: Key;
  qr: DynamicQRCode;
  onEdit: (qr: DynamicQRCode) => void;
  onDelete: (qr: DynamicQRCode) => void;
}

export function QRCodeCard({ qr, onEdit, onDelete }: QRCodeCardProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [downloadMenuOpen, setDownloadMenuOpen] = useState(false);
  const [copiedSlug, setCopiedSlug] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // The dynamic QR code embeds ONLY the permanent dynamic URL
  const intermediateUrl = getDynamicQRUrl(qr.slug);
  const isActive = qr.active !== false;
  const scans = qr.scansCount || 0;
  const lastScan = formatScanDate(qr.lastScanAt);

  useEffect(() => {
    let active = true;
    async function makeQR() {
      try {
        const url = await generateQRCodeDataUrl(intermediateUrl, qr.name, 320);
        if (active) {
          setQrDataUrl(url);
        }
      } catch (e) {
        console.error('Erro ao gerar preview do QR Code:', e);
      }
    }
    makeQR();
    return () => {
      active = false;
    };
  }, [intermediateUrl, qr.name]);

  // Close download dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDownloadMenuOpen(false);
      }
    }
    if (downloadMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [downloadMenuOpen]);

  const handleCopySlug = async () => {
    try {
      await navigator.clipboard.writeText(intermediateUrl);
      setCopiedSlug(true);
      setTimeout(() => setCopiedSlug(false), 2000);
    } catch {
      // ignore
    }
  };

  const handleDownloadPng = async () => {
    try {
      const fullResUrl = await generateQRCodeDataUrl(intermediateUrl, qr.name, 1024);
      const filename = getQRCodeFilename(qr.name, 'png');
      downloadDataUrl(fullResUrl, filename);
      setDownloadMenuOpen(false);
    } catch (e) {
      console.error('Erro ao baixar PNG:', e);
    }
  };

  const handleDownloadSvg = async () => {
    try {
      const svgStr = await generateQRCodeSvg(intermediateUrl, qr.name);
      const filename = getQRCodeFilename(qr.name, 'svg');
      downloadSvg(svgStr, filename);
      setDownloadMenuOpen(false);
    } catch (e) {
      console.error('Erro ao baixar SVG:', e);
    }
  };

  const displayDest = formatDisplayUrl(qr.destinationUrl, 38);

  return (
    <div
      id={`qr-card-${qr.slug}`}
      className="bg-[#0d121f] border border-slate-800/90 hover:border-blue-500/40 rounded-xl p-3 sm:p-3.5 shadow-sm transition-all duration-150 flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full max-w-full overflow-hidden"
    >
      {/* LADO ESQUERDO: Miniatura + Detalhes */}
      <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
        {/* [QR pequeno] (56x56px) */}
        <div className="shrink-0 p-1.5 bg-white rounded-lg shadow-sm border border-slate-300/40 flex items-center justify-center w-14 h-14">
          {qrDataUrl ? (
            <img
              src={qrDataUrl}
              alt={`QR ${qr.name}`}
              className="w-full h-full object-contain block rounded"
            />
          ) : (
            <QrCode className="w-5 h-5 text-blue-500 animate-pulse" />
          )}
        </div>

        {/* Informações: Nome + Ativo / Código / Destino / Leituras */}
        <div className="min-w-0 flex-1 space-y-0.5 text-left">
          {/* Linha 1: Nome do QR + Badge Ativo */}
          <div className="flex items-center gap-2 flex-wrap">
            <h3
              id={`qr-title-${qr.slug}`}
              title={qr.name}
              className="text-sm font-bold text-white tracking-tight truncate max-w-[200px] sm:max-w-[280px]"
            >
              {qr.name}
            </h3>
            <span
              id={`qr-status-${qr.slug}`}
              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wider ${
                isActive
                  ? 'bg-emerald-950/70 text-emerald-400 border border-emerald-500/30'
                  : 'bg-amber-950/70 text-amber-400 border border-amber-500/30'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isActive ? 'bg-emerald-400' : 'bg-amber-400'
                }`}
              />
              <span>{isActive ? 'Ativo' : 'Inativo'}</span>
            </span>
          </div>

          {/* Linha 2: Código */}
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <span className="text-slate-500 text-[11px]">Código:</span>
            <span className="font-mono text-blue-400 font-semibold text-xs bg-[#050811] px-1.5 py-0.2 rounded border border-slate-800">
              {qr.slug}
            </span>
            <button
              type="button"
              onClick={handleCopySlug}
              title="Copiar link dinâmico"
              className="p-0.5 text-slate-400 hover:text-blue-300 rounded transition-colors"
            >
              {copiedSlug ? (
                <Check className="w-3 h-3 text-emerald-400" />
              ) : (
                <Copy className="w-3 h-3" />
              )}
            </button>
          </div>

          {/* Linha 3: Destino */}
          <div className="flex items-center gap-1.5 text-xs text-slate-400 truncate">
            <span className="text-slate-500 text-[11px] shrink-0">Destino:</span>
            <span
              className="text-[11px] font-mono text-slate-300 truncate max-w-[180px] sm:max-w-[240px] md:max-w-[320px]"
              title={qr.destinationUrl}
            >
              {displayDest || qr.destinationUrl}
            </span>
            <a
              href={qr.destinationUrl}
              target="_blank"
              rel="noopener noreferrer"
              title="Abrir destino em nova aba"
              className="p-0.5 text-blue-400 hover:text-blue-300 shrink-0"
            >
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {/* Linha 4: Leituras */}
          <div className="text-[11px] text-slate-400 flex items-center gap-2">
            <span>
              <strong className="text-white font-bold">{scans}</strong> leituras
            </span>
            {lastScan && (
              <span className="text-slate-500 text-[10px] hidden sm:inline">
                (última: {lastScan})
              </span>
            )}
          </div>
        </div>
      </div>

      {/* LADO DIREITO: Botões de Ação [ ✏ Editar ] [ ↓ Baixar ] [ 🗑 Excluir ] */}
      <div className="flex items-center justify-end gap-1.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800/80">
        {/* ✏ Editar */}
        <button
          id={`btn-edit-${qr.slug}`}
          type="button"
          onClick={() => onEdit(qr)}
          className="py-1.5 px-2.5 rounded-lg bg-[#050811] hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1 transition-colors border border-slate-800 cursor-pointer"
        >
          <Edit3 className="w-3.5 h-3.5 text-blue-400" />
          <span>Editar</span>
        </button>

        {/* ↓ Baixar */}
        <div className="relative" ref={dropdownRef}>
          <button
            id={`btn-download-${qr.slug}`}
            type="button"
            onClick={() => setDownloadMenuOpen((prev) => !prev)}
            className="py-1.5 px-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1 transition-colors shadow-sm shadow-blue-600/20 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Baixar</span>
            <ChevronDown className="w-3 h-3 opacity-80" />
          </button>

          {downloadMenuOpen && (
            <div
              id={`download-menu-${qr.slug}`}
              className="absolute right-0 bottom-full sm:bottom-auto sm:top-full mb-1.5 sm:mb-0 sm:mt-1.5 w-44 bg-[#0d121f] border border-blue-500/40 rounded-xl shadow-2xl p-1.5 z-30 space-y-1"
            >
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 py-0.5 border-b border-slate-800">
                Formato
              </div>
              <button
                type="button"
                onClick={handleDownloadPng}
                className="w-full py-1.5 px-2 rounded-lg text-left text-xs font-medium text-slate-200 hover:bg-blue-600 hover:text-white flex items-center gap-2 transition-colors cursor-pointer"
              >
                <FileImage className="w-3.5 h-3.5 text-blue-400" />
                <span>PNG (Alta resolução)</span>
              </button>
              <button
                type="button"
                onClick={handleDownloadSvg}
                className="w-full py-1.5 px-2 rounded-lg text-left text-xs font-medium text-slate-200 hover:bg-blue-600 hover:text-white flex items-center gap-2 transition-colors cursor-pointer"
              >
                <FileCode className="w-3.5 h-3.5 text-cyan-400" />
                <span>SVG (Vetorial)</span>
              </button>
            </div>
          )}
        </div>

        {/* 🗑 Excluir */}
        <button
          id={`btn-delete-${qr.slug}`}
          type="button"
          onClick={() => onDelete(qr)}
          className="py-1.5 px-2.5 rounded-lg bg-[#050811] hover:bg-red-950/40 text-red-400 hover:text-red-300 text-xs font-semibold flex items-center gap-1 transition-colors border border-red-500/25 cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5 text-red-400" />
          <span>Excluir</span>
        </button>
      </div>
    </div>
  );
}
