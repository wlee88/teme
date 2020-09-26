const { capitalCase } = require('change-case');
const { uuid } = require('uuidv4');

exports.autocorrect = (text) => text.replace('romania', 'Romania');
exports.extractParams = (request) => {
    const { body: {text, response_url, command }} = request;

    const autocorrectedText = this.autocorrect(text);
    const texts = autocorrectedText.trim().split(';');
    const formattedText = text.trim().replace(';', ' ');

    const COMMAND = command.replace('/', '');
    const APP_NAME = capitalCase(COMMAND);

    const GENERATED_MEMES_FOLDER = `/meme-say/generated-memes/${COMMAND}`;
    const SOURCE_FOLDER = `/meme-say/bots/${COMMAND}`;

    const title = `${APP_NAME}: ${formattedText}`;

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

