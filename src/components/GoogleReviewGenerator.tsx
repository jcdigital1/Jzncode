import { useState, useEffect, type FormEvent } from 'react';
import { User } from 'firebase/auth';
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  setDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import { GoogleBusiness, DynamicQRCode } from '../types';
import {
  generateSlug,
  getDynamicQRUrl,
  generateQRCodeDataUrl,
  generateQRCodeSvg,
  getQRCodeFilename,
  downloadDataUrl,
  downloadSvg,
} from '../utils/qr';
import {
  Star,
  Search,
  CheckCircle2,
  ExternalLink,
  Copy,
  Check,
  PlusCircle,
  ArrowLeft,
  Building2,
  MapPin,
  QrCode,
  Download,
  Trash2,
  Edit3,
  Sparkles,
  Info,
  ChevronDown,
  FileImage,
  FileCode,
} from 'lucide-react';

interface GoogleReviewGeneratorProps {
  user: User;
  allQRCodes: DynamicQRCode[];
  onOpenQRInList?: (slug: string) => void;
  onEditQR?: (qr: DynamicQRCode) => void;
}

interface ResolvedPlace {
  placeId: string;
  name: string;
  address: string;
  city: string;
  reviewUrl: string;
}

export function GoogleReviewGenerator({
  user,
  allQRCodes,
  onOpenQRInList,
  onEditQR,
}: GoogleReviewGeneratorProps) {
  // Wizard steps: 'input' | 'confirm' | 'result' | 'created_success'
  const [step, setStep] = useState<'input' | 'confirm' | 'result' | 'created_success'>('input');

  const [inputUrl, setInputUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Resolved Place state
  const [place, setPlace] = useState<ResolvedPlace | null>(null);

  // Created QR Code state
  const [createdQR, setCreatedQR] = useState<DynamicQRCode | null>(null);
  const [createdQRDataUrl, setCreatedQRDataUrl] = useState<string>('');
  const [qrNameInput, setQrNameInput] = useState('');
  const [creatingQR, setCreatingQR] = useState(false);

  // Copy states
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedReviewUrl, setCopiedReviewUrl] = useState<string | null>(null);

  // Download menu state for created QR
  const [downloadMenuOpen, setDownloadMenuOpen] = useState(false);

  // Minhas Empresas collection state
  const [businesses, setBusinesses] = useState<GoogleBusiness[]>([]);
  const [businessesLoading, setBusinessesLoading] = useState(true);

  // Listen to user's Google Businesses in Firestore
  useEffect(() => {
    if (!user) return;
    setBusinessesLoading(true);

    const q = query(
      collection(db, 'googleBusinesses'),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: GoogleBusiness[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          list.push({
            id: docSnap.id,
            userId: data.userId || user.uid,
            name: data.name || 'Empresa sem nome',
            placeId: data.placeId || '',
            reviewUrl: data.reviewUrl || '',
            address: data.address || '',
            city: data.city || '',
            qrCodeId: data.qrCodeId || '',
            qrSlug: data.qrSlug || '',
            qrName: data.qrName || '',
            scansCount: data.scansCount || 0,
            createdAt: data.createdAt || null,
            updatedAt: data.updatedAt || null,
          });
        });

        list.sort((a, b) => {
          const timeA = typeof a.updatedAt?.toMillis === 'function' ? a.updatedAt.toMillis() : 0;
          const timeB = typeof b.updatedAt?.toMillis === 'function' ? b.updatedAt.toMillis() : 0;
          return timeB - timeA;
        });

        setBusinesses(list);
        setBusinessesLoading(false);
      },
      (err) => {
        console.error('Erro ao buscar Minhas Empresas:', err);
        setBusinessesLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  // Handle resolving the link via backend API
  const handleResolveLink = async (e: FormEvent) => {
    e.preventDefault();
    if (!inputUrl.trim()) {
      setError('Por favor, cole o link compartilhado da empresa no Google Maps.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const res = await fetch('/api/google-place/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: inputUrl.trim() }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Não foi possível encontrar a empresa pelo link informado.');
      }

      setPlace({
        placeId: data.placeId,
        name: data.name || 'Minha Empresa',
        address: data.address || '',
        city: data.city || '',
        reviewUrl: data.reviewUrl,
      });

      setQrNameInput(`Avaliação Google — ${data.name || 'Minha Empresa'}`);
      setStep('confirm');
    } catch (err: any) {
      console.error('Erro ao resolver link Google:', err);
      setError(err.message || 'Erro ao consultar Google Maps. Verifique o link e tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // Confirm company is correct
  const handleConfirmCompany = () => {
    setStep('result');
  };

  // Start over
  const handleReset = () => {
    setInputUrl('');
    setPlace(null);
    setCreatedQR(null);
    setError(null);
    setStep('input');
  };

  // Copy review link
  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      // ignore
    }
  };

  // Create dynamic QR code and save business
  const handleCreateDynamicQR = async () => {
    if (!place || !user) return;

    try {
      setCreatingQR(true);
      setError(null);

      const finalName = qrNameInput.trim() || `Avaliação Google — ${place.name}`;
      const slug = generateSlug();
      const intermediateUrl = getDynamicQRUrl(slug);

      // 1. Save in dynamicQRCodes collection
      const qrDocRef = doc(db, 'dynamicQRCodes', slug);
      await setDoc(qrDocRef, {
        id: slug,
        userId: user.uid,
        name: finalName,
        slug: slug,
        destinationUrl: place.reviewUrl,
        active: true,
        scansCount: 0,
        googlePlaceId: place.placeId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // 2. Save in googleBusinesses collection
      const businessId = `place_${place.placeId.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
      const businessDocRef = doc(db, 'googleBusinesses', businessId);
      await setDoc(
        businessDocRef,
        {
          id: businessId,
          userId: user.uid,
          name: place.name,
          placeId: place.placeId,
          reviewUrl: place.reviewUrl,
          address: place.address,
          city: place.city,
          qrCodeId: slug,
          qrSlug: slug,
          qrName: finalName,
          scansCount: 0,
          updatedAt: serverTimestamp(),
          createdAt: serverTimestamp(),
        },
        { merge: true }
      );

      // Generate preview for created QR
      const dataUrl = await generateQRCodeDataUrl(intermediateUrl, finalName, 480);
      setCreatedQRDataUrl(dataUrl);

      const newQrItem: DynamicQRCode = {
        id: slug,
        userId: user.uid,
        name: finalName,
        slug: slug,
        destinationUrl: place.reviewUrl,
        active: true,
        scansCount: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      setCreatedQR(newQrItem);
      setStep('created_success');
    } catch (err: any) {
      console.error('Erro ao criar QR Code de Avaliação Google:', err);
      setError('Erro ao salvar o QR Code. Verifique sua conexão.');
    } finally {
      setCreatingQR(false);
    }
  };

  // Download handlers for created QR
  const handleDownloadCreatedPng = async () => {
    if (!createdQR) return;
    try {
      const intermediateUrl = getDynamicQRUrl(createdQR.slug);
      const fullResUrl = await generateQRCodeDataUrl(intermediateUrl, createdQR.name, 1024);
      const filename = getQRCodeFilename(createdQR.name, 'png');
      downloadDataUrl(fullResUrl, filename);
      setDownloadMenuOpen(false);
    } catch (e) {
      console.error('Erro ao baixar PNG:', e);
    }
  };

  const handleDownloadCreatedSvg = async () => {
    if (!createdQR) return;
    try {
      const intermediateUrl = getDynamicQRUrl(createdQR.slug);
      const svgStr = await generateQRCodeSvg(intermediateUrl, createdQR.name);
      const filename = getQRCodeFilename(createdQR.name, 'svg');
      downloadSvg(svgStr, filename);
      setDownloadMenuOpen(false);
    } catch (e) {
      console.error('Erro ao baixar SVG:', e);
    }
  };

  // Delete business from Minhas Empresas
  const handleDeleteBusiness = async (bId: string) => {
    if (!confirm('Deseja remover esta empresa da lista? O QR Code continuará ativo em Meus QR Codes.')) {
      return;
    }
    try {
      await deleteDoc(doc(db, 'googleBusinesses', bId));
    } catch (err) {
      console.error('Erro ao remover empresa:', err);
    }
  };

  return (
    <div className="space-y-6 w-full max-w-full">
      {/* 1. SEÇÃO PRINCIPAL: GERADOR DE AVALIAÇÃO GOOGLE */}
      <div className="bg-[#0d121f] border border-blue-500/30 rounded-2xl p-4 sm:p-6 shadow-xl relative overflow-hidden">
        {/* Glow sutil */}
        <div className="absolute -top-16 -right-16 w-48 h-48 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* Cabeçalho da Ferramenta */}
        <div className="flex items-center gap-2.5 mb-1 text-blue-400">
          <div className="p-1.5 rounded-lg bg-blue-950/60 border border-blue-500/30">
            <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
          </div>
          <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
            Gerador de Avaliação Google
          </h2>
        </div>
        <p className="text-xs sm:text-sm text-slate-300 mb-5 leading-relaxed">
          Cole o link da empresa no Google e gere um acesso direto para o cliente deixar sua avaliação.
        </p>

        {/* Mensagens de erro */}
        {error && (
          <div className="p-3 bg-red-950/60 border border-red-500/40 rounded-xl text-red-300 text-xs mb-4 flex items-start gap-2">
            <Info className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* ETAPA 1: INPUT DO LINK */}
        {step === 'input' && (
          <form onSubmit={handleResolveLink} className="space-y-3.5">
            <div>
              <label
                htmlFor="google-maps-url"
                className="block text-xs font-semibold text-slate-300 mb-1.5"
              >
                Link da empresa no Google
              </label>
              <div className="relative">
                <input
                  id="google-maps-url"
                  type="text"
                  value={inputUrl}
                  onChange={(e) => setInputUrl(e.target.value)}
                  placeholder="Cole aqui o link do Google/Google Maps da empresa"
                  className="w-full bg-[#050811] border border-slate-700/80 focus:border-blue-500 rounded-xl py-3 px-3.5 pr-10 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">
                  <Search className="w-4 h-4" />
                </div>
              </div>
              <p className="text-[11px] text-slate-400 mt-1.5 flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-blue-400 shrink-0" />
                <span>
                  Aceita links compartilhados (ex: <code>maps.app.goo.gl/...</code>) ou links completos do Google Maps.
                </span>
              </p>
            </div>

            <button
              id="btn-generate-review-link"
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto py-2.5 px-5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-md shadow-blue-600/30 disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Identificando estabelecimento no Google...</span>
                </>
              ) : (
                <>
                  <Star className="w-4 h-4 text-amber-300 fill-amber-300" />
                  <span>⭐ GERAR LINK DE AVALIAÇÃO</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* ETAPA 2: CONFIRMAÇÃO DA EMPRESA */}
        {step === 'confirm' && place && (
          <div className="space-y-4 animate-fadeIn">
            <div className="p-4 bg-[#050811] border border-blue-500/40 rounded-xl space-y-2.5">
              <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                <span>⭐ Empresa encontrada</span>
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="flex items-start gap-2">
                  <Building2 className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-slate-400 text-[11px] block">Nome:</span>
                    <strong className="text-white text-sm sm:text-base font-bold">
                      {place.name}
                    </strong>
                  </div>
                </div>

                {place.address && (
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-slate-400 text-[11px] block">Endereço:</span>
                      <span className="text-slate-200">{place.address}</span>
                    </div>
                  </div>
                )}

                {place.city && (
                  <div className="pl-6 text-slate-400 text-[11px]">
                    Cidade: <span className="text-slate-200">{place.city}</span>
                  </div>
                )}

                <div className="pl-6 pt-1 text-slate-500 text-[10px] font-mono">
                  Place ID: <span className="text-blue-400">{place.placeId}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2.5">
              <button
                id="btn-confirm-company"
                type="button"
                onClick={handleConfirmCompany}
                className="w-full sm:w-auto py-2.5 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-600/30 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>✓ Confirmar empresa</span>
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="w-full sm:w-auto py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Procurar novamente</span>
              </button>
            </div>
          </div>
        )}

        {/* ETAPA 3: RESULTADO DO GERADOR & OPÇÃO DE CRIAR QR CODE */}
        {step === 'result' && place && (
          <div className="space-y-4 animate-fadeIn">
            <div className="p-4 bg-[#050811] border border-emerald-500/40 rounded-xl space-y-3">
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                <CheckCircle2 className="w-4 h-4" />
                <span>✓ LINK DE AVALIAÇÃO CRIADO</span>
              </div>

              <div>
                <span className="text-slate-400 text-[11px] block">Empresa:</span>
                <strong className="text-white text-sm sm:text-base font-bold flex items-center gap-1.5">
                  <Star className="w-4 h-4 text-amber-400 fill-amber-400 shrink-0" />
                  <span>{place.name}</span>
                </strong>
              </div>

              <div>
                <span className="text-slate-400 text-[11px] block mb-1">Link direto para avaliação:</span>
                <div className="bg-[#0a0f1d] p-2.5 rounded-lg border border-slate-800 flex items-center justify-between gap-2 overflow-hidden">
                  <span className="text-xs font-mono text-blue-300 truncate max-w-[calc(100%-60px)]">
                    {place.reviewUrl}
                  </span>
                  <a
                    href={place.reviewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Abrir avaliação no Google"
                    className="p-1 text-slate-400 hover:text-white rounded"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

              {/* Três botões solicitados: 📋 COPIAR LINK | ↗ TESTAR LINK | ▦ CRIAR QR CODE */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  id="btn-copy-review-link"
                  type="button"
                  onClick={() => handleCopy(place.reviewUrl)}
                  className="py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  {copiedLink ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>COPIADO!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>📋 COPIAR LINK</span>
                    </>
                  )}
                </button>

                <a
                  id="btn-test-review-link"
                  href={place.reviewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
                  <span>↗ TESTAR LINK</span>
                </a>

                <a
                  href="#create-qr-section"
                  className="py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm shadow-blue-600/30"
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span>▦ CRIAR QR CODE</span>
                </a>
              </div>
            </div>

            {/* Formulário para criar o QR Code Dinâmico com preenchimento automático */}
            <div id="create-qr-section" className="p-4 bg-[#0a0f1d] border border-blue-500/40 rounded-xl space-y-3">
              <div className="flex items-center gap-2 text-blue-400 text-xs font-bold uppercase tracking-wider">
                <QrCode className="w-4 h-4" />
                <span>TRANSFORMAR A AVALIAÇÃO EM QR CODE</span>
              </div>
              <p className="text-xs text-slate-300">
                O QR Code conterá uma URL dinâmica permanente do JZN CODE redirecionando direto para a avaliação.
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nome do QR Code:
                </label>
                <input
                  id="input-qr-auto-name"
                  type="text"
                  value={qrNameInput}
                  onChange={(e) => setQrNameInput(e.target.value)}
                  placeholder={`Avaliação Google — ${place.name}`}
                  className="w-full bg-[#050811] border border-slate-700 focus:border-blue-500 rounded-xl py-2.5 px-3 text-xs text-white placeholder-slate-500 focus:outline-none font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Destino:
                </label>
                <input
                  type="text"
                  readOnly
                  value={place.reviewUrl}
                  className="w-full bg-[#050811]/70 border border-slate-800 rounded-xl py-2 px-3 text-xs font-mono text-slate-400 focus:outline-none cursor-default"
                />
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
                <button
                  id="btn-create-dynamic-qr-from-review"
                  type="button"
                  onClick={handleCreateDynamicQR}
                  disabled={creatingQR}
                  className="w-full sm:w-auto py-2.5 px-5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-md shadow-blue-600/30 disabled:opacity-50 cursor-pointer"
                >
                  {creatingQR ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>GERANDO QR CODE...</span>
                    </>
                  ) : (
                    <>
                      <QrCode className="w-4 h-4" />
                      <span>GERAR QR CODE DINÂMICO</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="w-full sm:w-auto py-2 px-3 text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  Voltar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ETAPA 4: QR CODE CRIADO COM SUCESSO: [ QR CODE ] Nome | Baixar | Testar | Editar */}
        {step === 'created_success' && createdQR && (
          <div className="space-y-4 animate-fadeIn p-4 bg-[#050811] border border-emerald-500/50 rounded-xl">
            <div className="flex items-center gap-2 text-emerald-400 text-sm font-bold uppercase tracking-wider">
              <CheckCircle2 className="w-5 h-5" />
              <span>✓ QR Code criado com sucesso</span>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4 py-2">
              {/* [ QR CODE ] Moldura com preview */}
              <div className="shrink-0 p-2.5 bg-white rounded-xl shadow-md border border-slate-200 flex items-center justify-center w-[110px] h-[110px]">
                {createdQRDataUrl ? (
                  <img
                    src={createdQRDataUrl}
                    alt={createdQR.name}
                    className="w-full h-full object-contain block rounded"
                  />
                ) : (
                  <QrCode className="w-8 h-8 text-blue-600" />
                )}
              </div>

              <div className="space-y-1 text-center sm:text-left flex-1 min-w-0">
                <h4 className="text-base font-bold text-white truncate">{createdQR.name}</h4>
                <p className="text-xs text-slate-400 font-mono">
                  Código: <span className="text-blue-400 font-bold">{createdQR.slug}</span>
                </p>
                <p className="text-[11px] text-slate-400">
                  Aponta para o destino de avaliação com redirecionamento instantâneo.
                </p>
                <p className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1 justify-center sm:justify-start">
                  <Check className="w-3.5 h-3.5" />
                  <span>Salvo na sua conta e disponível em Meus QR Codes.</span>
                </p>
              </div>
            </div>

            {/* Ações solicitadas: Baixar | Testar | Editar */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800">
              {/* 1. Baixar */}
              <div className="relative">
                <button
                  id="btn-created-download-dropdown"
                  type="button"
                  onClick={() => setDownloadMenuOpen((prev) => !prev)}
                  className="py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-600/30 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Baixar</span>
                  <ChevronDown className="w-3 h-3 opacity-80" />
                </button>

                {downloadMenuOpen && (
                  <div className="absolute left-0 bottom-full mb-1.5 w-44 bg-[#0d121f] border border-blue-500/40 rounded-xl shadow-2xl p-1.5 z-30 space-y-1">
                    <button
                      type="button"
                      onClick={handleDownloadCreatedPng}
                      className="w-full py-1.5 px-2 rounded-lg text-left text-xs font-medium text-slate-200 hover:bg-blue-600 hover:text-white flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <FileImage className="w-3.5 h-3.5 text-blue-400" />
                      <span>PNG (Alta resolução)</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadCreatedSvg}
                      className="w-full py-1.5 px-2 rounded-lg text-left text-xs font-medium text-slate-200 hover:bg-blue-600 hover:text-white flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <FileCode className="w-3.5 h-3.5 text-cyan-400" />
                      <span>SVG (Vetorial)</span>
                    </button>
                  </div>
                )}
              </div>

              {/* 2. Testar */}
              <a
                id="btn-created-test-qr"
                href={`/q/${createdQR.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
                <span>Testar</span>
              </a>

              {/* 3. Editar */}
              {onEditQR && (
                <button
                  id="btn-created-edit-qr"
                  type="button"
                  onClick={() => onEditQR(createdQR)}
                  className="py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5 text-blue-400" />
                  <span>Editar</span>
                </button>
              )}

              {/* Botão Gerar Outro */}
              <button
                type="button"
                onClick={handleReset}
                className="py-2 px-3 text-xs text-blue-400 hover:text-blue-300 font-semibold cursor-pointer ml-auto"
              >
                + Gerar para outra empresa
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 2. SEÇÃO: MINHAS EMPRESAS */}
      <div className="bg-[#0d121f] border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-400" />
              <span>Minhas empresas</span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Empresas configuradas e vinculadas aos seus QR Codes de avaliação Google.
            </p>
          </div>
          <span className="text-xs font-bold text-slate-400 bg-[#050811] px-2.5 py-1 rounded-lg border border-slate-800">
            {businesses.length} {businesses.length === 1 ? 'empresa' : 'empresas'}
          </span>
        </div>

        {businessesLoading ? (
          <div className="py-6 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
            <div className="w-4 h-4 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
            <span>Carregando empresas salvas...</span>
          </div>
        ) : businesses.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400 space-y-1">
            <Star className="w-6 h-6 text-slate-600 mx-auto mb-2" />
            <p className="font-semibold text-slate-300">Nenhuma empresa cadastrada ainda.</p>
            <p className="text-[11px] text-slate-500">
              Cole o link do Google Maps acima para gerar seu primeiro link e QR Code de avaliação.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {businesses.map((b) => {
              // Tenta localizar scans do QR Code associado
              const linkedQR = allQRCodes.find((q) => q.slug === b.qrSlug);
              const scans = linkedQR?.scansCount ?? b.scansCount ?? 0;

              return (
                <div
                  key={b.id}
                  className="p-3.5 bg-[#050811] border border-slate-800 hover:border-blue-500/30 rounded-xl space-y-2.5 transition-all text-left"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                        <h4 className="text-xs sm:text-sm font-bold text-white truncate max-w-[180px] sm:max-w-[220px]">
                          {b.name}
                        </h4>
                      </div>
                      <span className="inline-block mt-0.5 text-[10px] font-semibold text-emerald-400 bg-emerald-950/50 border border-emerald-500/30 px-1.5 py-0.2 rounded-full">
                        Google conectado
                      </span>
                    </div>

                    <div className="text-right text-[11px] text-slate-400">
                      <span className="font-bold text-white text-xs">{scans}</span> leituras
                    </div>
                  </div>

                  {b.qrName && (
                    <div className="text-[11px] text-slate-400 truncate">
                      QR: <span className="text-slate-200 font-medium">{b.qrName}</span>
                    </div>
                  )}

                  {/* Ações do Card */}
                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-1 text-[11px]">
                    <div className="flex items-center gap-1.5">
                      {/* Copiar Link */}
                      <button
                        type="button"
                        onClick={async () => {
                          await navigator.clipboard.writeText(b.reviewUrl);
                          setCopiedReviewUrl(b.id);
                          setTimeout(() => setCopiedReviewUrl(null), 2000);
                        }}
                        className="p-1 text-slate-400 hover:text-blue-300 transition-colors"
                        title="Copiar link de avaliação"
                      >
                        {copiedReviewUrl === b.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>

                      {/* Ver QR */}
                      {b.qrSlug && (
                        <a
                          href={`/q/${b.qrSlug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                          title="Abrir rota dinâmica"
                        >
                          Ver QR
                        </a>
                      )}

                      {/* Localizar na lista de QR codes */}
                      {onOpenQRInList && b.qrSlug && (
                        <button
                          type="button"
                          onClick={() => onOpenQRInList(b.qrSlug!)}
                          className="px-2 py-0.5 rounded bg-blue-950/60 hover:bg-blue-900/60 text-blue-300 border border-blue-500/30 transition-colors cursor-pointer"
                        >
                          Painel QR
                        </button>
                      )}
                    </div>

                    {/* Excluir da lista */}
                    <button
                      type="button"
                      onClick={() => handleDeleteBusiness(b.id)}
                      className="p-1 text-slate-500 hover:text-red-400 transition-colors cursor-pointer"
                      title="Remover empresa da lista"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
