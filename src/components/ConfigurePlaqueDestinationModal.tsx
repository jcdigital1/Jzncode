import React, { useState, useEffect } from 'react';
import { doc, updateDoc, increment, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { DynamicQRCode } from '../types';
import { normalizeUrl, getDynamicQRUrl } from '../utils/qr';
import {
  X,
  Link as LinkIcon,
  CheckCircle,
  AlertCircle,
  QrCode,
  Sparkles,
  ExternalLink,
  Copy,
  Check,
} from 'lucide-react';

interface ConfigurePlaqueDestinationModalProps {
  isOpen: boolean;
  onClose: () => void;
  qr: DynamicQRCode | null;
  onUpdated?: () => void;
}

export function ConfigurePlaqueDestinationModal({
  isOpen,
  onClose,
  qr,
  onUpdated,
}: ConfigurePlaqueDestinationModalProps) {
  const [clientName, setClientName] = useState('');
  const [destinationUrl, setDestinationUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  useEffect(() => {
    if (qr) {
      setClientName(qr.clientName || '');
      setDestinationUrl(qr.destinationUrl || '');
      setErrorMessage(null);
      setSuccess(false);
    }
  }, [qr]);

  if (!isOpen || !qr) return null;

  const dynamicUrl = getDynamicQRUrl(qr.slug);
  const isAvailable = qr.status === 'available' || !qr.destinationUrl;

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(dynamicUrl);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } catch {
      // ignore
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!destinationUrl.trim()) {
      setErrorMessage('Por favor, informe o link de destino.');
      return;
    }

    const normalizedDest = normalizeUrl(destinationUrl);
    setLoading(true);
    setErrorMessage(null);

    try {
      // Regra crítica: NUNCA gera novo slug, NUNCA altera batchId ou sequenceNumber!
      const qrDocRef = doc(db, 'dynamicQRCodes', qr.slug || qr.id);

      const updates: any = {
        destinationUrl: normalizedDest,
        clientName: clientName.trim() || qr.clientName || '',
        status: 'active',
        active: true,
        updatedAt: serverTimestamp(),
      };

      await updateDoc(qrDocRef, updates);

      // Se era um QR que estava como Disponível, atualiza o contador no lote
      if (isAvailable && qr.batchId) {
        try {
          const batchDocRef = doc(db, 'qrBatches', qr.batchId);
          await updateDoc(batchDocRef, {
            availableCount: increment(-1),
            configuredCount: increment(1),
            updatedAt: serverTimestamp(),
          });
        } catch (e) {
          console.warn('Aviso ao atualizar contadores do lote:', e);
        }
      }

      setSuccess(true);
      if (onUpdated) onUpdated();
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      console.error('Erro ao configurar destino do QR Code:', err);
      setErrorMessage(err.message || 'Falha ao salvar configurações.');
    } finally {
      setLoading(false);
    }
  };

  const seqFormatted = String(qr.sequenceNumber || 1).padStart(3, '0');

  return (
    <div
      id="configure-plaque-modal-overlay"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
    >
      <div
        id="configure-plaque-modal-content"
        className="bg-[#0d121f] border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-fadeIn my-auto text-slate-100"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-[#111827]/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <QrCode className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white">
                {isAvailable ? 'CONFIGURAR DESTINO' : 'EDITAR DESTINO'}
              </h2>
              <p className="text-[11px] text-slate-400">
                Plaquinha {qr.name} ({seqFormatted})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Informações Técnicas Fixas */}
        <div className="bg-[#050811] px-5 py-3 border-b border-slate-800/80 space-y-1.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Código Permanente:</span>
            <span className="font-mono text-blue-400 font-bold bg-blue-950/40 px-2 py-0.5 rounded border border-blue-500/30">
              {qr.slug}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Status Atual:</span>
            <span className={`font-semibold ${isAvailable ? 'text-slate-300' : 'text-emerald-400'}`}>
              {isAvailable ? '⚪ DISPONÍVEL' : '🟢 CONFIGURADO / ATIVO'}
            </span>
          </div>
          <div className="flex items-center justify-between pt-1">
            <span className="text-slate-500 text-[11px] truncate max-w-[200px]">
              {dynamicUrl}
            </span>
            <button
              type="button"
              onClick={handleCopyUrl}
              className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1 cursor-pointer"
            >
              {copiedUrl ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copiedUrl ? 'Copiado!' : 'Copiar URL'}</span>
            </button>
          </div>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSave} className="p-5 space-y-4">
          {errorMessage && (
            <div className="p-3 bg-red-950/40 border border-red-500/30 rounded-xl flex items-center gap-2 text-xs text-red-300">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {success && (
            <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-xl flex items-center gap-2 text-xs text-emerald-300">
              <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>Destino configurado com sucesso! O mesmo QR já aponta para ele.</span>
            </div>
          )}

          {/* Nome do Cliente */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 block">
              NOME DO CLIENTE OU EMPRESA
            </label>
            <input
              type="text"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Ex: Barbearia Carlos ou Loja Centro"
              className="w-full bg-[#050811] border border-slate-700/80 focus:border-blue-500 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-slate-600 outline-none transition-colors"
            />
            <p className="text-[10px] text-slate-500">
              Identifica quem comprou ou está usando esta plaquinha.
            </p>
          </div>

          {/* Link de Destino */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 block">
              LINK DE DESTINO FINAL *
            </label>
            <div className="relative">
              <LinkIcon className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={destinationUrl}
                onChange={(e) => setDestinationUrl(e.target.value)}
                placeholder="https://instagram.com/cliente ou link do Google"
                className="w-full bg-[#050811] border border-slate-700/80 focus:border-blue-500 rounded-xl pl-9 pr-3.5 py-2.5 text-sm text-white placeholder:text-slate-600 outline-none transition-colors"
              />
            </div>
            <p className="text-[10px] text-slate-500">
              O link que abrirá imediatamente quando a plaquinha for escaneada.
            </p>
          </div>

          <div className="bg-blue-950/20 border border-blue-500/20 rounded-xl p-3 text-[11px] text-slate-400 flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <span>
              <strong>Garantia Dinâmica:</strong> O QR Code impresso e seu código permanente não se alteram. Apenas o redirecionamento é atualizado.
            </span>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl border border-slate-800 text-slate-300 hover:text-white text-xs font-semibold cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-blue-600/30 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : (
                <span>SALVAR DESTINO</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
