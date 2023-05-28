import { uuid } from 'uuidv4';
import { ImageOptions } from './app';

const { capitalCase } = require('change-case');

interface SlackRequest {
  body: { text: string; response_url: string; command: string };
}

// TODO: folder paths needs to be global configurable and not hard coded here
export const extractParamsForMemeSay = (request: SlackRequest) => {
  const {
    body: { text, response_url },
  } = request;

  const MEME_FOLDER = text ? text.split(' ')[0] : 'a a';
  const GENERATED_MEMES_FOLDER = `/meme-say/generated-memes/${MEME_FOLDER}`;
  const SOURCE_FOLDER = `/meme-say/source/${MEME_FOLDER}`;

  const formattedText = prepareText(text);
  const formattedTitle = `${capitalCase(MEME_FOLDER)}: ${formattedText}`;

  return {
    response_url,
    MEME_FOLDER,
    GENERATED_MEMES_FOLDER,
    SOURCE_FOLDER,
    title: formattedTitle,
    text: formattedText,
  };
};

// random number from 0 - max exclusive - i.e won't return the max as a random number
export const randomNumber = (limit: number) =>
  Math.floor(Math.random() * Math.floor(limit));

const memeText = (text: string) => {
  const texts: string[] = text.split(' ');
  // remove the meme folder from texts
  texts.shift();
  return texts;
};

const prepareText = (text?: string) => {
  const texts = memeText(text ?? '');
  return texts.join(' ');
};
