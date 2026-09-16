import { useState, useEffect, type FormEvent } from 'react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { DynamicQRCode } from '../types';
import { normalizeUrl } from '../utils/qr';
import {
  X,
  Edit3,
  Link as LinkIcon,
  ShieldCheck,
  CheckCircle2,
  Check,
} from 'lucide-react';

interface EditDestinationModalProps {
  qr: DynamicQRCode | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdated: (updatedQR: DynamicQRCode) => void;
}

export function EditDestinationModal({
  qr,
  isOpen,
  onClose,
  onUpdated,
}: EditDestinationModalProps) {
  const [name, setName] = useState('');
  const [destinationUrl, setDestinationUrl] = useState('');
  const [active, setActive] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (qr && isOpen) {
      setName(qr.name || '');
      setDestinationUrl(qr.destinationUrl || '');
      setActive(qr.active !== false);
      setError(null);
      setSuccess(false);
    }
  }, [qr, isOpen]);

  if (!isOpen || !qr) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    const cleanDest = normalizeUrl(destinationUrl.trim());

    if (!cleanName) {
      setError('Por favor, informe o nome do QR Code.');
      return;
    }

    if (!cleanDest || !cleanDest.startsWith('http')) {
      setError('Por favor, informe um link de destino válido (ex: https://...).');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Document reference in Firestore
      const docRef = doc(db, 'dynamicQRCodes', qr.slug || qr.id);

      // NUNCA alterar ID, slug ou createdAt!
      // Atualiza APENAS name, destinationUrl, active e updatedAt
      await updateDoc(docRef, {
        name: cleanName,
        destinationUrl: cleanDest,
        active: Boolean(active),
        updatedAt: serverTimestamp(),
      });

      const updatedObj: DynamicQRCode = {
        ...qr,
        name: cleanName,
        destinationUrl: cleanDest,
        active: Boolean(active),
        updatedAt: Date.now(),
      };

      setSuccess(true);
      onUpdated(updatedObj);

      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err: any) {
      console.error('Erro ao salvar alterações do QR Code:', err);
      setError('Não foi possível salvar as alterações no Firestore. Verifique sua conexão.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      id="modal-edit-qr"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto animate-fadeIn"
    >
      <div
        id="modal-edit-content"
        className="w-full max-w-md bg-[#0d121f] border border-blue-500/40 rounded-2xl shadow-2xl overflow-hidden relative text-slate-100 my-6"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-[#090d17]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
              <Edit3 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Editar QR Code</h3>
              <p className="text-[11px] text-slate-400">
                O QR Code já impresso continuará com o mesmo desenho
              </p>
            </div>
          </div>
          <button
            id="btn-close-edit-modal"
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div
              id="edit-error-alert"
              className="p-3 bg-red-950/70 border border-red-500/50 rounded-xl text-red-300 text-xs"
            >
              {error}
            </div>
          )}

          {success && (
            <div
              id="edit-success-alert"
              className="p-3 bg-emerald-950/70 border border-emerald-500/50 rounded-xl text-emerald-300 text-xs flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Alterações salvas com sucesso! O QR Code já aponta para o novo destino.</span>
            </div>
          )}

          {/* 1. Nome do QR Code */}
          <div>
            <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Nome do QR Code
            </label>
            <input
              id="input-edit-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: 001, Barbearia Jeann"
              className="w-full px-3.5 py-2.5 bg-[#050811] border border-slate-700 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-medium"
            />
          </div>

          {/* 2. Link de destino */}
          <div>
            <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Link de Destino
            </label>
            <div className="relative">
              <LinkIcon className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
              <input
                id="input-edit-destination"
                type="text"
                required
                value={destinationUrl}
                onChange={(e) => setDestinationUrl(e.target.value)}
                placeholder="https://instagram.com/cliente"
                className="w-full pl-10 pr-3.5 py-2.5 bg-[#050811] border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-mono"
              />
            </div>
          </div>

          {/* 3. Status (Ativo / Inativo) */}
          <div>
            <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Status
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setActive(true)}
                className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer border ${
                  active
                    ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300 shadow-md shadow-emerald-900/30'
                    : 'bg-[#050811] border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>Ativo</span>
                {active && <Check className="w-3.5 h-3.5 ml-1" />}
              </button>

              <button
                type="button"
                onClick={() => setActive(false)}
                className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer border ${
                  !active
                    ? 'bg-amber-950/80 border-amber-500 text-amber-300 shadow-md shadow-amber-900/30'
                    : 'bg-[#050811] border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span>Inativo</span>
                {!active && <Check className="w-3.5 h-3.5 ml-1" />}
              </button>
            </div>
          </div>

          {/* Nota de Segurança Permanente */}
          <div className="p-2.5 bg-blue-950/40 border border-blue-500/25 rounded-xl flex items-center gap-2 text-blue-300 text-[11px]">
            <ShieldCheck className="w-4 h-4 text-blue-400 shrink-0" />
            <span>
              Código permanente: <strong className="text-white font-mono">{qr.slug}</strong>. O QR impresso não muda.
            </span>
          </div>

          {/* Botões de Ação */}
          <div className="pt-2 flex items-center gap-2.5">
            <button
              id="btn-cancel-edit"
              type="button"
              onClick={onClose}
              className="w-1/3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              id="btn-submit-edit"
              type="submit"
              disabled={loading || success}
              className="flex-1 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-lg shadow-blue-600/30 transition-all active:scale-98 disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>SALVANDO...</span>
                </>
              ) : (
                <span>SALVAR ALTERAÇÕES</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
