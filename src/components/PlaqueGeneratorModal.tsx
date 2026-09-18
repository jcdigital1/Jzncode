import React, { useState, useEffect, useMemo, useRef } from 'react';
import { QRBatch, DynamicQRCode, PlaqueTemplate, PrintJob } from '../types';
import { PLAQUE_TEMPLATES, getTemplateById } from '../data/templates';
import {
  generatePlaquesPDF,
  validateBatchForPrinting,
  renderPlaqueDataUrl,
} from '../utils/plaquePdf';
import { db } from '../firebase';
import { collection, doc, setDoc, updateDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
import {
  Printer,
  X,
  ChevronRight,
  ChevronLeft,
  Check,
  AlertTriangle,
  ZoomIn,
  Download,
  Layers,
  Sparkles,
  FileText,
  Scissors,
  CheckCircle2,
  Upload,
  RefreshCw,
} from 'lucide-react';

interface PlaqueGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  batch: QRBatch;
  allBatchQRCodes: DynamicQRCode[];
  userId: string;
  onPrintCompleted?: () => void;
}

export function PlaqueGeneratorModal({
  isOpen,
  onClose,
  batch,
  allBatchQRCodes,
  userId,
  onPrintCompleted,
}: PlaqueGeneratorModalProps) {
  // Passos: 1 = MODELO, 2 = QUANTIDADE, 3 = RESUMO/VALIDAÇÃO, 4 = PRÉVIA, 5 = GERANDO PDF
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  // 1. Modelo selecionado
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('template-01-azul');
  const [customImageFile, setCustomImageFile] = useState<File | null>(null);
  const [customImageElement, setCustomImageElement] = useState<HTMLImageElement | null>(null);

  // 2. Quantidade e intervalo
  const [pageCount, setPageCount] = useState<number>(1);
  const [startSequence, setStartSequence] = useState<number>(batch.startNumber || 1);
  const [showCutLines, setShowCutLines] = useState<boolean>(true);

  // 4. Navegação na Prévia
  const [previewPageIndex, setPreviewPageIndex] = useState<number>(0);
  const [previewCanvasUrls, setPreviewCanvasUrls] = useState<string[]>([]);
  const [isLoadingPreview, setIsLoadingPreview] = useState<boolean>(false);
  const [isZoomOpen, setIsZoomOpen] = useState<boolean>(false);

  // 5. Geração de PDF e Progresso
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [progressStatusText, setProgressStatusText] = useState<string>('');
  const [pdfCompleted, setPdfCompleted] = useState<boolean>(false);
  const [generatedFilename, setGeneratedFilename] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Template ativo
  const activeTemplate = useMemo(() => {
    return getTemplateById(selectedTemplateId);
  }, [selectedTemplateId]);

  // Lista ordenada de QR Codes do lote
  const sortedBatchQRs = useMemo(() => {
    return [...allBatchQRCodes].sort(
      (a, b) => (a.sequenceNumber || 0) - (b.sequenceNumber || 0)
    );
  }, [allBatchQRCodes]);

  // Total de placas a imprimir
  const plateCount = pageCount * 3;
  const endSequence = startSequence + plateCount - 1;

  // Lote limite superior
  const batchMaxSequence = useMemo(() => {
    if (sortedBatchQRs.length === 0) return batch.quantity || 100;
    return sortedBatchQRs[sortedBatchQRs.length - 1].sequenceNumber || batch.quantity || 100;
  }, [sortedBatchQRs, batch.quantity]);

  // Validação do intervalo
  const isIntervalExceeded = endSequence > batchMaxSequence;

  // QR Codes selecionados para o intervalo
  const selectedQRCodesForPrint = useMemo(() => {
    return sortedBatchQRs.filter((qr) => {
      const seq = qr.sequenceNumber || 0;
      return seq >= startSequence && seq <= endSequence;
    });
  }, [sortedBatchQRs, startSequence, endSequence]);

  // Validação rigorosa
  const validation = useMemo(() => {
    return validateBatchForPrinting(selectedQRCodesForPrint, startSequence, endSequence);
  }, [selectedQRCodesForPrint, startSequence, endSequence]);

  // Redefine quando o modal abre
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(1);
      setPageCount(1);
      setStartSequence(batch.startNumber || 1);
      setPreviewPageIndex(0);
      setPdfCompleted(false);
      setProgressPercent(0);
      setPreviewCanvasUrls([]);
    }
  }, [isOpen, batch]);

  // Carrega imagem customizada se o usuário enviar
  const handleCustomImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCustomImageFile(file);
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      setCustomImageElement(img);
    };
    img.src = url;
  };

  // Ajusta automaticamente a quantidade para o máximo disponível no lote
  const handleAdjustToMax = () => {
    const availablePlates = Math.max(0, batchMaxSequence - startSequence + 1);
    const maxPages = Math.max(1, Math.floor(availablePlates / 3));
    setPageCount(maxPages);
  };

  // Carrega a prévia da folha A4 quando entrar no Step 4
  useEffect(() => {
    if (currentStep === 4 && selectedQRCodesForPrint.length > 0) {
      loadPreviewPage(previewPageIndex);
    }
  }, [currentStep, previewPageIndex, selectedTemplateId, customImageElement]);

  const loadPreviewPage = async (pageIdx: number) => {
    setIsLoadingPreview(true);
    try {
      const startIndex = pageIdx * 3;
      const pageQRs = selectedQRCodesForPrint.slice(startIndex, startIndex + 3);

      const urls: string[] = [];
      for (const qr of pageQRs) {
        const url = await renderPlaqueDataUrl(qr, activeTemplate, customImageElement);
        urls.push(url);
      }
      setPreviewCanvasUrls(urls);
    } catch (err) {
      console.error('Erro ao gerar prévia da folha:', err);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  // Executa a geração do PDF e registro no Firestore
  const handleGeneratePDF = async () => {
    if (!validation.valid) {
      alert(`Atenção: Não é possível gerar o PDF devido a inconsistências:\n${validation.errors.join('\n')}`);
      return;
    }

    setCurrentStep(5);
    setIsGeneratingPdf(true);
    setProgressPercent(5);
    setProgressStatusText('Iniciando composição de alta resolução...');

    try {
      // 1. Gera o PDF A4 multipágina
      const { doc: pdfDoc, filename } = await generatePlaquesPDF({
        batchName: batch.name,
        template: activeTemplate,
        qrCodes: selectedQRCodesForPrint,
        pageCount,
        platesPerPage: 3,
        showCutLines,
        customImage: customImageElement,
        onProgress: (percent, current, total) => {
          setProgressPercent(Math.min(92, Math.max(10, percent)));
          setProgressStatusText(`Renderizando placa ${current} de ${total}...`);
        },
      });

      setGeneratedFilename(filename);
      setProgressStatusText('Finalizando arquivo e registrando histórico...');
      setProgressPercent(95);

      // 2. Salva o PDF no dispositivo do usuário
      pdfDoc.save(filename);

      // 3. Registra o PrintJob no Firestore para histórico
      const printJobId = `PJ_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const jobRef = doc(db, 'printJobs', printJobId);
      const printJobData: PrintJob = {
        id: printJobId,
        userId,
        batchId: batch.id,
        batchName: batch.name,
        templateId: activeTemplate.id,
        templateName: activeTemplate.name,
        startSequence,
        endSequence,
        pageCount,
        plateCount: selectedQRCodesForPrint.length,
        createdAt: serverTimestamp(),
      };
      await setDoc(jobRef, printJobData);

      // 4. Marca status visual 'printed: true' e 'lastPrintedAt' nos QR Codes participantes
      try {
        const batchOp = writeBatch(db);
        selectedQRCodesForPrint.forEach((qr) => {
          const qrRef = doc(db, 'dynamicQRCodes', qr.id);
          batchOp.update(qrRef, {
            printed: true,
            lastPrintedAt: serverTimestamp(),
          });
        });
        await batchOp.commit();
      } catch (markErr) {
        console.warn('Aviso ao marcar status impresso nos QR codes:', markErr);
      }

      setProgressPercent(100);
      setProgressStatusText('PDF gerado com sucesso!');
      setPdfCompleted(true);

      if (onPrintCompleted) {
        onPrintCompleted();
      }
    } catch (err: any) {
      console.error('Erro ao gerar PDF de plaquinhas:', err);
      alert(`Falha ao gerar o PDF: ${err?.message || 'Erro desconhecido'}`);
      setCurrentStep(4);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto animate-fadeIn">
      <div className="bg-[#0b101b] border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* CABEÇALHO */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-[#0e1424]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 shrink-0">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
                <span>GERAR PLAQUINHAS PARA IMPRESSÃO</span>
                <span className="text-[10px] font-mono uppercase bg-blue-950/60 border border-blue-500/30 text-blue-400 px-2 py-0.5 rounded">
                  A4 • 3 POR FOLHA
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Escolha uma arte e gere suas plaquinhas com QR Codes dinâmicos automaticamente.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* STEPPER DE ETAPAS (1 a 5) */}
        <div className="px-4 py-2.5 border-b border-slate-800/80 bg-[#070b14] flex items-center justify-between gap-1 sm:gap-2 overflow-x-auto text-xs">
          {[
            { step: 1, label: '1 — MODELO' },
            { step: 2, label: '2 — QUANTIDADE' },
            { step: 3, label: '3 — RESUMO' },
            { step: 4, label: '4 — PRÉVIA' },
            { step: 5, label: '5 — PDF' },
          ].map((item) => {
            const isActive = currentStep === item.step;
            const isDone = currentStep > item.step;
            return (
              <div
                key={item.step}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md shrink-0 font-bold transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : isDone
                    ? 'text-emerald-400 bg-emerald-950/30 border border-emerald-500/30'
                    : 'text-slate-500'
                }`}
              >
                {isDone ? <Check className="w-3.5 h-3.5" /> : <span>{item.step}</span>}
                <span className="text-[11px]">{item.label}</span>
              </div>
            );
          })}
        </div>

        {/* CORPO DO MODAL */}
        <div className="p-5 flex-1 overflow-y-auto space-y-5">
          {/* ========================================================
              ETAPA 1: ESCOLHER MODELO
             ======================================================== */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  1. SELECIONE O MODELO DA ARTE BASE
                </h3>
                <p className="text-xs text-slate-400">
                  Somente um modelo por geração. As artes base originais são preservadas e o QR dinâmico e o número da placa são inseridos em camadas exclusivas.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {PLAQUE_TEMPLATES.map((tpl) => {
                  const isSelected = selectedTemplateId === tpl.id;
                  return (
                    <div
                      key={tpl.id}
                      onClick={() => setSelectedTemplateId(tpl.id)}
                      className={`relative rounded-2xl border-2 p-3 transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'border-blue-500 bg-blue-950/20 shadow-lg shadow-blue-500/10'
                          : 'border-slate-800 bg-[#0d1322] hover:border-slate-700'
                      }`}
                    >
                      {/* Miniatura visual de alta fidelidade */}
                      <div className="w-full aspect-square rounded-xl bg-slate-900 overflow-hidden mb-3 border border-slate-800/80 relative flex items-center justify-center p-2">
                        {/* Simulação gráfica fiel da miniatura */}
                        {tpl.theme === 'blue' && (
                          <div className="w-full h-full bg-[#0a63de] rounded-lg relative overflow-hidden flex flex-col justify-between p-2 shadow-inner">
                            <div className="text-center space-y-0.5">
                              <div className="text-[9px] text-amber-300 font-black">★★★★★</div>
                              <div className="text-[8px] font-black text-white leading-tight">
                                NÓS GOSTARÍAMOS DA
                                <br />
                                SUA OPINIÃO NO GOOGLE
                              </div>
                            </div>
                            <div className="bg-white rounded p-1 flex items-center justify-between gap-1 shadow">
                              <div className="w-6 h-6 border border-slate-300 rounded bg-slate-100 flex items-center justify-center text-[7px] text-slate-600 font-bold">
                                QR
                              </div>
                              <div className="text-[7px] font-bold text-slate-800">
                                APONTE A CÂMERA
                              </div>
                            </div>
                            <div className="h-1 bg-gradient-to-r from-red-500 via-amber-400 to-blue-500 rounded-full" />
                          </div>
                        )}

                        {tpl.theme === 'black' && (
                          <div className="w-full h-full bg-black rounded-lg relative overflow-hidden flex flex-col justify-between p-2 shadow-inner border border-slate-800">
                            <div className="text-center space-y-0.5">
                              <div className="text-[9px] text-amber-300 font-black">★★★★★</div>
                              <div className="text-[8px] font-black text-white leading-tight">
                                NÓS GOSTARÍAMOS DA
                                <br />
                                SUA OPINIÃO NO GOOGLE
                              </div>
                            </div>
                            <div className="bg-white rounded p-1 flex items-center justify-between gap-1 shadow">
                              <div className="w-6 h-6 border border-slate-300 rounded bg-slate-100 flex items-center justify-center text-[7px] text-slate-600 font-bold">
                                QR
                              </div>
                              <div className="text-[7px] font-bold text-slate-800">
                                APONTE A CÂMERA
                              </div>
                            </div>
                            <div className="h-1 bg-gradient-to-r from-red-500 via-amber-400 to-blue-500 rounded-full" />
                          </div>
                        )}

                        {tpl.theme === 'white' && (
                          <div className="w-full h-full bg-white rounded-lg relative overflow-hidden flex flex-col justify-between p-2 shadow-inner border border-slate-200">
                            <div className="h-1 bg-gradient-to-r from-emerald-500 via-amber-400 to-blue-500" />
                            <div className="text-center">
                              <div className="text-[7px] font-bold text-slate-700">DEIXE SUA</div>
                              <div className="text-[8px] font-black text-slate-900">AVALIAÇÃO NO</div>
                              <div className="text-[9px] font-black text-blue-600">Google</div>
                              <div className="text-[7px] text-amber-400 font-bold">★★★★★</div>
                            </div>
                            <div className="grid grid-cols-2 gap-1 px-1">
                              <div className="border border-slate-900 rounded p-1 text-center text-[7px] font-bold text-slate-900 bg-slate-50">
                                [ QR ]
                              </div>
                              <div className="border border-slate-900 rounded p-1 text-center text-[7px] font-bold text-slate-900 bg-slate-50">
                                NFC
                              </div>
                            </div>
                            <div className="h-1 bg-gradient-to-r from-blue-500 to-red-500" />
                          </div>
                        )}

                        {/* Check indicador */}
                        {isSelected && (
                          <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg">
                            <Check className="w-4 h-4" />
                          </div>
                        )}
                      </div>

                      {/* Informações do modelo */}
                      <div>
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <h4 className="text-xs sm:text-sm font-bold text-white">{tpl.name}</h4>
                          <span
                            className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                              isSelected ? 'border-blue-500 bg-blue-600' : 'border-slate-700'
                            }`}
                          >
                            {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                          {tpl.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Opção avançada: upload opcional de arquivo JPEG/PNG original */}
              <div className="bg-[#080d1a] border border-slate-800 rounded-xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                <div className="space-y-0.5">
                  <span className="font-bold text-slate-300 block">
                    Upload de Arte Personalizada (Opcional)
                  </span>
                  <p className="text-slate-500 text-[11px]">
                    {customImageFile
                      ? `Arquivo carregado: ${customImageFile.name}`
                      : 'Você pode usar as 3 artes oficiais acima ou carregar uma imagem própria de arte base.'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleCustomImageChange}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{customImageFile ? 'Substituir Imagem' : 'Carregar Imagem'}</span>
                  </button>
                  {customImageFile && (
                    <button
                      type="button"
                      onClick={() => {
                        setCustomImageFile(null);
                        setCustomImageElement(null);
                      }}
                      className="py-1.5 px-2.5 rounded-lg text-rose-400 hover:bg-rose-950/40 text-xs transition-colors cursor-pointer"
                    >
                      Remover
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================
              ETAPA 2: QUANTIDADE DE PÁGINAS E INTERVALO
             ======================================================== */}
          {currentStep === 2 && (
            <div className="space-y-5">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  2. QUANTAS FOLHAS A4 DESEJA GERAR?
                </h3>
                <p className="text-xs text-slate-400">
                  Cada folha A4 comporta exatamente <strong>3 plaquinhas</strong> de alta qualidade.
                </p>
              </div>

              {/* Seletor principal de páginas [-] QTD [+] */}
              <div className="bg-[#0e1424] border border-slate-800 rounded-2xl p-5 space-y-4">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="space-y-1 text-center sm:text-left">
                    <span className="text-xs font-bold text-slate-300">Folhas A4 para Imprimir</span>
                    <p className="text-xs text-slate-400">
                      Calculado automaticamente: <strong>{plateCount} plaquinhas</strong> no total.
                    </p>
                  </div>

                  {/* Controle numérico */}
                  <div className="flex items-center gap-2 bg-[#080c16] border border-slate-800 rounded-xl p-1">
                    <button
                      type="button"
                      onClick={() => setPageCount((p) => Math.max(1, p - 1))}
                      className="w-10 h-10 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-black text-lg flex items-center justify-center transition-colors cursor-pointer"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={pageCount}
                      onChange={(e) => setPageCount(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-16 text-center font-mono font-black text-xl text-white bg-transparent outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setPageCount((p) => p + 1)}
                      className="w-10 h-10 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-black text-lg flex items-center justify-center transition-colors cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Tabela de Referência Rápida (1, 2, 3, 5, 10, 20 páginas) */}
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 pt-2 border-t border-slate-800/80">
                  {[
                    { pages: 1, plates: 3 },
                    { pages: 2, plates: 6 },
                    { pages: 3, plates: 9 },
                    { pages: 5, plates: 15 },
                    { pages: 10, plates: 30 },
                    { pages: 20, plates: 60 },
                  ].map((preset) => (
                    <button
                      key={preset.pages}
                      type="button"
                      onClick={() => setPageCount(preset.pages)}
                      className={`p-2 rounded-xl text-center border transition-all cursor-pointer ${
                        pageCount === preset.pages
                          ? 'border-blue-500 bg-blue-950/40 text-blue-300 font-bold'
                          : 'border-slate-800/80 bg-[#080c16] text-slate-400 hover:border-slate-700 hover:text-white'
                      }`}
                    >
                      <div className="text-[10px] text-slate-500">{preset.pages} pág{preset.pages > 1 ? 's' : ''}</div>
                      <div className="text-xs font-black">{preset.plates} placas</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* SELEÇÃO DO INTERVALO (COMEÇAR NA PLACA) */}
              <div className="bg-[#0e1424] border border-slate-800 rounded-2xl p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-bold text-slate-200 block">
                      COMEÇAR NA PLACA:
                    </span>
                    <p className="text-xs text-slate-400">
                      Evita imprimir placas repetidas se você já imprimiu um lote parcial antes.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 font-mono">Número inicial:</span>
                    <input
                      type="number"
                      min={1}
                      max={batchMaxSequence}
                      value={startSequence}
                      onChange={(e) => setStartSequence(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-24 px-3 py-1.5 bg-[#080c16] border border-slate-800 rounded-xl text-center font-mono font-bold text-sm text-white focus:border-blue-500 outline-none"
                    />
                  </div>
                </div>

                {/* Banner com o cálculo do intervalo resultante */}
                <div className="p-3 rounded-xl bg-[#080c16] border border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">Intervalo resultante:</span>
                    <strong className="font-mono text-sm text-blue-400">
                      {String(startSequence).padStart(3, '0')} → {String(endSequence).padStart(3, '0')}
                    </strong>
                  </div>
                  <div className="text-slate-400">
                    Disponível no lote até a placa: <strong className="text-slate-200">{String(batchMaxSequence).padStart(3, '0')}</strong>
                  </div>
                </div>

                {/* Alerta de ultrapassagem do lote */}
                {isIntervalExceeded && (
                  <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/40 text-amber-300 text-xs flex items-center justify-between gap-3 animate-fadeIn">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                      <span>
                        Este lote possui QR Codes somente até a placa{' '}
                        <strong>{String(batchMaxSequence).padStart(3, '0')}</strong>. A quantidade solicitada ({endSequence}) excede o limite.
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleAdjustToMax}
                      className="py-1 px-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shrink-0 cursor-pointer transition-colors"
                    >
                      Ajustar quantidade
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================
              ETAPA 3: RESUMO E CONFIGURAÇÕES DE CORTE
             ======================================================== */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  3. CONFIRMAÇÃO DO LOTE E RESUMO
                </h3>
                <p className="text-xs text-slate-400">
                  Verifique todas as informações antes de renderizar a prévia da folha A4.
                </p>
              </div>

              {/* Tabela de Resumo */}
              <div className="bg-[#0e1424] border border-slate-800 rounded-2xl p-5 space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 border-b border-slate-800/80 pb-4">
                  <div>
                    <span className="text-[11px] text-slate-500 block">MODELO SELECIONADO</span>
                    <strong className="text-xs sm:text-sm text-white">{activeTemplate.name}</strong>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500 block">LOTE</span>
                    <strong className="text-xs sm:text-sm text-white">{batch.name}</strong>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500 block">FOLHAS A4</span>
                    <strong className="text-xs sm:text-sm text-blue-400">{pageCount} páginas</strong>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500 block">TOTAL DE PLACAS</span>
                    <strong className="text-xs sm:text-sm text-emerald-400">{plateCount} placas</strong>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
                  <div>
                    <span className="text-[11px] text-slate-500 block">INTERVALO FÍSICO</span>
                    <strong className="text-xs sm:text-sm font-mono text-white">
                      {String(startSequence).padStart(3, '0')} → {String(endSequence).padStart(3, '0')}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500 block">FORMATO</span>
                    <strong className="text-xs sm:text-sm text-white">A4 (210 × 297 mm)</strong>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500 block">POR PÁGINA</span>
                    <strong className="text-xs sm:text-sm text-white">3 Plaquinhas verticais</strong>
                  </div>
                </div>
              </div>

              {/* Opção de Linhas de Corte */}
              <div className="bg-[#0e1424] border border-slate-800 rounded-2xl p-4 flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Scissors className="w-3.5 h-3.5 text-blue-400" />
                    <span>Mostrar linhas de corte discretas</span>
                  </span>
                  <p className="text-[11px] text-slate-400">
                    Insere linhas pontilhadas de referência e marcas de corte nas bordas para facilitar a separação com estilete ou guilhotina.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showCutLines}
                    onChange={(e) => setShowCutLines(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {/* Status da validação */}
              {!validation.valid && (
                <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-rose-400" />
                    <span>Inconsistências detectadas:</span>
                  </div>
                  <ul className="list-disc pl-5 space-y-0.5 text-[11px]">
                    {validation.errors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* ========================================================
              ETAPA 4: PRÉVIA REAL DA FOLHA A4
             ======================================================== */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <span>4. PRÉVIA REAL DA FOLHA A4</span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      (FOLHA {previewPageIndex + 1} DE {pageCount})
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Visualize a distribuição exata das 3 plaquinhas por folha com seus QR Codes e números reais.
                  </p>
                </div>

                {/* Navegação entre folhas A4 */}
                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <button
                    type="button"
                    disabled={previewPageIndex === 0}
                    onClick={() => setPreviewPageIndex((i) => Math.max(0, i - 1))}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Anterior</span>
                  </button>
                  <span className="text-xs font-mono font-bold text-slate-300 px-2">
                    {previewPageIndex + 1} / {pageCount}
                  </span>
                  <button
                    type="button"
                    disabled={previewPageIndex >= pageCount - 1}
                    onClick={() => setPreviewPageIndex((i) => Math.min(pageCount - 1, i + 1))}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer disabled:cursor-not-allowed"
                  >
                    <span>Próxima</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsZoomOpen(true)}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer ml-1"
                    title="Ampliar prévia"
                  >
                    <ZoomIn className="w-4 h-4" />
                    <span className="hidden sm:inline">Zoom</span>
                  </button>
                </div>
              </div>

              {/* SIMULAÇÃO DA FOLHA A4 (PROPORÇÃO 210 x 297) */}
              <div className="flex justify-center">
                <div className="w-full max-w-md aspect-[210/297] bg-white rounded-xl shadow-2xl p-4 flex flex-col justify-between relative overflow-hidden border border-slate-300 text-slate-900 select-none">
                  {isLoadingPreview ? (
                    <div className="absolute inset-0 bg-white/90 flex flex-col items-center justify-center gap-2 z-10 text-xs text-slate-600">
                      <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
                      <span>Renderizando folha em alta resolução...</span>
                    </div>
                  ) : (
                    <>
                      {/* 3 Plaquinhas empilhadas verticalmente */}
                      {[0, 1, 2].map((slotIdx) => {
                        const plateGlobalIdx = previewPageIndex * 3 + slotIdx;
                        const qr = selectedQRCodesForPrint[plateGlobalIdx];
                        const canvasUrl = previewCanvasUrls[slotIdx];

                        return (
                          <div
                            key={slotIdx}
                            className="flex-1 flex flex-col items-center justify-center relative py-1"
                          >
                            {qr && canvasUrl ? (
                              <div className="h-full max-h-[86px] aspect-square flex items-center justify-center relative">
                                <img
                                  src={canvasUrl}
                                  alt={`Placa ${qr.sequenceNumber}`}
                                  className="h-full w-auto object-contain rounded shadow-sm"
                                />
                              </div>
                            ) : (
                              <div className="text-[10px] text-slate-400 italic">
                                [ Espaço Vazio ]
                              </div>
                            )}

                            {/* Linha de corte entre placas */}
                            {showCutLines && slotIdx < 2 && (
                              <div className="absolute -bottom-1 left-0 right-0 border-b border-dashed border-slate-400 flex items-center justify-center">
                                <span className="text-[8px] bg-white px-1 text-slate-500 font-mono">
                                  ✂ - - - - - - - - - - - - - - - - - - ✂
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {/* Rodapé sutil da folha A4 */}
                      <div className="text-[7px] text-center text-slate-400 pt-1 font-mono">
                        JZN CODE • LOTE: {batch.name} • FOLHA {previewPageIndex + 1} DE {pageCount} • 3 PLAQUINHAS POR A4
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================
              ETAPA 5: PROCESSANDO / DOWNLOAD DO PDF
             ======================================================== */}
          {currentStep === 5 && (
            <div className="py-8 text-center space-y-5">
              {!pdfCompleted ? (
                <div className="space-y-4 max-w-md mx-auto">
                  <div className="w-14 h-14 rounded-2xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 mx-auto">
                    <RefreshCw className="w-7 h-7 animate-spin" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">
                      GERANDO PDF PARA IMPRESSÃO EM ALTA RESOLUÇÃO
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      {progressStatusText || 'Compondo artes, QR Codes e códigos...'}
                    </p>
                  </div>

                  {/* Barra de progresso */}
                  <div className="w-full bg-[#080c16] rounded-full h-3 border border-slate-800 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-blue-600 to-emerald-500 h-full transition-all duration-300 rounded-full"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <span className="text-xs font-mono font-bold text-blue-400">
                    {progressPercent}% Concluído
                  </span>
                </div>
              ) : (
                <div className="space-y-4 max-w-md mx-auto animate-fadeIn">
                  <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mx-auto">
                    <CheckCircle2 className="w-9 h-9" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">PDF GERADO COM SUCESSO!</h3>
                    <p className="text-xs text-slate-300 mt-1 font-mono">
                      Arquivo: <strong>{generatedFilename}</strong>
                    </p>
                  </div>

                  <div className="bg-[#0e1424] border border-slate-800 rounded-2xl p-4 text-left space-y-2 text-xs">
                    <span className="font-bold text-white block">Dicas de Impressão Profissional:</span>
                    <ul className="list-disc pl-5 space-y-1 text-slate-400 text-[11px]">
                      <li>
                        Nas opções da impressora, selecione <strong>Escala: 100%</strong> (ou "Tamanho Real"), sem ajustar à página.
                      </li>
                      <li>
                        Recomendado papel fotográfico fosco ou papel couchê 180g a 240g para acabamento firme de plaquinha.
                      </li>
                      <li>
                        Após imprimir, utilize as <strong>linhas de corte</strong> para separar as 3 plaquinhas com régua e estilete.
                      </li>
                    </ul>
                  </div>

                  <div className="pt-2 flex items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={onClose}
                      className="py-2.5 px-6 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-600/30 transition-all cursor-pointer"
                    >
                      Concluir e Fechar
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* RODAPÉ COM BOTÕES DE AÇÃO */}
        {currentStep < 5 && (
          <div className="px-5 py-4 border-t border-slate-800 bg-[#0e1424] flex items-center justify-between gap-3">
            {currentStep > 1 ? (
              <button
                type="button"
                onClick={() => setCurrentStep((s) => (s - 1) as any)}
                className="py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Voltar</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              {currentStep < 3 && (
                <button
                  type="button"
                  disabled={currentStep === 2 && isIntervalExceeded}
                  onClick={() => setCurrentStep((s) => (s + 1) as any)}
                  className="py-2.5 px-5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-md shadow-blue-600/20"
                >
                  <span>Avançar</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}

              {currentStep === 3 && (
                <button
                  type="button"
                  disabled={!validation.valid}
                  onClick={() => setCurrentStep(4)}
                  className="py-2.5 px-5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-md shadow-blue-600/20"
                >
                  <EyeIcon className="w-4 h-4" />
                  <span>GERAR PRÉVIA</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}

              {currentStep === 4 && (
                <button
                  type="button"
                  onClick={handleGeneratePDF}
                  className="py-2.5 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black transition-all cursor-pointer flex items-center gap-2 shadow-lg shadow-emerald-600/30"
                >
                  <Download className="w-4 h-4" />
                  <span>↓ GERAR PDF PARA IMPRESSÃO</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* MODAL DE ZOOM DA PRÉVIA */}
      {isZoomOpen && previewCanvasUrls.length > 0 && (
        <div className="fixed inset-0 z-60 bg-black/90 flex flex-col items-center justify-center p-4 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-3xl max-h-[90vh] bg-[#0b101b] border border-slate-800 rounded-2xl flex flex-col overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <span className="text-sm font-bold text-white">
                Zoom da Folha {previewPageIndex + 1} de {pageCount}
              </span>
              <button
                type="button"
                onClick={() => setIsZoomOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1 flex flex-col items-center gap-4 bg-slate-950">
              {previewCanvasUrls.map((url, i) => (
                <div key={i} className="max-w-md w-full border border-slate-800 rounded-xl overflow-hidden shadow">
                  <img src={url} alt={`Placa Zoom ${i}`} className="w-full h-auto" />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EyeIcon(props: any) {
  return (
    <svg
      {...props}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
