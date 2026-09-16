import { useState } from 'react';
import { doc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { DynamicQRCode } from '../types';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface DeleteConfirmModalProps {
  qr: DynamicQRCode | null;
  isOpen: boolean;
  onClose: () => void;
  onDeleted: (deletedId: string) => void;
}

export function DeleteConfirmModal({
  qr,
  isOpen,
  onClose,
  onDeleted,
}: DeleteConfirmModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !qr) return null;

  const handleDelete = async () => {
    try {
      setLoading(true);
      setError(null);
      const docRef = doc(db, 'dynamicQRCodes', qr.slug || qr.id);
      await deleteDoc(docRef);
      onDeleted(qr.slug || qr.id);
      onClose();
    } catch (err: any) {
      console.error('Erro ao excluir QR Code:', err);
      setError('Não foi possível excluir o QR Code. Verifique sua conexão e tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      id="modal-delete-confirm"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn"
    >
      <div
        id="modal-delete-content"
        className="w-full max-w-sm bg-[#0d121f] border border-red-500/40 rounded-2xl shadow-2xl p-6 text-slate-100 relative"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-200 rounded-lg cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-start gap-3 mb-3 text-red-400">
          <div className="w-10 h-10 rounded-xl bg-red-950/60 border border-red-500/40 flex items-center justify-center shrink-0 mt-0.5">
            <AlertTriangle className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">
              Excluir QR Code?
            </h3>
            <p className="text-xs text-red-300/90 mt-1 leading-relaxed">
              Se esse QR Code já estiver impresso, ele deixará de funcionar permanentemente.
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-950/60 border border-red-500/40 rounded-xl text-red-300 text-xs mb-3">
            {error}
          </div>
        )}

        <div className="bg-[#050811] p-3 rounded-xl border border-slate-800 text-xs space-y-1 mb-5">
          <div className="text-slate-400 text-[11px]">
            Nome: <strong className="text-white text-xs">{qr.name}</strong>
          </div>
          <div className="text-slate-500 text-[10px] font-mono">
            Código: <span className="text-blue-400">{qr.slug}</span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            id="btn-cancel-delete"
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
          >
            CANCELAR
          </button>
          <button
            id="btn-confirm-delete"
            type="button"
            onClick={handleDelete}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-lg shadow-red-600/30 disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Trash2 className="w-3.5 h-3.5" />
                <span>EXCLUIR</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
