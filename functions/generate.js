const { uuid } = require('uuidv4');

require('dotenv').config()

const fs = require('fs');
const util = require('util')

const axios = require('axios');
const sharp = require('sharp');
const memeMaker = require('meme-maker');
const { helpText, listPeople, response, question} = require("../slack-utils");
const { autocorrect, extractParams, extractParamsForMemeSay } = require("../utils");
const memeMakerPromise = util.promisify(memeMaker);

const { memeClient } = require('../Dropbox');

// const acklo = require('@acklo/node-sdk').default({
//   applicationName: 'meme-say',
//   environmentName: (process.env.NODE_ENV || 'production').toLowerCase()
// });
// acklo.connect().catch(console.error);

exports.handler = async (request, _, callback) => {
  console.log({request})
  console.log(request.body)
  const { body: { command }} = request;

  if (!command || command.includes('meme-say')) {
    console.log('command is meme-say');
    const { response_url, GENERATED_MEMES_FOLDER, SOURCE_FOLDER, title, text } = extractParamsForMemeSay(request);

    if (text && text.startsWith('list')) {
      callback(null, { 
        statusCode: 200 
      })
      const folder = SOURCE_FOLDER.replace('/list','');
      const folders = await memeClient.getFolderContents(folder);
      await sendResponseToSlackWithAttachments({ response_url }, [listPeople(folders)])
      return
    }

    if (text && text.startsWith('help')) {
      callback(null, { 
        statusCode: 200 
      })
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

        // await memeClient.deleteFileBySharedLink(imageUrl)
        const options = prepareOptions(text, false)
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
        callback(null, { 
            statusCode: 200 
        }) // Reply with ok - we'll send the meme when we're done.
      }
    } else {
      callback(null, { 
        statusCode: 200 
      })
      // Reply with ok - we'll send the meme when we're done.
      const memeUrl = await generateMemeUrl(SOURCE_FOLDER, options, GENERATED_MEMES_FOLDER);
      cleanup(options)
      await sendQuestionToSlack({ memeUrl, title, response_url, SOURCE_FOLDER, GENERATED_MEMES_FOLDER, text })
    }
  } else {
    await handleSay(request, reply);
  }
}


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
    await memeMakerPromise(options);
  
    const compressedImageStream = sharp(options.outfile)
        .resize({
          fit: sharp.fit.contain,
          // width: acklo.getConfigProperty('image.width', 800)
          width: 800
        })
        // .jpeg({quality: acklo.getConfigProperty('image.quality', 80)});
        .jpeg({quality: 800})
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
          // width: acklo.getConfigProperty('image.width', 800)
          width: 800
        })
        // .jpeg({quality: acklo.getConfigProperty('image.quality', 80)});
        .jpeg({ quality: 80 })
    const clientFolderUploadPath = `${GENERATED_MEMES_FOLDER}/`
    const memeUrl = await memeClient.uploadAndGenerateUrl(compressedImageStream, clientFolderUploadPath, options.outfile)
    await sendResponseToSlack(options, { memeUrl, title, response_url })
  }
  
  function prepareOptions(text) {
    const options = {
      image: `${uuid()}.webp`,
      outfile: `./memefile-${uuid()}.webp`,
      // fontSize: acklo.getConfigProperty('image.font_size', 50),
      // fontFill: acklo.getConfigProperty('image.font_fill', '#FFF'),
      // strokeColor: acklo.getConfigProperty('image.stroke_color', '#000'),
      // strokeWeight: acklo.getConfigProperty('image.stroke_weight', 2)
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
  