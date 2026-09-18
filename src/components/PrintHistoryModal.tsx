import { useEffect, useState } from 'react';
import { PrintJob, QRBatch } from '../types';
import { db } from '../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { History, X, Printer, Calendar, FileText, CheckCircle2 } from 'lucide-react';

interface PrintHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  batch: QRBatch;
  userId: string;
}

export function PrintHistoryModal({
  isOpen,
  onClose,
  batch,
  userId,
}: PrintHistoryModalProps) {
  const [jobs, setJobs] = useState<PrintJob[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen || !batch.id) return;

    const fetchHistory = async () => {
      setLoading(true);
      try {
        const q = query(
          collection(db, 'printJobs'),
          where('batchId', '==', batch.id)
        );
        const snap = await getDocs(q);
        const list: PrintJob[] = [];
        snap.forEach((d) => {
          list.push(d.data() as PrintJob);
        });

        // Ordena por data mais recente
        list.sort((a, b) => {
          const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt?.seconds ? a.createdAt.seconds * 1000 : 0);
          const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt?.seconds ? b.createdAt.seconds * 1000 : 0);
          return timeB - timeA;
        });

        setJobs(list);
      } catch (err) {
        console.error('Erro ao buscar histórico de impressão:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [isOpen, batch.id]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#0b101b] border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-[#0e1424]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center">
              <History className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Histórico de Impressão</h3>
              <p className="text-[11px] text-slate-400">Lote: {batch.name}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 max-h-[65vh] overflow-y-auto space-y-3">
          {loading ? (
            <div className="py-8 text-center text-xs text-slate-400">
              Carregando histórico...
            </div>
          ) : jobs.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400 space-y-2">
              <Printer className="w-8 h-8 text-slate-600 mx-auto" />
              <p>Nenhuma impressão registrada para este lote ainda.</p>
            </div>
          ) : (
            jobs.map((job) => {
              let dateStr = 'Data indisponível';
              if (job.createdAt) {
                const d = typeof job.createdAt?.toDate === 'function'
                  ? job.createdAt.toDate()
                  : new Date(job.createdAt);
                if (!isNaN(d.getTime())) {
                  dateStr = d.toLocaleString('pt-BR');
                }
              }

              return (
                <div
                  key={job.id}
                  className="bg-[#080d1a] border border-slate-800/80 rounded-xl p-3.5 space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-white">{job.templateName}</span>
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                      PDF Gerado
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400 pt-1 border-t border-slate-800/60">
                    <div>
                      Intervalo: <strong className="text-slate-200 font-mono">{String(job.startSequence).padStart(3, '0')} → {String(job.endSequence).padStart(3, '0')}</strong>
                    </div>
                    <div>
                      Páginas: <strong className="text-slate-200">{job.pageCount} A4 ({job.plateCount} placas)</strong>
                    </div>
                  </div>

                  <div className="text-[10px] text-slate-500 flex items-center gap-1.5 pt-0.5">
                    <Calendar className="w-3 h-3" />
                    <span>{dateStr}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="p-3 border-t border-slate-800 bg-[#0e1424] text-right">
          <button
            type="button"
            onClick={onClose}
            className="py-1.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
