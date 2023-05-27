import * as fs from 'fs';
import bodyparser from 'body-parser';
import express from 'express';
import Jimp from 'jimp/*';
import Axios from 'axios';
import { uuid } from 'uuidv4';
import {
  helpText,
  listPeople,
  response,
  question,
  SlackTextBlock,
} from './slack-utils';
import { extractParamsForMemeSay } from './utils';

const { memeClient } = require('./Dropbox');

const IMPACT_FONT_PATH = './fonts/impact.fnt';

interface ResponseParams {
  memeUrl: string;
  title: string;
  response_url: string;
}

export interface Options {
  topText: string;
  bottomText: string;
  image: string;
  outfile: string;
}
const app = express();

app.use(bodyparser.urlencoded({ extended: false }));
app.use(bodyparser.json());

// TODO: authenticate slack request
app.post('/', async (request, reply) => {
  console.log({ request });
  console.log(request.body);
  const {
    body: { command },
  } = request;

  // TODO: look into what is actually sent
  if (!command || command.includes('meme-say')) {
    console.log('command is meme-say');
    const { response_url, GENERATED_MEMES_FOLDER, SOURCE_FOLDER, title, text } =
      extractParamsForMemeSay(request);

    if (text?.startsWith('list')) {
      reply.send();
      const folder = SOURCE_FOLDER.replace('/list', '');
      const folders = await memeClient.getFolderContents(folder);
      await sendResponseToSlackWithAttachments({ response_url }, [
        listPeople(folders),
      ]);
      return;
    }

    if (text?.startsWith('help')) {
      reply.send();
      await sendResponseToSlackWithAttachments({ response_url }, [helpText()]);
      return;
    }

    const options = buildOptions(text);
    const payload: {
      actions: { text: { text: string }; value: string }[];
      response_url: string;
    } = request.body.payload ? JSON.parse(request.body.payload) : undefined;
    if (payload?.actions?.length) {
      console.log('payload... ', payload);
      const { actions, response_url } = payload;
      if (actions.some((action) => action.text.text === 'Cancel')) {
        const [_, __, ___, ____, imageUrl] = actions[0].value.split('|');
        console.log('cancel clicked');
        await deleteOriginal({ response_url });
        await memeClient.deleteFileBySharedLink(imageUrl);
      } else if (actions.some((action) => action.text.text === 'Shuffle')) {
        const [SOURCE_FOLDER, GENERATED_MEMES_FOLDER, text, title, imageUrl] =
          actions[0].value.split('|');

        const options = buildOptions(text);
        const memeUrl = await generateMemeUrl(
          SOURCE_FOLDER,
          options,
          GENERATED_MEMES_FOLDER
        );
        reply.send();
        console.log({ memeUrl, options, text, title, imageUrl });
        cleanup(options);
        await sendQuestionToSlack({
          memeUrl,
          title,
          response_url,
          sourceFolder: SOURCE_FOLDER,
          generatedMemesFolder: GENERATED_MEMES_FOLDER,
          text,
        });
      } else {
        // send was sent - so use the specified url
        console.log('ok clicked');
        const [_, __, ___, title, memeUrl] = actions[0].value.split('|');
        await sendResponseToSlack({ memeUrl, title, response_url });
        reply.send(); // Reply with ok - we'll send the meme when we're done.
      }
    } else {
      reply.send(); // Reply with ok - we'll send the meme when we're done.
      const memeUrl = await generateMemeUrl(
        SOURCE_FOLDER,
        options,
        GENERATED_MEMES_FOLDER
      );
      cleanup(options);

      await sendQuestionToSlack({
        memeUrl,
        title,
        response_url,
        sourceFolder: SOURCE_FOLDER,
        generatedMemesFolder: GENERATED_MEMES_FOLDER,
        text,
      });
    }
  }
});

const PORT = process.env.PORT || 3000;

async function sendResponseToSlack(params: ResponseParams) {
  const { memeUrl, title, response_url } = params;
  try {
    const res = response(title, memeUrl);
    console.log({ response: JSON.stringify(res) });

    await Axios.post(response_url, {
      response_type: 'in_channel',
      text: title,
      delete_original: true,
      attachments: [res],
    });
  } catch (error) {
    console.log({ error });
  }
}

async function sendResponseToSlackWithAttachments(
  params: { title?: string; response_url: string },
  attachments: SlackTextBlock[]
) {
  const { title, response_url } = params;
  const body = {
    response_type: 'ephemeral',
    attachments,
    ...(title && { text: title }),
  };
  try {
    await Axios.post(response_url, body);
  } catch (error) {
    console.log({ error });
  }
}

function cleanup(options: Options) {
  fs.unlinkSync(options.image);
  fs.unlinkSync(options.outfile);
}

async function deleteOriginal(params: { response_url: string }) {
  const { response_url } = params;
  try {
    await Axios.post(response_url, {
      delete_original: 'true',
    });
  } catch (error) {
    console.log({ error });
  }
}

async function sendQuestionToSlack(params: {
  memeUrl: string;
  title: string;
  response_url: string;
  sourceFolder: string;
  generatedMemesFolder: string;
  text: string;
}) {
  const {
    memeUrl,
    title,
    response_url,
    sourceFolder,
    generatedMemesFolder,
    text,
  } = params;
  try {
    const response = question(
      title,
      memeUrl,
      sourceFolder,
      generatedMemesFolder,
      text
    );

    await Axios.post(response_url, {
      response_type: 'ephemeral',
      text: title,
      attachments: [response],
    });
  } catch (error) {
    console.log({ error });
  }
}

async function generateMemeUrl(
  sourceFolder: string,
  options: Options,
  memesFolder: string
) {
  await memeClient.getAndDownloadRandomFile(sourceFolder, options.image);

  const font = await Jimp.loadFont(IMPACT_FONT_PATH);
  const image = await Jimp.read(options.image);
  if (image.bitmap.height < 100 || image.bitmap.width < 100) {
    image.scale(10);
  }

  const TOP_POS = 5;
  const BOTTOM_POS = image.bitmap.height - 100;

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
  );

  if (options.bottomText) {
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
  }

  await image.writeAsync(options.outfile);
  const clientFolderUploadPath = `${memesFolder}/`;
  return await memeClient.uploadAndGenerateUrl(
    fs.createReadStream(options.outfile),
    clientFolderUploadPath
  );
}

function buildOptions(text: string): Options {
  const texts = text.split(' ');

  const options: Options = {
    image: `${uuid()}.jpg`,
    outfile: `./memefile-${uuid()}.jpg`,
    topText: texts.join(' ').split(';')[0],
    bottomText: texts.join(' ').split(';')[1],
  };

  return options;
}
