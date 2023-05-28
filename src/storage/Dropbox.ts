import { uuid } from 'uuidv4';

import { randomNumber } from '../utils';
import * as fs from 'fs';
import { StorageClient } from './storage-client';
import { Readable } from 'stream';
const dropboxV2Api = require('dropbox-v2-api');

const { DROPBOX_API_KEY } = process.env;

type DropboxCallback = (err: Error, result: DropboxResult) => void;
type DropboxResult = {
  id: string;
  entries: [{ path_lower: string; name: string }];
  url: string;
};

// TODO: promisify and async functions
export class DropboxStorageClient implements StorageClient {
  dropbox: any;

  constructor(dropboxApiKey = DROPBOX_API_KEY) {
    this.dropbox = dropboxV2Api.authenticate({
      token: dropboxApiKey,
    });
  }

  getFolderContents(path: string): Promise<string[]> {
    return new Promise((resolve, reject) => {
      const callback: DropboxCallback = (err, result) => {
        if (err) reject(err);
        const { entries } = result;
        const folders = entries.map((entry) => entry.name);
        resolve(folders);
      };
      this.dropbox(
        {
          resource: 'files/list_folder',
          parameters: {
            path,
            recursive: false,
            include_media_info: false,
            include_deleted: false,
          },
        },
        callback
      );
    });
  }

  async uploadAndGetPublicUrl(
    stream: Readable,
    clientFolderPath: string
  ): Promise<string> {
    try {
      // TODO: choose a consistent image type.
      const randomFileName = `${uuid()}.jpg`;
      const dropboxFilePath = `${clientFolderPath}${randomFileName}`;
      await this.upload(stream, dropboxFilePath);
      return this.getShareableUrl(dropboxFilePath);
    } catch (error) {
      throw Error('Could not upload and generate URL');
    }
  }

  async deleteFileBySharedLink(url: string): Promise<void> {
    try {
      const dropboxPath = await this.getIdFromSharedUrl(url);
      return this.deleteFile(dropboxPath);
    } catch (error) {
      throw new Error('Could not deleteFileBySharedLink');
    }
  }

  async getAndDownloadRandomFile(
    folderPath: string,
    destination: string
  ): Promise<void> {
    try {
      const path = await this.getRandomFile(folderPath);
      await this.downloadFile(path, destination);
    } catch (error) {
      throw new Error('Could not get and download random file');
    }
  }

  private deleteFile(id: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const callback: DropboxCallback = (err, result) => {
        if (err) reject(err);
        resolve();
      };
      this.dropbox(
        {
          resource: 'file_requests/delete',
          parameters: { ids: [id] },
        },
        callback
      );
    });
  }

  private getRandomFile(folderPath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const callback: DropboxCallback = (err, result) => {
        if (err) {
          reject(err);
        }
        if (!result) {
          reject('no entries');
        }
        const { entries } = result;
        const path = entries[randomNumber(entries.length)].path_lower;
        resolve(path);
      };
      this.dropbox(
        {
          resource: 'files/list_folder',
          parameters: {
            path: folderPath,
          },
        },
        callback
      );
    });
  }

  private downloadFile(
    path: string,
    destination: string
  ): Promise<DropboxResult> {
    return new Promise((resolve, reject) => {
      const callback: DropboxCallback = (err, result) => {
        if (err) {
          reject(err);
        }
        resolve(result);
      };
      this.dropbox(
        {
          resource: 'files/download',
          parameters: {
            path,
          },
        },
        callback
      ).pipe(fs.createWriteStream(destination));
    });
  }

  private upload(readStream: Readable, path: string): Promise<DropboxResult> {
    return new Promise((resolve, reject) => {
      const callback: DropboxCallback = (err, result) => {
        err ? reject(err) : resolve(result);
      };
      this.dropbox(
        {
          resource: 'files/upload',
          parameters: { path },
          readStream,
        },
        callback
      );
    });
  }

  private getShareableUrl(path: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const callback: DropboxCallback = (err, result) => {
        if (err) reject(err);
        const { url } = result;
        // We need to do this because the url returned is not the downloadable url
        const downloadableUrl = url.replace(
          'www.dropbox.com',
          'dl.dropboxusercontent.com'
        );
        resolve(downloadableUrl);
      };
      this.dropbox(
        {
          resource: 'sharing/create_shared_link_with_settings',
          parameters: {
            path,
            settings: {
              requested_visibility: { '.tag': 'public' },
            },
          },
        },
        callback
      );
    });
  }

  private getIdFromSharedUrl(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const downloadableUrl = url.replace(
        'dl.dropboxusercontent.com',
        'www.dropbox.com'
      );

      const callback: DropboxCallback = (err, result) => {
        if (err) reject(err);
        const { id } = result;
        const response = id.replace('id:', '');
        resolve(response);
      };

      this.dropbox(
        {
          resource: 'sharing/get_shared_link_metadata',
          parameters: { url: downloadableUrl },
        },
        callback
      );
    });
  }
}
