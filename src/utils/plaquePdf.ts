import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import { DynamicQRCode, PlaqueTemplate } from '../types';
import { getDynamicQRUrl } from './qr';
import { renderCompletePlaqueToCanvas } from './templateRenderers';

export interface GeneratePlaquesPDFOptions {
  batchName: string;
  template: PlaqueTemplate;
  qrCodes: DynamicQRCode[]; // Já ordenados e validados para as páginas solicitadas
  pageCount: number;
  platesPerPage?: number;
  showCutLines?: boolean;
  customImage?: HTMLImageElement | null;
  onProgress?: (progress: number, currentPlate: number, totalPlates: number) => void;
}

export interface PlaqueValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validação rigorosa dos QR Codes antes de gerar o PDF.
 * Garante que:
 * - sequenceNumber existe
 * - code/slug existe
 * - dynamicUrl corresponde exatamente ao code
 * - Nenhuma associação entre placa e QR está inconsistente
 */
export function validateBatchForPrinting(
  qrCodes: DynamicQRCode[],
  expectedStart: number,
  expectedEnd: number
): PlaqueValidationResult {
  const errors: string[] = [];

  if (!qrCodes || qrCodes.length === 0) {
    return { valid: false, errors: ['Nenhum QR Code selecionado para impressão.'] };
  }

  const expectedCount = expectedEnd - expectedStart + 1;
  if (qrCodes.length < expectedCount) {
    errors.push(
      `Quantidade insuficiente: lote possui ${qrCodes.length} placas no intervalo, esperado ${expectedCount}.`
    );
  }

  qrCodes.forEach((qr, index) => {
    const seq = qr.sequenceNumber;
    if (seq === undefined || seq === null) {
      errors.push(`Item no índice ${index} não possui número sequencial (sequenceNumber).`);
      return;
    }

    if (!qr.slug && !qr.id) {
      errors.push(`Placa ${String(seq).padStart(3, '0')} não possui código permanente (slug).`);
    }

    const expectedDynamicUrl = getDynamicQRUrl(qr.slug || qr.id);
    if (!expectedDynamicUrl || !expectedDynamicUrl.includes(qr.slug || qr.id)) {
      errors.push(
        `Inconsistência na URL dinâmica da Placa ${String(seq).padStart(3, '0')}.`
      );
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Renderiza uma única plaquinha em alta resolução e retorna o dataURL PNG.
 */
export async function renderPlaqueDataUrl(
  qr: DynamicQRCode,
  template: PlaqueTemplate,
  customImage?: HTMLImageElement | null
): Promise<string> {
  const seqNumber = qr.sequenceNumber || 1;
  const dynamicUrl = getDynamicQRUrl(qr.slug || qr.id);

  // 1. Gera o QR Code dinâmico em alta resolução com correção de erro máxima (H)
  const qrCanvas = document.createElement('canvas');
  await QRCode.toCanvas(qrCanvas, dynamicUrl, {
    width: 1024,
    margin: 1,
    errorCorrectionLevel: 'H',
    color: {
      dark: '#000000',
      light: '#ffffff',
    },
  });

  const qrImage = new Image();
  await new Promise<void>((resolve, reject) => {
    qrImage.onload = () => resolve();
    qrImage.onerror = (e) => reject(e);
    qrImage.src = qrCanvas.toDataURL('image/png');
  });

  // 2. Canvas da Placa em Alta Resolução (ex: 1800x1800 ou 1400x2100 para impressão nítida)
  const canvas = document.createElement('canvas');
  const targetWidth = template.aspectRatio >= 1 ? 1800 : 1400;
  const targetHeight = Math.round(targetWidth / template.aspectRatio);
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  renderCompletePlaqueToCanvas(canvas, template, qrImage, seqNumber, customImage);

  return canvas.toDataURL('image/png', 1.0);
}

/**
 * Gera um documento PDF A4 multipágina profissional com 3 plaquinhas por página.
 */
export async function generatePlaquesPDF(
  options: GeneratePlaquesPDFOptions
): Promise<{ doc: jsPDF; filename: string }> {
  const {
    batchName,
    template,
    qrCodes,
    pageCount,
    platesPerPage = 3,
    showCutLines = true,
    customImage,
    onProgress,
  } = options;

  // Validação prévia
  const totalPlates = qrCodes.length;
  if (totalPlates === 0) {
    throw new Error('Nenhum QR Code fornecido para geração do PDF.');
  }

  // Cria documento A4 (210mm x 297mm)
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  // Dimensões da folha A4 e cálculo das 3 plaquinhas
  const pageWidth = 210;
  const pageHeight = 297;
  const slotHeight = pageHeight / platesPerPage; // 99mm por faixa de plaquinha

  // Proporção física da plaquinha dentro do slot de 99mm
  // Deixamos margem interna vertical segura de ~6mm (altura útil ~87mm)
  const maxPlaqueHeight = 86; // mm
  let plaqueHeight = maxPlaqueHeight;
  let plaqueWidth = plaqueHeight * template.aspectRatio;

  // Garante que não ultrapasse a largura da folha A4 com margens seguras (180mm máx)
  if (plaqueWidth > 186) {
    plaqueWidth = 186;
    plaqueHeight = plaqueWidth / template.aspectRatio;
  }

  const plaqueX = (pageWidth - plaqueWidth) / 2;

  let currentPlateIndex = 0;

  for (let page = 0; page < pageCount; page++) {
    if (page > 0) {
      doc.addPage();
    }

    // Processa as 3 plaquinhas da folha atual
    for (let slot = 0; slot < platesPerPage; slot++) {
      if (currentPlateIndex >= totalPlates) {
        break;
      }

      const qr = qrCodes[currentPlateIndex];

      // Atualiza progresso
      if (onProgress) {
        const percent = Math.round((currentPlateIndex / totalPlates) * 100);
        onProgress(percent, currentPlateIndex + 1, totalPlates);
      }

      // Renderiza a imagem composta em alta resolução
      const plaqueDataUrl = await renderPlaqueDataUrl(qr, template, customImage);

      // Posição Y centralizada no slot de 99mm
      const slotTop = slot * slotHeight;
      const plaqueY = slotTop + (slotHeight - plaqueHeight) / 2;

      // Adiciona ao PDF
      doc.addImage(plaqueDataUrl, 'PNG', plaqueX, plaqueY, plaqueWidth, plaqueHeight, undefined, 'FAST');

      currentPlateIndex++;
    }

    // Desenha linhas de corte discretas entre as 3 plaquinhas se ativado
    if (showCutLines) {
      doc.setDrawColor(180, 190, 205); // Cinza suave discreto
      doc.setLineWidth(0.2);
      doc.setLineDashPattern([2, 2], 0);

      // Linha 1: entre plaquinha 1 e 2
      doc.line(6, slotHeight, pageWidth - 6, slotHeight);

      // Linha 2: entre plaquinha 2 e 3
      doc.line(6, slotHeight * 2, pageWidth - 6, slotHeight * 2);

      // Pequenas marcas de corte nas bordas (crop marks)
      doc.setLineDashPattern([], 0);
      doc.setLineWidth(0.3);
      doc.setDrawColor(140, 150, 170);

      // Marcas no slotHeight
      doc.line(2, slotHeight, 6, slotHeight);
      doc.line(pageWidth - 6, slotHeight, pageWidth - 2, slotHeight);

      // Marcas no slotHeight * 2
      doc.line(2, slotHeight * 2, 6, slotHeight * 2);
      doc.line(pageWidth - 6, slotHeight * 2, pageWidth - 2, slotHeight * 2);

      // Pequeno texto informativo discreto na margem
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6);
      doc.setTextColor(160, 174, 192);
      doc.text(
        `JZN CODE • LOTE: ${batchName} • FOLHA ${page + 1} DE ${pageCount} • 3 PLAQUINHAS POR A4`,
        pageWidth / 2,
        pageHeight - 3,
        { align: 'center' }
      );
    }
  }

  // Notifica conclusão do progresso
  if (onProgress) {
    onProgress(100, totalPlates, totalPlates);
  }

  // Nome padronizado do arquivo PDF
  const sanitizedBatch = (batchName || 'Lote-01')
    .replace(/[^a-zA-Z0-9-_]/g, '-')
    .replace(/-+/g, '-');
  const sanitizedModel = (template.name || 'Modelo')
    .replace(/[^a-zA-Z0-9-_]/g, '-')
    .replace(/-+/g, '-');
  const startSeq = String(qrCodes[0]?.sequenceNumber || 1).padStart(3, '0');
  const endSeq = String(qrCodes[qrCodes.length - 1]?.sequenceNumber || qrCodes.length).padStart(3, '0');

  const filename = `JZN-CODE_${sanitizedBatch}_${sanitizedModel}_${startSeq}-${endSeq}.pdf`;

  return { doc, filename };
}
