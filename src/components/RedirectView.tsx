import { useEffect, useState } from 'react';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { DynamicQRCode } from '../types';
import { AlertCircle } from 'lucide-react';

interface RedirectViewProps {
  slug: string;
}

function isValidHttpUrl(urlStr: string): boolean {
  if (!urlStr || typeof urlStr !== 'string') return false;
  try {
    const parsed = new URL(urlStr.trim());
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function RedirectView({ slug }: RedirectViewProps) {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function resolveAndRedirect() {
      try {
        const cleanSlug = slug.trim();
        if (!cleanSlug) {
          if (isMounted) setError('QR Code não encontrado.');
          return;
        }

        // 1. Direct document get by slug ID
        const docRef = doc(db, 'dynamicQRCodes', cleanSlug);
        const docSnap = await getDoc(docRef);

        let targetData: DynamicQRCode | null = null;

        if (docSnap.exists()) {
          targetData = docSnap.data() as DynamicQRCode;
        } else {
          // Fallback query by slug field
          try {
            const q = query(
              collection(db, 'dynamicQRCodes'),
              where('slug', '==', cleanSlug)
            );
            const querySnap = await getDocs(q);
            if (!querySnap.empty) {
              targetData = querySnap.docs[0].data() as DynamicQRCode;
            }
          } catch {
            // Ignore query errors
          }
        }

        if (!isMounted) return;

        if (!targetData) {
          setError('QR Code não encontrado.');
          return;
        }

        // Check if QR Code is active
        if (targetData.active === false) {
          setError('Este QR Code está temporariamente inativo.');
          return;
        }

        const destination = targetData.destinationUrl?.trim();
        if (!destination || !isValidHttpUrl(destination)) {
          setError('Link de destino inválido ou não configurado.');
          return;
        }

        // REDIRECIONAMENTO IMEDIATO:
        // Sem setTimeout, sem contagem regressiva, sem loading screen intermediária
        window.location.replace(destination);
      } catch (err) {
        console.error('Erro ao resolver QR Code:', err);
        if (isMounted) {
          setError('Não foi possível carregar o destino do QR Code.');
        }
      }
    }

    resolveAndRedirect();

    return () => {
      isMounted = false;
    };
  }, [slug]);

  // Se houver erro (QR inexistente, inativo ou URL inválida), exibe página simples de erro
  if (error) {
    return (
      <div
        id="redirect-error-container"
        className="min-h-screen bg-[#070a12] text-slate-100 flex items-center justify-center p-4 font-sans"
      >
        <div
          id="redirect-error-card"
          className="w-full max-w-sm bg-[#0d121f] border border-slate-800 rounded-2xl p-6 shadow-2xl text-center"
        >
          <div className="inline-block font-mono text-[11px] font-bold text-blue-400 bg-blue-950/40 border border-blue-500/30 px-2.5 py-1 rounded-full mb-4">
            JZN CODE
          </div>
          <div className="w-12 h-12 rounded-xl bg-red-950/50 border border-red-500/40 text-red-400 flex items-center justify-center mx-auto mb-3">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h1 className="text-base font-bold text-white mb-1.5">QR Code Indisponível</h1>
          <p className="text-xs text-slate-400 leading-relaxed mb-5">{error}</p>
          <a
            id="btn-error-back-home"
            href="/"
            className="inline-block px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
          >
            Voltar ao início
          </a>
        </div>
      </div>
    );
  }

  // Em funcionamento normal, NENHUMA tela intermediária é renderizada: tela totalmente limpa até o browser carregar o destino
  return <div className="min-h-screen bg-[#070a12]" />;
}
