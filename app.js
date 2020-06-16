const { uuid } = require('uuidv4');
const fs = require('fs');
const AWS = require('aws-sdk');
const sharp = require('sharp');
const { chooseRandomImage } = require('./utils');
const imagesFolder = './images/'
// Get these from terraform
const dstBucket = 'wlee-meme';
// random uuid here 
const generateDstKey = () => `alex-says-${uuid()}.jpg`;
const memeMaker = require('meme-maker');
const isLambda = require.main !== module;
const s3BucketUrl = `http://${dstBucket}.s3.ap-southeast-2.amazonaws.com`;

const axios = require('axios');

const tempDir = () => isLambda ? '/tmp/' : '';

const s3 = new AWS.S3();

const app = require('fastify')({
    logger: true
});

app.register(require('fastify-formbody'));

app.get('/', function (request, reply) {
    reply.send({ hej: 'då' })
});

app.post('/', (request, reply) => {
    console.log({request,reply});
    const options = {
        image: `${imagesFolder}/${chooseRandomImage()}`,
        outfile: `${tempDir()}memefile-${uuid()}.webp`
    };

    const { body: { text, response_url } }  = request;

    const texts = text.trim().split(";");
    const formattedText = text.trim().replace(";", " ");
    const title = `Alex Say: ${formattedText}`;
    options.topText = texts[0];

    if (texts.length > 1) {
        options.bottomText = texts[1];
    }

    const putMemeOnS3 = () => {
        // Upload the thumbnail image to the destination bucket
        sharp(options.outfile)
            .jpeg({quality: 70})
            .toBuffer((err, buffer) => {
                if (err) { console.log({err}); throw new Error(err)}
                const key = generateDstKey();
                const response = {
                    "blocks": [
                        {
                            "type": "image",
                            "title": {
                                "type": "plain_text",
                                "text": title
                            },
                            "image_url": `${s3BucketUrl}/${key}`,
                            "alt_text": title,
                            "block_id": "alex-pls",
                        }
                    ]
                };

                try {
                    const destparams = {
                        Bucket: dstBucket,
                        Key: key,
                        Body: buffer,
                        ContentType: "image/jpeg"
                    };

                    s3.putObject(destparams).promise()
                        .then(() => {
                            fs.unlinkSync(options.outfile);
                            console.log({response: JSON.stringify(response)})
                            reply.send();
                            axios.post(response_url, {
                                "response_type": "in_channel",
                                "text": title,
                                "attachments": [response]
                            });
                        }); 
                } catch (error) {
                    console.log(error);
                    return;
                }
            });
                
    };

    if (text === 'help') {
        const helpResponse = {
            "response_type": "ephemeral",
            "text": "How to use /alex-say",
            "attachments":[
                {
                   "text":"To get alex to say things use `/alex-say some Hello;There`. The ';' indicates a newline."
                }
            ]
         }
        reply(helpResponse)
    } else {
        // Generate le meme 
        memeMaker(options, putMemeOnS3);
    }


});

const PORT = process.env.PORT || 5000

// if (!isLambda) {
    // called directly i.e. "node app"
    app.listen(PORT,  '0.0.0.0', (err) => {
      if (err) console.error(err);
      console.log('server listening on 8080');
    });
//   } else {
    // required as a module => executed on aws lambda
    // module.exports = app;
// }
