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
}
