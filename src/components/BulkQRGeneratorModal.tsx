import { useState } from 'react';
import { collection, doc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { User } from 'firebase/auth';
import { generateSlug } from '../utils/qr';
import { QRBatch } from '../types';
import {
  X,
  Layers,
  CheckCircle,
  AlertCircle,
  Hash,
  Sparkles,
  ArrowRight,
  Info,
} from 'lucide-react';

interface BulkQRGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  onBatchCreated: (batch: QRBatch) => void;
}

export function BulkQRGeneratorModal({
  isOpen,
  onClose,
  user,
  onBatchCreated,
}: BulkQRGeneratorModalProps) {
  // Form fields
  const [batchName, setBatchName] = useState('Plaquinhas Google — Lote 01');
  const [quantity, setQuantity] = useState<number>(25);
  const [prefix, setPrefix] = useState('Google');

  // Flow states
  const [step, setStep] = useState<'form' | 'confirm' | 'progress' | 'success'>('form');
  const [progressCount, setProgressCount] = useState(0);
  const [createdBatch, setCreatedBatch] = useState<QRBatch | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const padLength = Math.max(3, String(quantity).length);
  const formatSeq = (num: number) => String(num).padStart(padLength, '0');

  const handleQuickQty = (q: number) => {
    setQuantity(Math.min(100, Math.max(1, q)));
  };

  const handleStartGeneration = async () => {
    if (!batchName.trim()) {
      setErrorMessage('Por favor, informe um nome para o lote.');
      return;
    }
    if (quantity < 1 || quantity > 100) {
      setErrorMessage('A quantidade deve ser entre 1 e 100.');
      return;
    }

    setErrorMessage(null);
    setStep('progress');
    setProgressCount(0);

    try {
      const batchId = `batch_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      const cleanPrefix = (prefix.trim() || 'Plaquinha').trim();
      const cleanBatchName = batchName.trim();

      // Batch document ref
      const batchDocRef = doc(db, 'qrBatches', batchId);

      // Usamos writeBatch do Firestore (suporta até 500 operações atômicas)
      const firestoreBatch = writeBatch(db);

      // Criamos registro do lote
      const batchData = {
        id: batchId,
        userId: user.uid,
        name: cleanBatchName,
        prefix: cleanPrefix,
        quantity: quantity,
        availableCount: quantity,
        configuredCount: 0,
        startNumber: 1,
        endNumber: quantity,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      firestoreBatch.set(batchDocRef, batchData);

      // Geramos cada QR Code com código permanente ÚNICO e aleatório (não sequencial)
      const usedSlugs = new Set<string>();

      for (let i = 1; i <= quantity; i++) {
        let uniqueSlug = generateSlug(8);
        while (usedSlugs.has(uniqueSlug)) {
          uniqueSlug = generateSlug(8);
        }
        usedSlugs.add(uniqueSlug);

        const seqFormatted = formatSeq(i);
        const qrName = `${cleanPrefix} ${seqFormatted}`;
        const qrDocRef = doc(db, 'dynamicQRCodes', uniqueSlug);

        firestoreBatch.set(qrDocRef, {
          id: uniqueSlug,
          userId: user.uid,
          name: qrName,
          slug: uniqueSlug,
          destinationUrl: '', // Inicialmente vazio (sem link falso)
          active: true,
          status: 'available', // ⚪ DISPONÍVEL
          creationMode: 'bulk',
          batchId: batchId,
          batchName: cleanBatchName,
          sequenceNumber: i,
          prefix: cleanPrefix,
          scansCount: 0,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        // Atualização visual do progresso
        setProgressCount(i);
      }

      // Commit atômico
      await firestoreBatch.commit();

      const batchObj: QRBatch = {
        id: batchId,
        userId: user.uid,
        name: cleanBatchName,
        prefix: cleanPrefix,
        quantity: quantity,
        availableCount: quantity,
        configuredCount: 0,
        startNumber: 1,
        endNumber: quantity,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      setCreatedBatch(batchObj);
      setStep('success');
    } catch (err: any) {
      console.error('Erro ao gerar lote de QR Codes:', err);
      setErrorMessage(err.message || 'Falha ao gravar lote no banco de dados. Tente novamente.');
      setStep('form');
    }
  };

  const handleClose = () => {
    setStep('form');
    setErrorMessage(null);
    onClose();
  };

  const handleFinishViewBatch = () => {
    if (createdBatch) {
      onBatchCreated(createdBatch);
    }
    handleClose();
  };

  return (
    <div
      id="bulk-qr-modal-overlay"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
    >
      <div
        id="bulk-qr-modal-content"
        className="bg-[#0d121f] border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-fadeIn my-auto text-slate-100"
      >
        {/* CABEÇALHO DO MODAL */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-[#111827]/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white">
                GERAR QR CODES EM MASSA
              </h2>
              <p className="text-[11px] text-slate-400">
                Para produção de plaquinhas físicas
              </p>
            </div>
          </div>
          {step !== 'progress' && (
            <button
              type="button"
              onClick={handleClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* ========================================================
            ETAPA 1: FORMULÁRIO DE CONFIGURAÇÃO DO LOTE
           ======================================================== */}
        {step === 'form' && (
          <div className="p-5 space-y-4">
            <p className="text-xs text-slate-400 leading-relaxed">
              Crie vários QR Codes dinâmicos de uma só vez para utilizar posteriormente em suas plaquinhas.
            </p>

            {errorMessage && (
              <div className="p-3 bg-red-950/40 border border-red-500/30 rounded-xl flex items-center gap-2 text-xs text-red-300">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* 1. Nome do Lote */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 block">
                NOME DO LOTE
              </label>
              <input
                type="text"
                value={batchName}
                onChange={(e) => setBatchName(e.target.value)}
                placeholder="Ex: Plaquinhas Google — Lote 01"
                className="w-full bg-[#050811] border border-slate-700/80 focus:border-blue-500 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-slate-600 outline-none transition-colors"
              />
              <p className="text-[10px] text-slate-500">
                Este nome servirá para organizar e localizar os QR Codes criados juntos.
              </p>
            </div>

            {/* 2. Prefixo */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 block">
                PREFIXO DA PLAQUINHA
              </label>
              <input
                type="text"
                value={prefix}
                onChange={(e) => setPrefix(e.target.value)}
                placeholder="Ex: Google ou Plaquinha"
                className="w-full bg-[#050811] border border-slate-700/80 focus:border-blue-500 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-slate-600 outline-none transition-colors"
              />
              <p className="text-[10px] text-slate-500">
                Identificação visual: {prefix || 'Plaquinha'} {formatSeq(1)}, {prefix || 'Plaquinha'} {formatSeq(2)}...
              </p>
            </div>

            {/* 3. Quantidade */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300">
                  QUANTIDADE DE QR CODES (1 a 100)
                </label>
                <span className="font-mono text-xs font-bold text-blue-400">
                  {quantity} unidades
                </span>
              </div>

              {/* Botões de atalho rápido */}
              <div className="grid grid-cols-4 gap-2">
                {[10, 25, 50, 100].map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => handleQuickQty(q)}
                    className={`py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                      quantity === q
                        ? 'bg-blue-600 border-blue-500 text-white'
                        : 'bg-[#050811] border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    {q}
                  </button>
                ))}
              </div>

              {/* Input manual */}
              <input
                type="number"
                min={1}
                max={100}
                value={quantity || ''}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  setQuantity(isNaN(val) ? 0 : Math.min(100, Math.max(1, val)));
                }}
                className="w-full bg-[#050811] border border-slate-700/80 focus:border-blue-500 rounded-xl px-3.5 py-2 text-sm text-white outline-none"
              />
            </div>

            {/* PREVIEW DO LOTE */}
            <div className="bg-[#050811] border border-slate-800 rounded-xl p-3.5 space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-300 font-semibold border-b border-slate-800/80 pb-2">
                <span>Resumo do Lote</span>
                <span className="text-blue-400 font-mono">
                  {formatSeq(1)} → {formatSeq(quantity)}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400">
                <div>
                  <span className="text-slate-500 block">Identificação:</span>
                  <span className="text-white font-medium">
                    {prefix || 'Plaquinha'} {formatSeq(1)} até {formatSeq(quantity)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Status inicial:</span>
                  <span className="text-slate-300 font-medium">
                    ⚪ Disponível (sem cliente)
                  </span>
                </div>
              </div>
              <div className="flex items-start gap-1.5 pt-1 text-[11px] text-slate-400">
                <Info className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                <span>
                  Cada QR receberá um código permanente único e aleatório. O link de destino poderá ser configurado posteriormente conforme cada plaquinha for vendida.
                </span>
              </div>
            </div>

            {/* Ações */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2.5 rounded-xl border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800/60 text-xs font-semibold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => setStep('confirm')}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-blue-600/30 cursor-pointer"
              >
                <span>GERAR {quantity} QR CODES</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* ========================================================
            ETAPA 2: CONFIRMAÇÃO DE SEGURANÇA
           ======================================================== */}
        {step === 'confirm' && (
          <div className="p-5 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/30 text-blue-400 flex items-center justify-center mx-auto">
              <Layers className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-white">
                Deseja criar {quantity} QR Codes dinâmicos?
              </h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                Cada QR receberá um código permanente próprio e será salvo na sua conta com status{' '}
                <strong className="text-slate-200">Disponível</strong>.
              </p>
            </div>

            <div className="bg-[#050811] border border-slate-800 rounded-xl p-3 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-400">Lote:</span>
                <span className="font-semibold text-white">{batchName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Faixa:</span>
                <span className="font-mono text-blue-400 font-bold">
                  {formatSeq(1)} até {formatSeq(quantity)}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setStep('form')}
                className="px-4 py-2.5 rounded-xl border border-slate-800 text-slate-300 hover:text-white text-xs font-semibold cursor-pointer"
              >
                Voltar e alterar
              </button>
              <button
                type="button"
                onClick={handleStartGeneration}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-600/30 cursor-pointer"
              >
                <span>GERAR LOTE</span>
              </button>
            </div>
          </div>
        )}

        {/* ========================================================
            ETAPA 3: PROGRESSO DE GERAÇÃO
           ======================================================== */}
        {step === 'progress' && (
          <div className="p-8 space-y-5 text-center">
            <div className="w-12 h-12 border-3 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mx-auto" />
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">
                Criando QR Codes... {progressCount} / {quantity}
              </h3>
              <p className="text-xs text-slate-400">
                Gravando códigos permanentes e gerando lote atômico no banco de dados.
              </p>
            </div>

            {/* Barra de progresso */}
            <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-blue-500 h-2.5 rounded-full transition-all duration-150"
                style={{ width: `${Math.round((progressCount / quantity) * 100)}%` }}
              />
            </div>
            <span className="text-[11px] font-mono text-blue-400">
              {Math.round((progressCount / quantity) * 100)}% concluído
            </span>
          </div>
        )}

        {/* ========================================================
            ETAPA 4: RESULTADO DO LOTE CRIADO COM SUCESSO
           ======================================================== */}
        {step === 'success' && createdBatch && (
          <div className="p-6 space-y-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                ✓ Lote Criado com Sucesso
              </span>
              <h3 className="text-base font-bold text-white">
                {createdBatch.name}
              </h3>
              <p className="text-xs text-slate-400">
                {createdBatch.quantity} QR Codes dinâmicos foram gerados e salvos.
              </p>
            </div>

            {/* Resumo compacto */}
            <div className="grid grid-cols-3 gap-2 bg-[#050811] border border-slate-800 rounded-xl p-3 text-center">
              <div>
                <span className="text-[10px] text-slate-400 block font-semibold">Total</span>
                <span className="text-lg font-black text-white">{createdBatch.quantity}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-300 block font-semibold">⚪ Disponíveis</span>
                <span className="text-lg font-black text-slate-300">{createdBatch.quantity}</span>
              </div>
              <div>
                <span className="text-[10px] text-emerald-400 block font-semibold">🟢 Configurados</span>
                <span className="text-lg font-black text-emerald-400">0</span>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleFinishViewBatch}
                className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md shadow-blue-600/30 cursor-pointer"
              >
                <span>VER LOTE</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
