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
