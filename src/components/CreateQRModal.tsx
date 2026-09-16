import { useState, useEffect, type FormEvent } from 'react';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { DynamicQRCode } from '../types';
import {
  generateSlug,
  generateQRId,
  normalizeUrl,
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
} from 'lucide-react';

interface CreateQRModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (newQR: DynamicQRCode) => void;
}

export function CreateQRModal({ isOpen, onClose, onCreated }: CreateQRModalProps) {
  const [name, setName] = useState('');
  const [destinationUrl, setDestinationUrl] = useState('');
  const [active, setActive] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Success step state
  const [createdQR, setCreatedQR] = useState<DynamicQRCode | null>(null);
  const [qrPngUrl, setQrPngUrl] = useState<string | null>(null);
  const [qrSvgString, setQrSvgString] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setName('');
      setDestinationUrl('');
      setActive(true);
      setCreatedQR(null);
      setQrPngUrl(null);
      setQrSvgString(null);
      setError(null);
    }
  }, [isOpen]);

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

      // 1. Gerar slug único
      const slug = generateSlug(8);
      const qrId = generateQRId();

      // 2. Salvar no Firestore
      const qrData: DynamicQRCode = {
        id: qrId,
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
      const intermediateUrl = `${window.location.origin}/q/${slug}`;
      const [pngUrl, svgStr] = await Promise.all([
        generateQRCodeDataUrl(intermediateUrl, 1024),
        generateQRCodeSvg(intermediateUrl),
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

  const handleDownloadPng = () => {
    if (!qrPngUrl || !createdQR) return;
    const filename = getQRCodeFilename(createdQR.name, 'png');
    downloadDataUrl(qrPngUrl, filename);
  };

  const handleDownloadSvg = () => {
    if (!qrSvgString || !createdQR) return;
    const filename = getQRCodeFilename(createdQR.name, 'svg');
    downloadSvg(qrSvgString, filename);
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
                  placeholder="Ex: 001, Barbearia Jeann, Mesa 01"
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
                    placeholder="https://instagram.com/cliente"
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
                    <span>GERAR QR CODE</span>
                  )}
                </button>
              </div>
            </form>
          ) : (
            /* TELA DE SUCESSO E DOWNLOAD */
            <div className="space-y-4 text-center animate-fadeIn">
              <div className="p-3 bg-emerald-950/60 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs flex items-center justify-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="font-semibold">QR Code criado com sucesso!</span>
              </div>

              {/* Preview centralizado com quiet-zone */}
              <div className="flex justify-center my-2">
                <div className="p-4 bg-white rounded-2xl shadow-xl border border-slate-200/20 inline-block">
                  {qrPngUrl && (
                    <img
                      src={qrPngUrl}
                      alt={createdQR.name}
                      className="w-40 h-40 object-contain block"
                    />
                  )}
                </div>
              </div>

              <div className="bg-[#050811] p-3 rounded-xl border border-slate-800 text-left text-xs space-y-1">
                <div className="text-slate-400">
                  Nome: <strong className="text-white">{createdQR.name}</strong>
                </div>
                <div className="text-slate-400 truncate">
                  Destino: <span className="font-mono text-blue-300">{createdQR.destinationUrl}</span>
                </div>
              </div>

              {/* Opções de Download */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  id="btn-created-download-png"
                  type="button"
                  onClick={handleDownloadPng}
                  className="py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-blue-600/30 transition-all cursor-pointer active:scale-98"
                >
                  <FileImage className="w-4 h-4" />
                  <span>BAIXAR PNG</span>
                </button>

                <button
                  id="btn-created-download-svg"
                  type="button"
                  onClick={handleDownloadSvg}
                  className="py-2.5 px-3 rounded-xl bg-[#050811] hover:bg-slate-800 text-blue-300 hover:text-white border border-blue-500/40 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-98"
                >
                  <FileCode className="w-4 h-4 text-cyan-400" />
                  <span>BAIXAR SVG</span>
                </button>
              </div>

              <button
                id="btn-created-finish"
                type="button"
                onClick={onClose}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition-colors cursor-pointer"
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
