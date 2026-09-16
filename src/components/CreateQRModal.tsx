import { useState, useEffect, useRef, type FormEvent } from 'react';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { DynamicQRCode } from '../types';
import {
  generateSlug,
  normalizeUrl,
  getDynamicQRUrl,
  generateQRCodeDataUrl,
  generateQRCodeSvg,
  getQRCodeFilename,
  downloadDataUrl,
  downloadSvg,
} from '../utils/qr';
import {
  X,
  QrCode,
  Link as LinkIcon,
  Download,
  FileCode,
  FileImage,
  CheckCircle2,
  Check,
  Copy,
  ExternalLink,
  Edit3,
  ChevronDown,
} from 'lucide-react';

interface CreateQRModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (newQR: DynamicQRCode) => void;
  onEdit?: (qr: DynamicQRCode) => void;
}

export function CreateQRModal({ isOpen, onClose, onCreated, onEdit }: CreateQRModalProps) {
  const [name, setName] = useState('');
  const [destinationUrl, setDestinationUrl] = useState('');
  const [active, setActive] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Success step state
  const [createdQR, setCreatedQR] = useState<DynamicQRCode | null>(null);
  const [qrPngUrl, setQrPngUrl] = useState<string | null>(null);
  const [qrSvgString, setQrSvgString] = useState<string | null>(null);
  const [copiedSlug, setCopiedSlug] = useState(false);
  const [downloadMenuOpen, setDownloadMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setName('');
      setDestinationUrl('');
      setActive(true);
      setCreatedQR(null);
      setQrPngUrl(null);
      setQrSvgString(null);
      setError(null);
      setCopiedSlug(false);
      setDownloadMenuOpen(false);
    }
  }, [isOpen]);

  // Close dropdown on outside click
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

  if (!isOpen) return null;

  const handleGenerate = async (e: FormEvent) => {
    e.preventDefault();
    const currentUser = auth.currentUser;
    if (!currentUser) {
      setError('Você precisa estar conectado para criar um QR Code.');
      return;
    }

    const cleanName = name.trim();
    const cleanDest = normalizeUrl(destinationUrl.trim());

    if (!cleanName) {
      setError('Informe o nome do QR Code.');
      return;
    }

    if (!cleanDest || !cleanDest.startsWith('http')) {
      setError('Informe um link de destino válido (ex: https://...).');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // 1. Gerar slug único permanente
      const slug = generateSlug(8);

      // 2. Salvar no Firestore
      const qrData: DynamicQRCode = {
        id: slug,
        userId: currentUser.uid,
        name: cleanName,
        slug: slug,
        destinationUrl: cleanDest,
        active: Boolean(active),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        scansCount: 0,
      };

      const docRef = doc(db, 'dynamicQRCodes', slug);
      await setDoc(docRef, qrData);

      // 3. Criar URL dinâmica permanente & gerar QR baseado exclusivamente nela
      const intermediateUrl = getDynamicQRUrl(slug);
      const [pngUrl, svgStr] = await Promise.all([
        generateQRCodeDataUrl(intermediateUrl, cleanName, 1024),
        generateQRCodeSvg(intermediateUrl, cleanName),
      ]);

      setQrPngUrl(pngUrl);
      setQrSvgString(svgStr);
      setCreatedQR(qrData);

      // 4. Adicionar automaticamente à lista
      onCreated(qrData);
    } catch (err: any) {
      console.error('Erro ao gerar QR Code:', err);
      setError('Erro ao salvar no Firestore. Verifique sua conexão e tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopySlug = async () => {
    if (!createdQR) return;
    try {
      const dynamicUrl = getDynamicQRUrl(createdQR.slug);
      await navigator.clipboard.writeText(dynamicUrl);
      setCopiedSlug(true);
      setTimeout(() => setCopiedSlug(false), 2000);
    } catch {
      // ignore
    }
  };

  const handleDownloadPng = () => {
    if (!qrPngUrl || !createdQR) return;
    const filename = getQRCodeFilename(createdQR.name, 'png');
    downloadDataUrl(qrPngUrl, filename);
    setDownloadMenuOpen(false);
  };

  const handleDownloadSvg = () => {
    if (!qrSvgString || !createdQR) return;
    const filename = getQRCodeFilename(createdQR.name, 'svg');
    downloadSvg(qrSvgString, filename);
    setDownloadMenuOpen(false);
  };

  const handleEditCreated = () => {
    if (!createdQR) return;
    onClose();
    if (onEdit) {
      onEdit(createdQR);
    }
  };

  return (
    <div
      id="modal-create-qr"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto animate-fadeIn"
    >
      <div
        id="modal-create-content"
        className="w-full max-w-md bg-[#0d121f] border border-blue-500/40 rounded-2xl shadow-2xl overflow-hidden relative text-slate-100 my-6"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-[#090d17]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
              <QrCode className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">
                {createdQR ? 'QR Code Gerado!' : 'Novo QR Code'}
              </h3>
              <p className="text-[11px] text-slate-400">
                {createdQR
                  ? 'Pronto para download e impressão'
                  : 'O destino pode ser alterado a qualquer momento'}
              </p>
            </div>
          </div>
          <button
            id="btn-close-create-modal"
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5">
          {!createdQR ? (
            /* FORMULÁRIO SIMPLES */
            <form onSubmit={handleGenerate} className="space-y-4">
              {error && (
                <div
                  id="create-error-alert"
                  className="p-3 bg-red-950/70 border border-red-500/50 rounded-xl text-red-300 text-xs"
                >
                  {error}
                </div>
              )}

              {/* Nome do QR Code */}
              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Nome do QR Code
                </label>
                <input
                  id="input-create-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex.: Instagram Cliente João"
                  className="w-full px-3.5 py-2.5 bg-[#050811] border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-medium"
                />
              </div>

              {/* Link de destino */}
              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Link de Destino
                </label>
                <div className="relative">
                  <LinkIcon className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                  <input
                    id="input-create-destination"
                    type="text"
                    required
                    value={destinationUrl}
                    onChange={(e) => setDestinationUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full pl-10 pr-3.5 py-2.5 bg-[#050811] border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-mono"
                  />
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Status
                </label>
                <div className="flex items-center gap-2 bg-[#050811] border border-slate-800 p-2.5 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setActive(!active)}
                    className="flex items-center gap-2 cursor-pointer w-full text-left"
                  >
                    <span
                      className={`w-3 h-3 rounded-full ${
                        active ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                      }`}
                    />
                    <span className="text-xs font-bold text-slate-200">
                      {active ? '● Ativo' : '● Inativo'}
                    </span>
                    <span className="text-[10px] text-slate-500 ml-auto">
                      (clique para alternar)
                    </span>
                  </button>
                </div>
              </div>

              {/* Botões de Envio */}
              <div className="pt-2 flex items-center gap-2.5">
                <button
                  id="btn-cancel-create"
                  type="button"
                  onClick={onClose}
                  className="w-1/3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  id="btn-submit-create"
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 transition-all active:scale-98 disabled:opacity-50 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>GERANDO...</span>
                    </>
                  ) : (
                    <span>GERAR QR CODE DINÂMICO</span>
                  )}
                </button>
              </div>
            </form>
          ) : (
            /* TELA DE SUCESSO: [QR CODE] Nome | Destino atual | Código permanente | Baixar | Editar | Testar */
            <div className="space-y-4 text-center animate-fadeIn">
              <div className="p-2.5 bg-emerald-950/60 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs flex items-center justify-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="font-semibold">QR Code criado com sucesso!</span>
              </div>

              {/* [QR CODE] Preview com borda e quiet-zone */}
              <div className="flex justify-center my-1">
                <div className="p-3.5 bg-white rounded-2xl shadow-xl border border-slate-200/20 inline-block">
                  {qrPngUrl && (
                    <img
                      src={qrPngUrl}
                      alt={createdQR.name}
                      className="w-36 h-36 object-contain block"
                    />
                  )}
                </div>
              </div>

              {/* Informações: Nome, Destino atual, Código permanente */}
              <div className="bg-[#050811] p-3 rounded-xl border border-slate-800 text-left text-xs space-y-1.5">
                <div>
                  <span className="text-slate-500 text-[11px] block">Nome:</span>
                  <strong className="text-white text-sm font-bold">{createdQR.name}</strong>
                </div>
                <div>
                  <span className="text-slate-500 text-[11px] block">Destino atual:</span>
                  <span className="font-mono text-blue-300 text-xs break-all">{createdQR.destinationUrl}</span>
                </div>
                <div className="pt-1 flex items-center justify-between border-t border-slate-800/80">
                  <div>
                    <span className="text-slate-500 text-[11px] block">Código permanente:</span>
                    <span className="font-mono text-emerald-400 font-bold text-xs bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-500/30 inline-block">
                      {createdQR.slug}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopySlug}
                    className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1 cursor-pointer py-1 px-2 rounded bg-slate-800/80 hover:bg-slate-800"
                  >
                    {copiedSlug ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copiar link</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Ações solicitadas: Baixar | Editar | Testar */}
              <div className="grid grid-cols-3 gap-2 pt-1">
                {/* 1. Baixar */}
                <div className="relative" ref={dropdownRef}>
                  <button
                    id="btn-created-download"
                    type="button"
                    onClick={() => setDownloadMenuOpen((prev) => !prev)}
                    className="w-full py-2.5 px-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-1 shadow-md shadow-blue-600/30 transition-all cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Baixar</span>
                    <ChevronDown className="w-3 h-3 opacity-80" />
                  </button>

                  {downloadMenuOpen && (
                    <div className="absolute left-0 bottom-full mb-1.5 w-44 bg-[#0d121f] border border-blue-500/40 rounded-xl shadow-2xl p-1.5 z-30 space-y-1 text-left">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 py-0.5 border-b border-slate-800">
                        Formato
                      </div>
                      <button
                        type="button"
                        onClick={handleDownloadPng}
                        className="w-full py-1.5 px-2 rounded-lg text-left text-xs font-medium text-slate-200 hover:bg-blue-600 hover:text-white flex items-center gap-2 transition-colors cursor-pointer"
                      >
                        <FileImage className="w-3.5 h-3.5 text-blue-400" />
                        <span>PNG (Alta res)</span>
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

                {/* 2. Editar */}
                <button
                  id="btn-created-edit"
                  type="button"
                  onClick={handleEditCreated}
                  className="py-2.5 px-2 rounded-xl bg-[#050811] hover:bg-slate-800 text-slate-200 border border-slate-700 hover:border-slate-500 font-semibold text-xs flex items-center justify-center gap-1 transition-all cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5 text-blue-400" />
                  <span>Editar</span>
                </button>

                {/* 3. Testar */}
                <a
                  id="btn-created-test"
                  href={createdQR.destinationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-2.5 px-2 rounded-xl bg-[#050811] hover:bg-slate-800 text-slate-200 border border-slate-700 hover:border-slate-500 font-semibold text-xs flex items-center justify-center gap-1 transition-all cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Testar</span>
                </a>
              </div>

              <button
                id="btn-created-finish"
                type="button"
                onClick={onClose}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-colors cursor-pointer"
              >
                Concluir
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
