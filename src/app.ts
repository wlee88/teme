import * as fs from 'fs';
import bodyparser from 'body-parser';
import express, { Response } from 'express';
import * as Jimp from 'jimp';
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
import { DropboxStorageClient } from './storage/Dropbox';

const IMPACT_FONT_PATH = __dirname + '/fonts/impact.fnt';
const PORT = 3000;

interface ResponseParams {
  memeUrl: string;
  title: string;
  response_url: string;
}

export interface ImageOptions {
  topText: string;
  bottomText: string;
  image: string;
  outfile: string;
}

const app = express();

app.listen(PORT, async function () {
  console.log(`Example app listening on port ${PORT}!`);
});

app.use(bodyparser.urlencoded({ extended: false }));
app.use(bodyparser.json());

// init clients
const memeClient = new DropboxStorageClient();

// TODO: authenticate slack request
// TODO: proper logging
app.post('/', async (request, reply) => {
  console.log({ requestBody: request.body });
  try {
    const { response_url, GENERATED_MEMES_FOLDER, SOURCE_FOLDER, title, text } =
      extractParamsForMemeSay(request);

    if (text.startsWith('list')) {
      await handleList(reply, SOURCE_FOLDER, response_url);
    }

    if (text.startsWith('help')) {
      await handleHelp(reply, response_url);
    }

    const options = buildOptions(text);
    const isReply = !!request.body?.payload;
    // is a reply
    if (isReply) {
      const payload: {
        actions: { text: { text: string }; value: string }[];
        response_url: string;
      } = JSON.parse(request.body.payload);
      const { actions, response_url } = payload;

      if (actions.some((action) => action.text.text === 'Cancel')) {
        await handleCancel(actions, response_url);
      }
      if (actions.some((action) => action.text.text === 'Shuffle')) {
        await handleShuffle(actions, reply, response_url);
      } else {
        console.log('ok clicked');
        await handleConfirm(actions, reply, response_url);
      }
    } else {
      await handleFirstRequest(
        reply,
        response_url,
        SOURCE_FOLDER,
        GENERATED_MEMES_FOLDER,
        title,
        text,
        options
      );
    }
  } catch (error) {
    console.log({ error });
  }
});

async function sendResponseToSlack(params: ResponseParams) {
  const { memeUrl, title, response_url } = params;
  try {
    const res = response(title, memeUrl);

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

function cleanup(options: ImageOptions) {
  fs.unlinkSync(options.image);
  fs.unlinkSync(options.outfile);
}

async function deleteOriginal(params: { response_url: string }): Promise<void> {
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
}): Promise<void> {
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
    throw error;
  }
}

async function generateMemeUrl(
  sourceFolder: string,
  options: ImageOptions,
  memesFolder: string
): Promise<string> {
  await memeClient.getAndDownloadRandomFile(sourceFolder, options.image);

  const font = await Jimp.loadFont(IMPACT_FONT_PATH);
  const image = (await Jimp.read(options.image)) as Jimp;
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
  return await memeClient.uploadAndGetPublicUrl(
    fs.createReadStream(options.outfile),
    clientFolderUploadPath
  );
}

function buildOptions(text: string): ImageOptions {
  // todo: this code is duplicated - centralise it

  const options: ImageOptions = {
    image: `${uuid()}.jpg`,
    outfile: `./memefile-${uuid()}.jpg`,
    topText: text.split(';')[0],
    bottomText: text.split(';')[1],
  };

  return options;
}

async function handleList(
  reply: Response,
  SOURCE_FOLDER: string,
  response_url: string
) {
  reply.send();
  const folder = SOURCE_FOLDER.replace('/list', '');
  const folders = await memeClient.getFolderContents(folder);
  await sendResponseToSlackWithAttachments({ response_url }, [
    listPeople(folders),
  ]);
  return;
}

async function handleHelp(reply: Response, response_url: string) {
  reply.send();
  await sendResponseToSlackWithAttachments({ response_url }, [helpText()]);
  return;
}

async function generateMeme(
  SOURCE_FOLDER: string,
  options: ImageOptions,
  GENERATED_MEMES_FOLDER: string
) {
  const memeUrl = await generateMemeUrl(
    SOURCE_FOLDER,
    options,
    GENERATED_MEMES_FOLDER
  );
  cleanup(options);
  return memeUrl;
}

async function handleFirstRequest(
  reply: Response,
  response_url: string,
  sourceFolder: string,
  generatedMemesFolder: string,
  title: string,
  text: string,
  options: ImageOptions
) {
  reply.send(); // Reply with ok - we'll send the meme when we're done.
  const memeUrl = await generateMeme(
    sourceFolder,
    options,
    generatedMemesFolder
  );

  await sendQuestionToSlack({
    memeUrl,
    title,
    response_url,
    sourceFolder,
    generatedMemesFolder,
    text,
  });
}

async function handleCancel(
  actions: { text: { text: string }; value: string }[],
  response_url: string
) {
  const [_, __, ___, ____, imageUrl] = actions[0].value.split('|');
  console.log('cancel clicked');
  await deleteOriginal({ response_url });
  await memeClient.deleteFileBySharedLink(imageUrl);
}

async function handleShuffle(
  actions: { text: { text: string }; value: string }[],
  reply: Response,
  response_url: string
) {
  const [SOURCE_FOLDER, GENERATED_MEMES_FOLDER, text, title] =
    actions[0].value.split('|');

  const options = buildOptions(text);
  const memeUrl = await generateMemeUrl(
    SOURCE_FOLDER,
    options,
    GENERATED_MEMES_FOLDER
  );
  reply.send();
  cleanup(options);

  await sendQuestionToSlack({
    memeUrl,
    title,
    response_url,
    sourceFolder: SOURCE_FOLDER,
    generatedMemesFolder: GENERATED_MEMES_FOLDER,
    text,
  });
  return { SOURCE_FOLDER, GENERATED_MEMES_FOLDER, text, title, memeUrl };
}

async function handleConfirm(
  actions: { text: { text: string }; value: string }[],
  reply: Response,
  response_url: string
) {
  reply.send(); // Reply with ok - we'll send the meme when we're done.
  const [_, __, ___, title, memeUrl] = actions[0].value.split('|');
  await sendResponseToSlack({ memeUrl, title, response_url });
}
