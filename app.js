const { uuid } = require('uuidv4');

require('dotenv').config()

const fs = require('fs');
const bodyParser = require('body-parser');
const axios = require('axios');
const express = require('express');
const { helpText, listPeople, response, question} = require('./slack-utils');
const { autocorrect, extractParams, extractParamsForMemeSay } = require('./utils');
const { memeClient } = require('./Dropbox');
const Jimp = require('jimp');
const path = require('path');



const app = express();

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }));

// parse application/json
app.use(bodyParser.json());

app.get('/', (_, reply) => {
  reply.sendStatus(200);
});

// TODO: authenticate slack request
app.post('/', async (request, reply) => {
  console.log({request})
  console.log(request.body)
  const { body: { command }} = request;

  if (!command || command.includes('meme-say')) {
    console.log('command is meme-say');
    const { response_url, GENERATED_MEMES_FOLDER, SOURCE_FOLDER, title, text } = extractParamsForMemeSay(request);

    if (text && text.startsWith('list')) {
      reply.send()
      const folder = SOURCE_FOLDER.replace('/list','');
      const folders = await memeClient.getFolderContents(folder);
      await sendResponseToSlackWithAttachments({ response_url }, [listPeople(folders)])
      return
    }

    if (text && text.startsWith('help')) {
      reply.send()
      await sendResponseToSlackWithAttachments({ response_url}, [helpText()])
      return
    }

    const options = prepareOptions(text);
    const payload = request.body.payload ? JSON.parse(request.body.payload) : undefined
    if (payload && payload.actions && payload.actions.length > 0) {
      console.log("payload... ", payload);
      const { actions, response_url } = payload
      if (actions.some(action => action.text.text === "Cancel")) {
        const [_, __, ___, ____, imageUrl] = actions[0].value.split('|')
        console.log('cancel clicked');
        await deleteOriginal({ response_url })
        await memeClient.deleteFileBySharedLink(imageUrl)

      } else if (actions.some(action => action.text.text === "Shuffle")) {
        const [SOURCE_FOLDER, GENERATED_MEMES_FOLDER, text, title, imageUrl] = actions[0].value.split('|')

        const options = prepareOptions(text)
        const memeUrl = await generateMemeUrl(SOURCE_FOLDER, options, GENERATED_MEMES_FOLDER);
        reply.send()
        console.log({memeUrl, options, text, title, imageUrl})
        cleanup(options)
        await sendQuestionToSlack( { memeUrl, title, response_url, SOURCE_FOLDER, GENERATED_MEMES_FOLDER, text })
      } else {
        // send was sent - so use the specified url
        console.log('ok clicked')
        const [_, __, ___, title, memeUrl] = actions[0].value.split('|')
        await sendResponseToSlack({ memeUrl, title, response_url })
        reply.send(); // Reply with ok - we'll send the meme when we're done.
      }
    } else {
      reply.send(); // Reply with ok - we'll send the meme when we're done.
      const memeUrl = await generateMemeUrl(SOURCE_FOLDER, options, GENERATED_MEMES_FOLDER);
      cleanup(options)
      
      await sendQuestionToSlack({ memeUrl, title, response_url, SOURCE_FOLDER, GENERATED_MEMES_FOLDER, text })
    }
  } else {
    await handleSay(request, reply);
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, (err) => {
  if (err) console.error(err);
  console.log(`server listening on ${PORT}`);
});

async function sendResponseToSlack(params) {
  const { memeUrl, title, response_url } = params;
  try {
    const res = response(title, memeUrl)
    console.log({response: JSON.stringify(res)});

    await axios.post(response_url, {
      response_type: 'in_channel',
      text: title,
      delete_original: true,
      attachments: [res]
    });
  } catch (error) {
    console.log({error})
  }
};

async function sendResponseToSlackWithAttachments(params, attachments) {
  const { title, response_url } = params;
  const data = {
    response_type: 'ephemeral',
    attachments
  };

  const body = {
    ...data,
    ...(title) && { text: title}
  }
  try {
    await axios.post(response_url, body);
  } catch (error) {
    console.log({error})
  }
};

function cleanup(options) {
  fs.unlinkSync(options.image);
  fs.unlinkSync(options.outfile);
}

async function deleteOriginal(params) {
  const { response_url } = params
  try {
    await axios.post(response_url, {
      "delete_original": "true"
    });
  } catch (error) {
    console.log({error})
  }
}

async function sendQuestionToSlack(params) {
  const { memeUrl, title, response_url, SOURCE_FOLDER, GENERATED_MEMES_FOLDER, text } = params;
  try {
    const response = question(title, memeUrl, SOURCE_FOLDER, GENERATED_MEMES_FOLDER, text )

    await axios.post(response_url, {
      response_type: 'ephemeral',
      text: title,
      attachments: [response]
    });
  } catch (error) {
    console.log({error})
  }
};


async function generateMemeUrl(SOURCE_FOLDER, options, GENERATED_MEMES_FOLDER) {
  (await memeClient.getAndDownloadRandomFile(SOURCE_FOLDER, options.image))
  const font = await Jimp.loadFont(path.join(__dirname, "/fonts/impact.fnt"));
  const image = await Jimp.read(options.image);
  if (image.bitmap.height < 100 || image.bitmap.width < 100) {
    image.scale(10);
  }

  const TOP_POS = 5;
  const BOTTOM_POS = image.bitmap.height - 45;

  image.print(
    font,
    0,
    TOP_POS,
    {
      text: options.topText.toUpperCase(),
      alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
    },
   image.bitmap.width,
   image.bitmap.height
  )

  image.print(
    font,
    0,
    BOTTOM_POS,
    {
      text: options.bottomText.toUpperCase(),
      alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
    },
    image.bitmap.width,
    image.bitmap.height
  );

  image.write(options.outfile)
  const clientFolderUploadPath = `${GENERATED_MEMES_FOLDER}/`
  return await memeClient.uploadAndGenerateUrl(compressedImageStream, clientFolderUploadPath, options.outfile)
}

async function handleSay(request, reply) {
  const {GENERATED_MEMES_FOLDER, SOURCE_FOLDER, options, response_url, title} = extractParams(request);

  (await memeClient.getAndDownloadRandomFile(SOURCE_FOLDER, options.image))
  await memeMakerPromise(options);
  // Reply with ok - we'll send the meme when we're done.
  reply.send();

  const compressedImageStream = sharp(options.outfile)
      .resize({
        fit: sharp.fit.contain,
        width: 800
      })
      .jpeg({quality: 80});
  const clientFolderUploadPath = `${GENERATED_MEMES_FOLDER}/`
  const memeUrl = await memeClient.uploadAndGenerateUrl(compressedImageStream, clientFolderUploadPath, options.outfile)
  await sendResponseToSlack(options, { memeUrl, title, response_url })
}

function prepareOptions(text) {
  const options = {
    image: `${uuid()}.webp`,
    outfile: `./memefile-${uuid()}.webp`,
    fontSize: 50,
    fontFill: '#FFF',
    strokeColor: '#000',
    strokeWeight: 2
  };

  const texts = autocorrect(text).split(' ')
  texts.shift();

  const jointTextsAndSplitWithDelimiter = texts.join(' ').split(';')
  options.topText = jointTextsAndSplitWithDelimiter[0];

  if (jointTextsAndSplitWithDelimiter.length > 1) {
    options.bottomText = jointTextsAndSplitWithDelimiter[1];
  }

  return options;
}