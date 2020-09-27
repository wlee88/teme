const { randomNumber } = require("./utils");
const { uuid } = require('uuidv4');
const fs = require('fs');

const dropboxV2Api = require('dropbox-v2-api');
const { DROPBOX_API_KEY } = process.env

const client = (() => {
    const dropbox = dropboxV2Api.authenticate({
        token: DROPBOX_API_KEY
    });

    const getRandomFile = (folderPath) => new Promise((resolve, reject) => {
        console.log({folderPath});
        dropbox({
            resource: 'files/list_folder',
            parameters: {
                path: folderPath
            }
        }, (err, result, _) => {
            if (err) {
                reject(err)
            }
            const { entries } = result
            const path = entries[randomNumber(entries.length - 1)].path_lower
            resolve(path)
        })
    })

    const downloadFile = (path, destination) => new Promise((resolve, reject) => {
        console.log('download file', {path, destination});
        dropbox({
            resource: 'files/download',
            parameters: {
                path
            }
        }, (err, result, _) => {
            if (err) {
                reject(err);
            }
            resolve(result);
        })
        .pipe(fs.createWriteStream(destination))
    });

    const upload = (fileStream, path) => new Promise((resolve, reject) => {
        console.log('upload', {path});
        dropbox({
            resource: 'files/upload',
            parameters: { path },
            readStream: fileStream
        }, (err, result, _) => {
            err ? reject(err) : resolve(result)
        })
    });

    const getShareableUrl = (path) => new Promise((resolve, reject) => {
        console.log('getShareableUrl', {path});
        dropbox({
            resource: 'sharing/create_shared_link_with_settings',
            parameters: { path }
        }, (err, result, _) => {
            if (err) reject(err);
            const { url } = result;
            // Replace www.dropbox.com with dl.dropboxusercontent.com
            const downloadableUrl = url.replace('www.dropbox.com', 'dl.dropboxusercontent.com');
            resolve(downloadableUrl)
        })
    })

    return {
        getAndDownloadRandomFile: async (folderPath, destination) => {
            console.log('getAndDownloadRandomFile', {folderPath});
            try {
                const path = await getRandomFile(folderPath)
                console.log('randomFile', {path})
                await downloadFile(path, destination)
            }
            catch(error) {
                console.log({error})
            }
        },
        uploadAndGenerateUrl: async (stream, clientFolderPath ) => {
            console.log('uploadAndGenerateUrl', {clientFolderPath});
            try {
                const randomFileName = `${uuid()}.jpg`;
                const dropboxFilePath = `${clientFolderPath}${randomFileName}`
                await upload(stream, dropboxFilePath)
                return getShareableUrl(dropboxFilePath)
            }
            catch(error) {
                console.log({error})
            }
        }
    };
})();

exports.memeClient = client
