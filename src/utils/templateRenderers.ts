import { PlaqueTemplate } from '../types';

/**
 * Desenha o logo 'G' do Google com fidelidade vetorial nas cores oficiais.
 */
export function drawGoogleGLogo(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number
) {
  ctx.save();
  ctx.translate(cx, cy);

  // Fundo circular branco com sombra sutil
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(0, 0, radius * 1.35, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = radius * 0.08;
  ctx.strokeStyle = '#e2e8f0';
  ctx.stroke();

  const r = radius;
  const lw = r * 0.42;

  // Arco Azul (Right & Top)
  ctx.strokeStyle = '#4285f4';
  ctx.lineWidth = lw;
  ctx.lineCap = 'butt';
  ctx.beginPath();
  ctx.arc(0, 0, r, -Math.PI * 0.25, Math.PI * 0.25);
  ctx.stroke();

  // Arco Verde (Bottom Right to Bottom Left)
  ctx.strokeStyle = '#34a853';
  ctx.beginPath();
  ctx.arc(0, 0, r, Math.PI * 0.25, Math.PI * 0.75);
  ctx.stroke();

  // Arco Amarelo (Bottom Left to Top Left)
  ctx.strokeStyle = '#fbbc05';
  ctx.beginPath();
  ctx.arc(0, 0, r, Math.PI * 0.75, Math.PI * 1.25);
  ctx.stroke();

  // Arco Vermelho (Top Left to Top Right)
  ctx.strokeStyle = '#ea4335';
  ctx.beginPath();
  ctx.arc(0, 0, r, Math.PI * 1.25, Math.PI * 1.75);
  ctx.stroke();

  // Barra horizontal do G
  ctx.fillStyle = '#4285f4';
  ctx.fillRect(0, -lw * 0.5, r * 1.05, lw);

  ctx.restore();
}

/**
 * Desenha as 5 estrelas douradas de avaliação.
 */
export function drawFiveStars(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  starSize: number,
  spacing: number = 10
) {
  ctx.save();
  const totalWidth = 5 * starSize + 4 * spacing;
  let startX = cx - totalWidth / 2;

  for (let i = 0; i < 5; i++) {
    const x = startX + i * (starSize + spacing) + starSize / 2;
    drawStar(ctx, x, cy, 5, starSize / 2, starSize / 4, '#fabd05');
  }
  ctx.restore();
}

function drawStar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  spikes: number,
  outerRadius: number,
  innerRadius: number,
  fillColor: string
) {
  let rot = (Math.PI / 2) * 3;
  let x = cx;
  let y = cy;
  const step = Math.PI / spikes;

  ctx.beginPath();
  ctx.moveTo(cx, cy - outerRadius);
  for (let i = 0; i < spikes; i++) {
    x = cx + Math.cos(rot) * outerRadius;
    y = cy + Math.sin(rot) * outerRadius;
    ctx.lineTo(x, y);
    rot += step;

    x = cx + Math.cos(rot) * innerRadius;
    y = cy + Math.sin(rot) * innerRadius;
    ctx.lineTo(x, y);
    rot += step;
  }
  ctx.lineTo(cx, cy - outerRadius);
  ctx.closePath();
  ctx.fillStyle = fillColor;
  ctx.fill();
}

/**
 * Desenha a ilustração NFC com a mão segurando o celular.
 */
export function drawNFCHandIllustration(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  scale: number = 1.0
) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);

  // Círculo com "NFC" e arcos
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.arc(-40, 20, 75, -Math.PI * 0.7, Math.PI * 0.75);
  ctx.stroke();

  // Texto NFC
  ctx.fillStyle = '#0f172a';
  ctx.font = '900 36px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('NFC', -70, 20);

  // Ondas de sinal NFC
  ctx.lineWidth = 8;
  for (let i = 1; i <= 3; i++) {
    ctx.beginPath();
    ctx.arc(-25, 20, 22 + i * 16, -Math.PI * 0.35, Math.PI * 0.35);
    ctx.stroke();
  }

  // Celular (retângulo com bordas arredondadas)
  const phoneX = 35;
  const phoneY = -40;
  const phoneW = 90;
  const phoneH = 150;
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.roundRect(phoneX, phoneY, phoneW, phoneH, 16);
  ctx.fill();
  ctx.stroke();

  // Tela interna do celular
  ctx.fillStyle = '#f1f5f9';
  ctx.fillRect(phoneX + 8, phoneY + 14, phoneW - 16, phoneH - 28);

  // Mão / silhueta segurando o aparelho
  ctx.fillStyle = '#1e293b';
  // Dedos do lado direito
  ctx.beginPath();
  ctx.roundRect(phoneX + phoneW - 14, phoneY + 45, 26, 18, 9);
  ctx.roundRect(phoneX + phoneW - 14, phoneY + 70, 26, 18, 9);
  ctx.roundRect(phoneX + phoneW - 14, phoneY + 95, 26, 18, 9);
  ctx.fill();

  // Polegar do lado esquerdo
  ctx.beginPath();
  ctx.roundRect(phoneX - 12, phoneY + 60, 24, 20, 10);
  ctx.fill();

  // Base da mão / pulso
  ctx.beginPath();
  ctx.moveTo(phoneX + 25, phoneY + phoneH - 5);
  ctx.lineTo(phoneX + phoneW + 15, phoneY + phoneH + 45);
  ctx.lineTo(phoneX + phoneW - 15, phoneY + phoneH + 55);
  ctx.lineTo(phoneX + 15, phoneY + phoneH + 20);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

/**
 * Desenha o logo oficial "Google" com as cores corporativas autênticas.
 */
export function drawGoogleTextLogo(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  fontSize: number = 60
) {
  ctx.save();
  ctx.font = `800 ${fontSize}px "Product Sans", "Segoe UI", Roboto, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const letters = [
    { char: 'G', color: '#4285f4' },
    { char: 'o', color: '#ea4335' },
    { char: 'o', color: '#fbbc05' },
    { char: 'g', color: '#4285f4' },
    { char: 'l', color: '#34a853' },
    { char: 'e', color: '#ea4335' },
  ];

  // Medir largura total
  let fullWidth = 0;
  const widths = letters.map((l) => {
    const w = ctx.measureText(l.char).width;
    fullWidth += w;
    return w;
  });

  let currentX = cx - fullWidth / 2;
  letters.forEach((l, idx) => {
    ctx.fillStyle = l.color;
    ctx.fillText(l.char, currentX + widths[idx] / 2, cy);
    currentX += widths[idx];
  });

  ctx.restore();
}

/**
 * Desenha o ícone azul de Fachada / Loja do Google Business.
 */
export function drawStoreIcon(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number = 80
) {
  ctx.save();
  ctx.translate(cx - size / 2, cy - size / 2);
  const s = size / 100;
  ctx.scale(s, s);

  // Toldo superior
  ctx.fillStyle = '#4285f4';
  ctx.beginPath();
  ctx.moveTo(10, 35);
  ctx.lineTo(90, 35);
  ctx.lineTo(80, 10);
  ctx.lineTo(20, 10);
  ctx.closePath();
  ctx.fill();

  // Faixas do toldo (arcos inferiores)
  ctx.fillStyle = '#5a95f5';
  for (let i = 0; i < 5; i++) {
    const x = 10 + i * 16;
    ctx.beginPath();
    ctx.arc(x + 8, 35, 8, 0, Math.PI);
    ctx.fill();
  }

  // Corpo da loja
  ctx.fillStyle = '#e8f0fe';
  ctx.fillRect(20, 38, 60, 52);

  // Porta / Arco central
  ctx.fillStyle = '#1967d2';
  ctx.beginPath();
  ctx.moveTo(40, 90);
  ctx.lineTo(40, 60);
  ctx.arc(50, 60, 10, Math.PI, 0);
  ctx.lineTo(60, 90);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

/**
 * RENDERIZA A CAMADA 1 (ARTE BASE) EM ALTA RESOLUÇÃO NO CANVAS.
 * Se o usuário tiver enviado imagem personalizada, desenha a imagem.
 * Caso contrário, desenha o layout fiel e original dos modelos 01, 02 e 03.
 */
export function renderBaseArtwork(
  template: PlaqueTemplate,
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  customImage?: HTMLImageElement | null
) {
  if (customImage && customImage.complete && customImage.naturalWidth > 0) {
    ctx.drawImage(customImage, 0, 0, width, height);
    return;
  }

  const scaleX = width / template.baseWidth;
  const scaleY = height / template.baseHeight;
  ctx.save();
  ctx.scale(scaleX, scaleY);

  if (template.theme === 'blue' || template.theme === 'black') {
    // ==========================================
    // MODELO 01 (AZUL) & MODELO 02 (PRETO)
    // ==========================================
    const isBlue = template.theme === 'blue';
    const headerBg = isBlue ? '#0a63de' : '#0a0c10';

    // Fundo Superior (Azul ou Preto)
    ctx.fillStyle = headerBg;
    ctx.fillRect(0, 0, 1000, 480);

    // Fundo Inferior (Branco / Cinza Claro Sutil)
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 450, 1000, 550);

    // 5 Estrelas Douradas no Topo
    drawFiveStars(ctx, 500, 75, 48, 14);

    // Texto: NÓS GOSTARÍAMOS DA
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 48px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.letterSpacing = '1px';
    ctx.fillText('NÓS GOSTARÍAMOS DA', 500, 160);

    // Texto: SUA OPINIÃO NO GOOGLE
    ctx.font = '900 52px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('SUA OPINIÃO NO GOOGLE', 500, 230);

    // Onda Google com 4 cores fluindo da esquerda para a direita
    const waveY = 410;
    const colors = ['#ea4335', '#fbbc05', '#34a853', '#4285f4'];
    const waveThickness = 14;

    colors.forEach((col, idx) => {
      ctx.strokeStyle = col;
      ctx.lineWidth = waveThickness;
      ctx.beginPath();
      const offset = (idx - 1.5) * (waveThickness - 1);
      ctx.moveTo(-20, waveY + offset);
      ctx.bezierCurveTo(
        280,
        waveY + 60 + offset,
        650,
        waveY - 70 + offset,
        1020,
        waveY - 10 + offset
      );
      ctx.stroke();
    });

    // Logo Google "G" centralizado sobre a divisão
    drawGoogleGLogo(ctx, 500, 415, 62);

    // Coluna Esquerda: APONTE A CÂMERA
    ctx.fillStyle = '#0f172a';
    ctx.font = '900 32px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('APONTE A CÂMERA', 245, 555);

    // Divisor central vertical
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(500, 535);
    ctx.lineTo(500, 680);
    ctx.moveTo(500, 740);
    ctx.lineTo(500, 870);
    ctx.stroke();

    // Pílula central "ou"
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(500, 710, 30, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('ou', 500, 718);

    // Coluna Direita: APROXIME O CELULAR
    ctx.fillStyle = '#0f172a';
    ctx.font = '900 32px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('APROXIME O CELULAR', 740, 555);

    // Ilustração NFC com mão e celular
    drawNFCHandIllustration(ctx, 740, 700, 1.05);

    // Barra inferior com as cores do Google
    const barH = 18;
    const barY = 982;
    const quadW = 250;
    ctx.fillStyle = '#ea4335';
    ctx.fillRect(0, barY, quadW, barH);
    ctx.fillStyle = '#fbbc05';
    ctx.fillRect(quadW, barY, quadW, barH);
    ctx.fillStyle = '#34a853';
    ctx.fillRect(quadW * 2, barY, quadW, barH);
    ctx.fillStyle = '#4285f4';
    ctx.fillRect(quadW * 3, barY, quadW, barH);
  } else {
    // ==========================================
    // MODELO 03 (BRANCO VERTICAL 1000 x 1500)
    // ==========================================
    // Fundo suave
    ctx.fillStyle = '#fafbfc';
    ctx.fillRect(0, 0, 1000, 1500);

    // Barra Superior Google
    const topBarH = 24;
    const qW = 250;
    ctx.fillStyle = '#34a853';
    ctx.fillRect(0, 0, qW, topBarH);
    ctx.fillStyle = '#fbbc05';
    ctx.fillRect(qW, 0, qW, topBarH);
    ctx.fillStyle = '#ea4335';
    ctx.fillRect(qW * 2, 0, qW, topBarH);
    ctx.fillStyle = '#4285f4';
    ctx.fillRect(qW * 3, 0, qW, topBarH);

    // Ícone da Loja / Business Awning
    drawStoreIcon(ctx, 500, 105, 110);

    // Textos de Topo
    ctx.fillStyle = '#0f172a';
    ctx.font = '800 46px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('DEIXE SUA', 500, 205);

    ctx.font = '900 68px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('AVALIAÇÃO NO', 500, 275);

    // Logo Google colorido
    drawGoogleTextLogo(ctx, 500, 365, 82);

    // 5 Estrelas Douradas
    drawFiveStars(ctx, 500, 440, 52, 16);

    // Moldura Esquerda (Quadrada com cantos arredondados) — ONDE O QR CODE SERÁ INSERIDO
    const boxW = 400;
    const boxH = 400;
    const boxR = 40;
    const leftBoxX = 50;
    const boxY = 510;

    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 6;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(leftBoxX, boxY, boxW, boxH, boxR);
    ctx.fill();
    ctx.stroke();

    // Texto abaixo da moldura esquerda: APROXIME SUA CÂMERA
    ctx.fillStyle = '#000000';
    ctx.font = '900 32px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('APROXIME SUA', leftBoxX + boxW / 2, boxY + boxH + 52);
    ctx.fillText('CAMERA', leftBoxX + boxW / 2, boxY + boxH + 90);

    // Moldura Direita (Quadrada com cantos arredondados) — ÍCONE NFC
    const rightBoxX = 550;
    ctx.beginPath();
    ctx.roundRect(rightBoxX, boxY, boxW, boxH, boxR);
    ctx.fill();
    ctx.stroke();

    // Ondas NFC na moldura direita
    ctx.save();
    ctx.translate(rightBoxX + boxW / 2, boxY + 160);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 22;
    ctx.lineCap = 'round';

    // 3 arcos
    for (let r = 1; r <= 3; r++) {
      ctx.beginPath();
      ctx.arc(0, 0, 40 + r * 35, -Math.PI * 0.75, -Math.PI * 0.25);
      ctx.stroke();
    }

    // Texto NFC
    ctx.fillStyle = '#000000';
    ctx.font = '900 78px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('NFC', 0, 115);
    ctx.restore();

    // Texto abaixo da moldura direita: APROXIME SEU CELULAR
    ctx.fillStyle = '#000000';
    ctx.font = '900 32px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('APROXIME SEU', rightBoxX + boxW / 2, boxY + boxH + 52);
    ctx.fillText('CELULAR', rightBoxX + boxW / 2, boxY + boxH + 90);

    // Logo Google inferior
    drawGoogleTextLogo(ctx, 500, 1140, 70);

    // Barra Inferior Google
    const bBarY = 1475;
    ctx.fillStyle = '#34a853';
    ctx.fillRect(0, bBarY, qW, topBarH);
    ctx.fillStyle = '#fbbc05';
    ctx.fillRect(qW, bBarY, qW, topBarH);
    ctx.fillStyle = '#ea4335';
    ctx.fillRect(qW * 2, bBarY, qW, topBarH);
    ctx.fillStyle = '#4285f4';
    ctx.fillRect(qW * 3, bBarY, qW, topBarH);
  }

  ctx.restore();
}

/**
 * Renderiza uma plaquinha completa em um Canvas (Camada 1 + Camada 2 + Camada 3).
 */
export function renderCompletePlaqueToCanvas(
  canvas: HTMLCanvasElement,
  template: PlaqueTemplate,
  qrImage: HTMLImageElement,
  sequenceNumber: number,
  customImage?: HTMLImageElement | null
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const w = canvas.width;
  const h = canvas.height;
  const scaleX = w / template.baseWidth;
  const scaleY = h / template.baseHeight;

  // Limpa o canvas
  ctx.clearRect(0, 0, w, h);

  // CAMADA 1: Arte Base
  renderBaseArtwork(template, ctx, w, h, customImage);

  // CAMADA 2: QR Code Dinâmico
  const qrX = template.qrX * scaleX;
  const qrY = template.qrY * scaleY;
  const qrW = template.qrWidth * scaleX;
  const qrH = template.qrHeight * scaleY;

  // Fundo branco limpo para quiet zone
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.roundRect(qrX, qrY, qrW, qrH, 12 * scaleX);
  ctx.fill();

  // Desenha o QR Code
  ctx.drawImage(qrImage, qrX, qrY, qrW, qrH);

  // CAMADA 3: Identificação Física da Placa (ex: "PLACA 001")
  const seqStr = String(sequenceNumber).padStart(3, '0');
  const labelText = `${template.labelPrefix} ${seqStr}`;

  ctx.save();
  const fontSize = template.labelFontSize * scaleX;
  ctx.font = `${template.labelFontWeight} ${fontSize}px "JetBrains Mono", monospace, -apple-system, sans-serif`;
  ctx.textAlign = template.labelAlign;
  ctx.textBaseline = 'middle';

  const labelX = template.labelX * scaleX;
  const labelY = template.labelY * scaleY;

  if (template.labelShowBox) {
    const metrics = ctx.measureText(labelText);
    const padX = 14 * scaleX;
    const padY = 8 * scaleY;
    const boxW = metrics.width + padX * 2;
    const boxH = fontSize + padY * 2;

    let boxLeft = labelX - padX;
    if (template.labelAlign === 'center') {
      boxLeft = labelX - boxW / 2;
    } else if (template.labelAlign === 'right') {
      boxLeft = labelX - boxW + padX;
    }

    ctx.fillStyle = template.labelBoxBg || 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.roundRect(boxLeft, labelY - boxH / 2, boxW, boxH, 8 * scaleX);
    ctx.fill();

    if (template.labelBoxBorder) {
      ctx.strokeStyle = template.labelBoxBorder;
      ctx.lineWidth = 1.5 * scaleX;
      ctx.stroke();
    }
  }

  ctx.fillStyle = template.labelColor;
  ctx.fillText(labelText, labelX, labelY);

  // Identificação secundária logo abaixo do QR Code
  const qrLabelFontSize = template.qrLabelFontSize * scaleX;
  ctx.font = `800 ${qrLabelFontSize}px "JetBrains Mono", monospace, -apple-system, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillStyle = template.qrLabelColor;
  ctx.fillText(`CÓD. ${seqStr}`, template.qrLabelX * scaleX, template.qrLabelY * scaleY);

  ctx.restore();
}
