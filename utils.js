const { capitalCase } = require('change-case');
const { uuid } = require('uuidv4');

exports.autocorrect = (text) => text.replace('romania', 'Romania');
exports.extractParamsForMemeSay = (request) => {
    const { body: { text, response_url, command }} = request;

    const MEME_FOLDER = text.split(' ')[0];

    const texts = this.autocorrect(text).split(' ')
    texts.shift();

    const GENERATED_MEMES_FOLDER = `/meme-say/generated-memes/${MEME_FOLDER}`;
    const SOURCE_FOLDER = `/meme-say/source/${MEME_FOLDER}`;


    const options = {
        image: `${uuid()}.webp`,
        outfile: `./memefile-${uuid()}.webp`
    };

    const jointTextsAndSplitWithDelimiter = texts.join(' ').split(';')
    options.topText = jointTextsAndSplitWithDelimiter[0];

    if (jointTextsAndSplitWithDelimiter.length > 1) {
        options.bottomText = jointTextsAndSplitWithDelimiter[1];
    }

    const title = `${capitalCase(MEME_FOLDER)}: ${jointTextsAndSplitWithDelimiter.join(';')}`;

    return { response_url, MEME_FOLDER, GENERATED_MEMES_FOLDER, SOURCE_FOLDER, title, options };
}

exports.extractParams = (request) => {
    const { body: { text, response_url, command }} = request;

    const texts = this.autocorrect(text).trim().split(';');

    const COMMAND = command.replace('/', '').replace('-say', '');
    const APP_NAME = capitalCase(COMMAND);

    const GENERATED_MEMES_FOLDER = `/meme-say/generated-memes/${COMMAND}`;
    const SOURCE_FOLDER = `/meme-say/source/${COMMAND}`;

    const title = `${APP_NAME}: ${text.trim().replace(';', ' ')}`;

    const options = {
        image: `${uuid()}.webp`,
        outfile: `./memefile-${uuid()}.webp`
    };

    options.topText = texts[0];

    if (texts.length > 1) {
        options.bottomText = texts[1];
    }

    return { response_url, COMMAND, GENERATED_MEMES_FOLDER, SOURCE_FOLDER, title, options };
}
exports.randomNumber = (limit) => Math.floor(Math.random() * Math.floor(limit));

