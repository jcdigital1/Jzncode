import { PlaqueTemplate } from '../types';

export const PLAQUE_TEMPLATES: PlaqueTemplate[] = [
  {
    id: 'template-01-azul',
    name: 'Modelo 01 — Azul',
    subtitle: 'NÓS GOSTARÍAMOS DA SUA OPINIÃO NO GOOGLE',
    theme: 'blue',
    description: 'Arte clássica em azul Google com estrelas douradas, onda multicolorida e destaque para câmera e NFC.',
    aspectRatio: 1.0, // Quadrado
    baseWidth: 1000,
    baseHeight: 1000,
    thumbnailUrl: '/templates/modelo-01-thumb.svg',
    // Posição exata do QR Code: lado esquerdo, abaixo de "APONTE A CÂMERA"
    qrX: 100,
    qrY: 600,
    qrWidth: 290,
    qrHeight: 290,
    qrQuietZone: 10,
    // Identificação principal da placa (canto superior direito seguro)
    labelX: 950,
    labelY: 42,
    labelPrefix: 'PLACA',
    labelColor: '#ffffff',
    labelFontSize: 22,
    labelFontWeight: '800',
    labelAlign: 'right',
    labelShowBox: true,
    labelBoxBg: 'rgba(0, 0, 0, 0.45)',
    labelBoxBorder: 'rgba(255, 255, 255, 0.4)',
    // Identificação logo abaixo do QR Code físico
    qrLabelX: 245,
    qrLabelY: 915,
    qrLabelColor: '#0f172a',
    qrLabelFontSize: 18,
  },
  {
    id: 'template-02-preto',
    name: 'Modelo 02 — Preto',
    subtitle: 'NÓS GOSTARÍAMOS DA SUA OPINIÃO NO GOOGLE',
    theme: 'black',
    description: 'Design premium escuro com contraste elegante, estrelas douradas, onda Google e ícone NFC.',
    aspectRatio: 1.0, // Quadrado
    baseWidth: 1000,
    baseHeight: 1000,
    thumbnailUrl: '/templates/modelo-02-thumb.svg',
    // Posição exata do QR Code: lado esquerdo, abaixo de "APONTE A CÂMERA"
    qrX: 100,
    qrY: 600,
    qrWidth: 290,
    qrHeight: 290,
    qrQuietZone: 10,
    // Identificação principal da placa
    labelX: 950,
    labelY: 42,
    labelPrefix: 'PLACA',
    labelColor: '#ffffff',
    labelFontSize: 22,
    labelFontWeight: '800',
    labelAlign: 'right',
    labelShowBox: true,
    labelBoxBg: 'rgba(255, 255, 255, 0.2)',
    labelBoxBorder: 'rgba(255, 255, 255, 0.4)',
    // Identificação logo abaixo do QR Code físico
    qrLabelX: 245,
    qrLabelY: 915,
    qrLabelColor: '#0f172a',
    qrLabelFontSize: 18,
  },
  {
    id: 'template-03-branco',
    name: 'Modelo 03 — Branco',
    subtitle: 'DEIXE SUA AVALIAÇÃO NO GOOGLE',
    theme: 'white',
    description: 'Plaquinha vertical no padrão Google Meu Negócio, com quadro quadrado reservado para o QR Code.',
    aspectRatio: 0.67, // 1000 x 1500 (Vertical)
    baseWidth: 1000,
    baseHeight: 1500,
    thumbnailUrl: '/templates/modelo-03-thumb.svg',
    // O QR Code ocupa perfeitamente a moldura quadrada vazia do lado esquerdo
    qrX: 68,
    qrY: 535,
    qrWidth: 364,
    qrHeight: 364,
    qrQuietZone: 12,
    // Identificação principal na base da placa
    labelX: 500,
    labelY: 1445,
    labelPrefix: 'PLACA',
    labelColor: '#0f172a',
    labelFontSize: 24,
    labelFontWeight: '800',
    labelAlign: 'center',
    labelShowBox: true,
    labelBoxBg: '#f1f5f9',
    labelBoxBorder: '#cbd5e1',
    // Identificação no interior/base do quadro do QR
    qrLabelX: 250,
    qrLabelY: 928,
    qrLabelColor: '#0f172a',
    qrLabelFontSize: 18,
  },
];

export function getTemplateById(id: string): PlaqueTemplate {
  const found = PLAQUE_TEMPLATES.find((t) => t.id === id);
  return found || PLAQUE_TEMPLATES[0];
}
