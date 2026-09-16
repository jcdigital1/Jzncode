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
      className="bg-[#0d121f] border border-slate-800/90 hover:border-blue-500/40 rounded-2xl p-3.5 sm:p-4 shadow-md transition-all duration-200 flex flex-col justify-between gap-3 w-full max-w-full overflow-hidden"
    >
      {/* CORPO PRINCIPAL DO CARD: ESQUERDA | CENTRO | DIREITA */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3.5 sm:gap-4 w-full">
        {/* ESQUERDA: Miniatura do QR Code com aprox 80-100px */}
        <div className="shrink-0 mx-auto sm:mx-0">
          <div className="p-2 bg-white rounded-xl shadow-sm border border-slate-300/40 flex items-center justify-center w-[88px] h-[88px] sm:w-[96px] sm:h-[96px]">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt={`QR Code ${qr.name}`}
                className="w-full h-full object-contain block rounded"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-400">
                <QrCode className="w-6 h-6 text-blue-500 animate-pulse" />
              </div>
            )}
          </div>
        </div>

        {/* CENTRO: Nome, Código e Destino */}
        <div className="flex-1 min-w-0 w-full text-left space-y-1">
          {/* Nome */}
          <div className="flex items-center gap-2">
            <h3
              id={`qr-title-${qr.slug}`}
              title={qr.name}
              className="text-sm sm:text-base font-bold text-white tracking-tight truncate max-w-full"
            >
              {qr.name}
            </h3>
          </div>

          {/* Código / Slug */}
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <span className="text-slate-500 text-[11px]">Código:</span>
            <span className="font-mono text-blue-400 font-semibold text-xs bg-[#050811] px-1.5 py-0.5 rounded border border-slate-800">
              {qr.slug}
            </span>
            <button
              type="button"
              onClick={handleCopySlug}
              title="Copiar link dinâmico permanente"
              className="p-1 text-slate-400 hover:text-blue-300 rounded transition-colors"
            >
              {copiedSlug ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          </div>

          {/* Destino */}
          <div className="flex items-center gap-1.5 text-xs text-slate-400 pt-0.5 max-w-full">
            <span className="text-slate-500 text-[11px] shrink-0">Destino:</span>
            <span
              className="text-[12px] font-mono text-slate-300 truncate max-w-[220px] sm:max-w-[280px] md:max-w-[340px]"
              title={qr.destinationUrl}
            >
              {displayDest || qr.destinationUrl}
            </span>
            <a
              href={qr.destinationUrl}
              target="_blank"
              rel="noopener noreferrer"
              title="Abrir destino em nova aba"
              className="p-1 text-blue-400 hover:text-blue-300 shrink-0 transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        {/* DIREITA: Status, Leituras e Última leitura */}
        <div className="shrink-0 w-full sm:w-auto flex sm:flex-col justify-between sm:items-end border-t sm:border-t-0 border-slate-800/80 pt-2 sm:pt-0 gap-1 text-right">
          {/* Status badge */}
          <div
            id={`qr-status-${qr.slug}`}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase ${
              isActive
                ? 'bg-emerald-950/70 border border-emerald-500/40 text-emerald-400'
                : 'bg-amber-950/70 border border-amber-500/40 text-amber-400'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isActive ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
              }`}
            />
            <span>{isActive ? 'ATIVO' : 'INATIVO'}</span>
          </div>

          {/* Leituras */}
          <div className="text-xs text-slate-300">
            <span className="text-slate-500 text-[11px]">Leituras: </span>
            <strong className="text-white font-bold">{scans}</strong>
          </div>

          {/* Última leitura */}
          <div className="text-[11px] text-slate-400">
            <span className="text-slate-500 text-[10px]">Última leitura: </span>
            <span className="text-slate-300">{lastScan}</span>
          </div>
        </div>
      </div>

      {/* PARTE INFERIOR: AÇÕES PEQUENAS [ Editar ] [ Baixar ] [ Excluir ] */}
      <div className="pt-2 border-t border-slate-800/70 flex items-center justify-end gap-2 w-full">
        {/* Ação: Editar */}
        <button
          id={`btn-edit-${qr.slug}`}
          type="button"
          onClick={() => onEdit(qr)}
          className="py-1.5 px-3 rounded-lg bg-[#050811] hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-800 cursor-pointer"
        >
          <Edit3 className="w-3.5 h-3.5 text-blue-400" />
          <span>Editar</span>
        </button>

        {/* Ação: Baixar */}
        <div className="relative" ref={dropdownRef}>
          <button
            id={`btn-download-${qr.slug}`}
            type="button"
            onClick={() => setDownloadMenuOpen((prev) => !prev)}
            className="py-1.5 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1 transition-colors shadow-sm shadow-blue-600/20 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Baixar</span>
            <ChevronDown className="w-3 h-3 opacity-80" />
          </button>

          {downloadMenuOpen && (
            <div
              id={`download-menu-${qr.slug}`}
              className="absolute right-0 bottom-full mb-1.5 w-44 bg-[#0d121f] border border-blue-500/40 rounded-xl shadow-2xl p-1.5 z-30 space-y-1"
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

        {/* Ação: Excluir */}
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
