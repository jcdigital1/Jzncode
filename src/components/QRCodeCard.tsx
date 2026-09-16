import { useState, useEffect, useRef, type Key } from 'react';
import { DynamicQRCode } from '../types';
import {
  generateQRCodeDataUrl,
  generateQRCodeSvg,
  getQRCodeFilename,
  downloadDataUrl,
  downloadSvg,
  formatDisplayUrl,
} from '../utils/qr';
import {
  Download,
  Edit3,
  Trash2,
  ExternalLink,
  QrCode,
  FileCode,
  FileImage,
  ChevronDown,
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
  const dropdownRef = useRef<HTMLDivElement>(null);

  // The dynamic QR code embeds ONLY the permanent intermediate URL
  const intermediateUrl = `${window.location.origin}/q/${qr.slug}`;
  const isActive = qr.active !== false;

  useEffect(() => {
    let active = true;
    async function makeQR() {
      try {
        const url = await generateQRCodeDataUrl(intermediateUrl, 480);
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
  }, [intermediateUrl]);

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

  const handleDownloadPng = async () => {
    try {
      const fullResUrl = await generateQRCodeDataUrl(intermediateUrl, 1024);
      const filename = getQRCodeFilename(qr.name, 'png');
      downloadDataUrl(fullResUrl, filename);
      setDownloadMenuOpen(false);
    } catch (e) {
      console.error('Erro ao baixar PNG:', e);
    }
  };

  const handleDownloadSvg = async () => {
    try {
      const svgStr = await generateQRCodeSvg(intermediateUrl);
      const filename = getQRCodeFilename(qr.name, 'svg');
      downloadSvg(svgStr, filename);
      setDownloadMenuOpen(false);
    } catch (e) {
      console.error('Erro ao baixar SVG:', e);
    }
  };

  const displayDest = formatDisplayUrl(qr.destinationUrl, 34);

  return (
    <div
      id={`qr-card-${qr.slug}`}
      className="bg-[#0d121f] border border-slate-800 hover:border-blue-500/40 rounded-2xl p-5 shadow-lg flex flex-col justify-between transition-all duration-200 relative overflow-hidden w-full max-w-full"
    >
      {/* CARD CONTENT */}
      <div className="w-full flex flex-col items-center text-center space-y-4">
        {/* 1. STATUS & CÓDIGO */}
        <div className="w-full flex items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
          {/* Status Badge */}
          <div
            id={`qr-status-${qr.slug}`}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wider uppercase ${
              isActive
                ? 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-400'
                : 'bg-amber-950/60 border border-amber-500/40 text-amber-400'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isActive ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
              }`}
            />
            <span>{isActive ? 'ATIVO' : 'INATIVO'}</span>
          </div>

          {/* Código / Slug */}
          <div className="text-[11px] font-mono text-slate-400 bg-[#050811] px-2.5 py-1 rounded-lg border border-slate-800 flex items-center gap-1">
            <span className="text-slate-500 text-[10px]">Código:</span>
            <span className="text-blue-400 font-semibold">{qr.slug}</span>
          </div>
        </div>

        {/* 2. NOME (Highlight prominence) */}
        <div className="w-full text-center px-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-0.5">
            NOME
          </span>
          <h3
            id={`qr-title-${qr.slug}`}
            title={qr.name}
            className="text-base sm:text-lg font-black text-white tracking-tight truncate max-w-full"
          >
            {qr.name}
          </h3>
        </div>

        {/* 3. QR CODE CENTRALIZADO */}
        {/* Moldura branca com margem adequada (quiet-zone) sem sobreposição */}
        <div className="flex justify-center w-full my-1">
          <div className="p-3.5 bg-white rounded-xl shadow-md border border-slate-200/20 inline-flex items-center justify-center">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt={`QR Code ${qr.name}`}
                className="w-36 h-36 sm:w-40 sm:h-40 object-contain block"
              />
            ) : (
              <div className="w-36 h-36 sm:w-40 sm:h-40 flex items-center justify-center text-slate-400">
                <QrCode className="w-10 h-10 text-blue-500 animate-pulse" />
              </div>
            )}
          </div>
        </div>

        {/* 4. DESTINO ATUAL (Reduzido visualmente, sem quebrar o card) */}
        <div className="w-full bg-[#050811] border border-slate-800/90 rounded-xl p-3 text-left">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block mb-1">
            DESTINO ATUAL
          </span>
          <div className="flex items-center justify-between gap-2 overflow-hidden max-w-full">
            <span
              className="text-xs font-mono text-slate-300 truncate max-w-[calc(100%-24px)] block"
              title={qr.destinationUrl}
            >
              {displayDest || qr.destinationUrl}
            </span>
            <a
              href={qr.destinationUrl}
              target="_blank"
              rel="noopener noreferrer"
              title="Abrir destino em nova aba"
              className="p-1 text-blue-400 hover:text-blue-300 hover:bg-blue-950/40 rounded shrink-0 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>

      {/* 5. APENAS AS 3 AÇÕES: [ EDITAR ] [ BAIXAR ] [ EXCLUIR ] */}
      <div className="pt-4 mt-3 border-t border-slate-800/80 w-full">
        <div className="grid grid-cols-3 gap-2 w-full relative" ref={dropdownRef}>
          {/* AÇÃO 1: EDITAR */}
          <button
            id={`btn-edit-${qr.slug}`}
            type="button"
            onClick={() => onEdit(qr)}
            className="py-2.5 px-2 rounded-xl bg-[#050811] hover:bg-blue-950/50 text-blue-300 hover:text-blue-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-all border border-blue-500/30 cursor-pointer active:scale-98"
          >
            <Edit3 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <span>EDITAR</span>
          </button>

          {/* AÇÃO 2: BAIXAR (Com opções PNG e SVG) */}
          <div className="relative">
            <button
              id={`btn-download-${qr.slug}`}
              type="button"
              onClick={() => setDownloadMenuOpen((prev) => !prev)}
              className="w-full py-2.5 px-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center justify-center gap-1 transition-all shadow-md shadow-blue-600/30 cursor-pointer active:scale-98"
            >
              <Download className="w-3.5 h-3.5 shrink-0" />
              <span>BAIXAR</span>
              <ChevronDown className="w-3 h-3 opacity-80" />
            </button>

            {/* Menu Popover PNG / SVG */}
            {downloadMenuOpen && (
              <div
                id={`download-menu-${qr.slug}`}
                className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-48 bg-[#0d121f] border border-blue-500/40 rounded-xl shadow-2xl p-2 z-30 space-y-1 animate-fadeIn"
              >
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 py-1 border-b border-slate-800">
                  Formato de Download
                </div>
                <button
                  type="button"
                  onClick={handleDownloadPng}
                  className="w-full py-2 px-2.5 rounded-lg text-left text-xs font-semibold text-slate-200 hover:bg-blue-600 hover:text-white flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <FileImage className="w-3.5 h-3.5 text-blue-400" />
                  <div>
                    <span className="block font-bold">PNG</span>
                    <span className="text-[10px] text-slate-400 block -mt-0.5">Alta resolução</span>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadSvg}
                  className="w-full py-2 px-2.5 rounded-lg text-left text-xs font-semibold text-slate-200 hover:bg-blue-600 hover:text-white flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <FileCode className="w-3.5 h-3.5 text-cyan-400" />
                  <div>
                    <span className="block font-bold">SVG</span>
                    <span className="text-[10px] text-slate-400 block -mt-0.5">Vetorial para gráfica</span>
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* AÇÃO 3: EXCLUIR */}
          <button
            id={`btn-delete-${qr.slug}`}
            type="button"
            onClick={() => onDelete(qr)}
            className="py-2.5 px-2 rounded-xl bg-[#050811] hover:bg-red-950/50 text-red-400 hover:text-red-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-all border border-red-500/30 cursor-pointer active:scale-98"
          >
            <Trash2 className="w-3.5 h-3.5 text-red-400 shrink-0" />
            <span>EXCLUIR</span>
          </button>
        </div>
      </div>
    </div>
  );
}
