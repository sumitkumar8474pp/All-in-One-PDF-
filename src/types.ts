export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  createdAt: string;
  role: 'user' | 'admin';
}

export interface PDFDocument {
  id: string;
  ownerId: string;
  name: string;
  url: string;
  type: 'image-to-pdf' | 'merge' | 'split';
  createdAt: string;
  size?: number;
}

export type AppView = 
  | 'home' 
  | 'image-to-pdf' 
  | 'merge' 
  | 'split' 
  | 'viewer' 
  | 'compress' 
  | 'pdf-to-image' 
  | 'password' 
  | 'watermark' 
  | 'rotate' 
  | 'delete-pages' 
  | 'extract-pages' 
  | 'reorder-pages'
  | 'remove-password'
  | 'edit'
  | 'text-to-pdf'
  | 'settings';

export interface UserSettings {
  darkMode: boolean;
  saveLocation: 'cloud' | 'local';
  namingFormat: string;
  pdfQuality: 'low' | 'medium' | 'high';
  autoDeleteDays: number;
  language: string;
}
