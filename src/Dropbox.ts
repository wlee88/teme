import { uuid } from 'uuidv4';

import { randomNumber } from './utils';
import * as fs from 'fs';
const dropboxV2Api = require('dropbox-v2-api');

const { DROPBOX_API_KEY } = process.env;

// TODO: interface this and move to client folder

type DropboxCallback = (
  err: Error,
  result: {
    id: string;
    entries: [{ path_lower: string; name: string }];
    url: string;
  }
) => void;

const client = (() => {
  const dropbox = dropboxV2Api.authenticate({
    token: DROPBOX_API_KEY,
  });

  console.log({ DROPBOX_API_KEY });
  const getRandomFile = (folderPath: string): Promise<string> =>
    new Promise((resolve, reject) => {
      console.log({ folderPath });
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
      dropbox(
        {
          resource: 'files/list_folder',
          parameters: {
            path: folderPath,
          },
        },
        callback
      );
    });

  const downloadFile = (path: string, destination: string) =>
    new Promise((resolve, reject) => {
      console.log('download file', { path, destination });
      const callback: DropboxCallback = (err, result) => {
        if (err) {
          reject(err);
        }
        resolve(result);
      };
      dropbox(
        {
          resource: 'files/download',
          parameters: {
            path,
          },
        },
        callback
      ).pipe(fs.createWriteStream(destination));
    });

  const upload = (fileStream: string, path: string) =>
    new Promise((resolve, reject) => {
      console.log('upload', { path });
      const callback: DropboxCallback = (err, result) => {
        err ? reject(err) : resolve(result);
      };
      dropbox(
        {
          resource: 'files/upload',
          parameters: { path },
          readStream: fileStream,
        },
        callback
      );
    });

  const getShareableUrl = (path: string) =>
    new Promise((resolve, reject) => {
      console.log('getShareableUrl', { path });
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
      dropbox(
        {
          resource: 'sharing/create_shared_link_with_settings',
          parameters: { path },
        },
        callback
      );
    });

  const deleteFile = (id: string) =>
    new Promise<void>((resolve, reject) => {
      console.log('deleteFile', { id });
      const callback: DropboxCallback = (err, result) => {
        if (err) reject(err);
        resolve();
      };
      dropbox(
        {
          resource: 'file_requests/delete',
          parameters: { ids: [id] },
        },
        callback
      );
    });

  const getFolderContents = (path: string) =>
    new Promise((resolve, reject) => {
      console.log('path', { path });
      const callback: DropboxCallback = (err, result) => {
        console.log('list_folder', { result });
        if (err) reject(err);
        const { entries } = result;
        const folders = entries.map((entry) => entry.name);
        resolve(folders);
      };
      dropbox(
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

  const getIdFromSharedUrl = (url: string): Promise<string> =>
    new Promise((resolve, reject) => {
      const downloadableUrl = url.replace(
        'dl.dropboxusercontent.com',
        'www.dropbox.com'
      );

      const callback: DropboxCallback = (err, result) => {
        if (err) reject(err);
        console.log({ result });
        const { id } = result;
        const response = id.replace('id:', '');
        resolve(response);
      };

      dropbox(
        {
          resource: 'sharing/get_shared_link_metadata',
          parameters: { url: downloadableUrl },
        },
        callback
      );
    });

  return {
    getFolderContents: async (path: string) => getFolderContents(path),
    deleteFileBySharedLink: async (url: string) => {
      console.log('deleteFile', { url });
      try {
        const dropboxPath = await getIdFromSharedUrl(url);
        await deleteFile(dropboxPath);
      } catch (error) {
        console.log({ error });
      }
    },
    getAndDownloadRandomFile: async (
      folderPath: string,
      destination: string
    ) => {
      console.log('getAndDownloadRandomFile', { folderPath });
      try {
        const path = await getRandomFile(folderPath);
        console.log('randomFile', { path });
        await downloadFile(path, destination);
      } catch (error) {
        console.log({ error });
      }
    },
    uploadAndGenerateUrl: async (stream: string, clientFolderPath: string) => {
      console.log('uploadAndGenerateUrl', { clientFolderPath });
      try {
        const randomFileName = `${uuid()}.jpg`;
        const dropboxFilePath = `${clientFolderPath}${randomFileName}`;
        await upload(stream, dropboxFilePath);
        return getShareableUrl(dropboxFilePath);
      } catch (error) {
        console.log({ error });
      }
    },
  };
})();

exports.memeClient = client;
