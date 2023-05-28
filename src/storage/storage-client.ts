import { Readable } from 'stream';

export interface StorageClient {
  getFolderContents: (path: string) => Promise<string[]>;
  deleteFileBySharedLink: (url: string) => Promise<void>;
  getAndDownloadRandomFile: (
    folderPath: string,
    destination: string
  ) => Promise<void>;
  uploadAndGetPublicUrl: (
    stream: Readable,
    clientFolderPath: string
  ) => Promise<string>;
}
