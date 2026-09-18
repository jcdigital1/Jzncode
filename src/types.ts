export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  createdAt: any;
  updatedAt: any;
}

export interface DynamicQRCode {
  id: string;
  userId: string;
  name: string;
  slug: string;
  destinationUrl: string;
  active: boolean;
  createdAt: any;
  updatedAt: any;
  scansCount?: number;
  lastScanAt?: any;
  googlePlaceId?: string;
  googleBusinessId?: string;
  nfcReady?: boolean;
  // Campos para geração em lote / plaquinhas
  batchId?: string;
  batchName?: string;
  sequenceNumber?: number;
  prefix?: string;
  creationMode?: 'single' | 'bulk';
  status?: 'available' | 'active' | 'inactive';
  clientName?: string;
  printed?: boolean;
  lastPrintedAt?: any;
}

export interface QRBatch {
  id: string;
  userId: string;
  name: string;
  prefix: string;
  quantity: number;
  availableCount: number;
  configuredCount: number;
  startNumber: number;
  endNumber: number;
  createdAt: any;
  updatedAt: any;
}

export interface PlaqueTemplate {
  id: string;
  name: string;
  subtitle: string;
  theme: 'blue' | 'black' | 'white';
  description: string;
  aspectRatio: number; // width / height (ex: 1.0 para quadrado, ~0.67 para vertical)
  baseWidth: number;   // largura base do sistema de coordenadas (ex: 1000)
  baseHeight: number;  // altura base do sistema de coordenadas (ex: 1000 ou 1500)
  // Camada 1: Arte Base
  thumbnailUrl: string;
  customImageUrl?: string;
  // Camada 2: Área de Posicionamento do QR Code Dinâmico
  qrX: number;
  qrY: number;
  qrWidth: number;
  qrHeight: number;
  qrQuietZone: number;
  // Camada 3: Identificação Física da Placa (ex: "PLACA 001" ou "001")
  labelX: number;
  labelY: number;
  labelPrefix: string;
  labelColor: string;
  labelFontSize: number;
  labelFontWeight: string;
  labelAlign: 'left' | 'center' | 'right';
  labelShowBox?: boolean;
  labelBoxBg?: string;
  labelBoxBorder?: string;
  // Identificação secundária próxima ao QR (ex: "PLACA 001")
  qrLabelX: number;
  qrLabelY: number;
  qrLabelColor: string;
  qrLabelFontSize: number;
}

export interface PrintJob {
  id: string;
  userId: string;
  batchId: string;
  batchName: string;
  templateId: string;
  templateName: string;
  startSequence: number;
  endSequence: number;
  pageCount: number;
  plateCount: number;
  createdAt: any;
}

export interface GoogleBusiness {
  id: string;
  userId: string;
  name: string;
  placeId: string;
  reviewUrl: string;
  address?: string;
  city?: string;
  qrCodeId?: string;
  qrSlug?: string;
  qrName?: string;
  scansCount?: number;
  createdAt: any;
  updatedAt: any;
}
