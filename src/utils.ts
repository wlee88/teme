import { uuid } from 'uuidv4';
import { Options } from './app';

const { capitalCase } = require('change-case');

interface SlackRequest {
  body: { text: string; response_url: string; command: string };
}
export const extractParamsForMemeSay = (request: SlackRequest) => {
  const {
    body: { text, response_url },
  } = request;

  const MEME_FOLDER = text ? text.split(' ')[0] : 'a a';
  const GENERATED_MEMES_FOLDER = `/meme-say/generated-memes/${MEME_FOLDER}`;
  const SOURCE_FOLDER = `/meme-say/source/${MEME_FOLDER}`;

  const texts = text.split(' ');
  texts.shift();

  const jointTextsAndSplitWithDelimiter = texts.join(' ').split(';');
  const title = `${capitalCase(
    MEME_FOLDER
  )}: ${jointTextsAndSplitWithDelimiter.join(';')}`;

  return {
    response_url,
    MEME_FOLDER,
    GENERATED_MEMES_FOLDER,
    SOURCE_FOLDER,
    title,
    text,
  };
};

export const extractParams = (request: SlackRequest) => {
  const {
    body: { text, response_url, command },
  } = request;

  const texts = text.trim().split(';');

  const COMMAND = command.replace('/', '').replace('-say', '');
  const APP_NAME = capitalCase(COMMAND);

  const GENERATED_MEMES_FOLDER = `/meme-say/generated-memes/${COMMAND}`;
  const SOURCE_FOLDER = `/meme-say/source/${COMMAND}`;

  const title = `${APP_NAME}: ${text.trim().replace(';', ' ')}`;

  const options: Partial<Options> = {
    image: `${uuid()}.webp`,
    outfile: `./memefile-${uuid()}.webp`,
  };

  options.topText = texts[0];

  if (texts.length > 1) {
    options.bottomText = texts[1];
  }

  return {
    response_url,
    COMMAND,
    GENERATED_MEMES_FOLDER,
    SOURCE_FOLDER,
    title,
    options,
  };
};
// random number from 0 - max exclusive - i.e won't return the max as a random number
export const randomNumber = (limit: number) =>
  Math.floor(Math.random() * Math.floor(limit));
