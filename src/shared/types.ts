export type ShareType = 'file' | 'text';

export interface SharedFileItem {
  id: string;
  originalName: string;
  size: number;
  mimeType: string;
  extension: string;
  previewCategory: 'image' | 'text' | 'pdf' | 'docx' | 'archive' | 'other';
  downloadCount: number;
}

export interface ShareRecordPublic {
  id: string;
  type: ShareType;
  title: string;
  createdAt: number;
  expiresAt: number;
  downloadCount: number;
  viewCount: number;
  totalSize: number;
  textContent?: string;
  textFormat?: 'plain' | 'markdown' | 'code';
  shortUrl?: string;
  files: SharedFileItem[];
}

export interface CreateShareResponse {
  share: ShareRecordPublic;
  deleteToken: string;
  sharePath: string;
}

export interface SessionShareEntry {
  id: string;
  type: ShareType;
  title: string;
  totalSize: number;
  fileCount: number;
  createdAt: number;
  expiresAt: number;
  deleteToken: string;
}
