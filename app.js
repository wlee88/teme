require('dotenv').config()

const fs = require('fs');
const util = require('util')

const bodyParser = require('body-parser');
const axios = require('axios');
const express = require('express');
const sharp = require('sharp');
const memeMaker = require('meme-maker');
const { extractParams, extractParamsForMemeSay } = require("./utils");
const memeMakerPromise = util.promisify(memeMaker);

const { memeClient } = require('./Dropbox');

const app = express();

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }));

// parse application/json
app.use(bodyParser.json());

app.get('/', (_, reply) => {
  reply.sendStatus(200);
});

app.post('/', async (request, reply) => {

  const { body: { command }} = request;
  console.log({command})
  if (command.includes('meme-say')) {
    console.log('command is meme-say');
    const { response_url, GENERATED_MEMES_FOLDER, SOURCE_FOLDER, title, options } = extractParamsForMemeSay(request);

    (await memeClient.getAndDownloadRandomFile(SOURCE_FOLDER, options.image ))
    await memeMakerPromise(options);
    // Reply with ok - we'll send the meme when we're done.
    reply.send();

    const compressedImageStream = sharp(options.outfile)
        .resize({
          fit: sharp.fit.contain,
          width: 800
        })
        .jpeg({ quality: 80 });
    const clientFolderUploadPath = `${GENERATED_MEMES_FOLDER}/`
    const memeUrl = await memeClient.uploadAndGenerateUrl(compressedImageStream, clientFolderUploadPath, options.outfile)
    await sendToSlack(options, { memeUrl, title, response_url })
  } else {
    const { GENERATED_MEMES_FOLDER, SOURCE_FOLDER, options, response_url,title } = extractParams(request);

    (await memeClient.getAndDownloadRandomFile(SOURCE_FOLDER, options.image ))
    await memeMakerPromise(options);
    // Reply with ok - we'll send the meme when we're done.
    reply.send();

    const compressedImageStream = sharp(options.outfile)
        .resize({
          fit: sharp.fit.contain,
          width: 800
        })
        .jpeg({ quality: 80 });
    const clientFolderUploadPath = `${GENERATED_MEMES_FOLDER}/`
    const memeUrl = await memeClient.uploadAndGenerateUrl(compressedImageStream, clientFolderUploadPath, options.outfile)
    await sendToSlack(options, { memeUrl, title, response_url })
  }


});

const PORT = process.env.PORT || 3000;

app.listen(PORT, (err) => {
  if (err) console.error(err);
  console.log(`server listening on ${PORT}`);
});

async function sendToSlack(options, params) {
  const { memeUrl, title, response_url } = params;
  try {
    const response = {
      blocks: [
        {
          type: 'image',
          title: {
            type: 'plain_text',
            text: title
          },
          image_url: memeUrl,
          alt_text: title,
          block_id: 'derp'
        }
      ]
    };
    console.log({response: JSON.stringify(response)});
    fs.unlinkSync(options.image);
    fs.unlinkSync(options.outfile);

    await axios.post(response_url, {
      response_type: 'in_channel',
      text: title,
      attachments: [response]
    });
  } catch (error) {
    console.log({error})
  }
};

