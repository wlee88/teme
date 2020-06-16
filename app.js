const { uuid } = require('uuidv4');
const fs = require('fs');
const AWS = require('aws-sdk');
const sharp = require('sharp');
const { chooseRandomImage } = require('./utils');
const imagesFolder = './images/'
// Get these from terraform
const dstBucket = 'wlee-meme';
// random uuid here 
const generateDstKey = () => `alex-says-${uuid()}.webp`;
const memeMaker = require('meme-maker');
const isLambda = require.main !== module;
const s3BucketUrl = `https://${dstBucket}.s3.ap-southeast-2.amazonaws.com`;

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

    const { body: { text } }  = request;

    const texts = text.trim().split(";");
    options.topText = texts[0];

    if (texts.length > 1) {
        options.bottomText = texts[1];
    }

    const putMemeOnS3 = () => {
        // Upload the thumbnail image to the destination bucket
        sharp(options.outfile)
            .toFormat('webp')
            .toBuffer((err, buffer) => {
                if (err) { console.log({err}); throw new Error(err)}
                const key = generateDstKey();
                const response = {
                    "blocks": [
                        {
                            "type": "image",
                            "title": {
                                "type": "plain_text",
                                "text": "Alex Say"
                            },
                            "image_url": `${s3BucketUrl}/${key}`,
                            "alt_text": "Alex Say",
                            "block_id": "alex-pls",
                        }
                    ]
                };

                try {
                    const destparams = {
                        Bucket: dstBucket,
                        Key: key,
                        Body: buffer,
                        ContentType: "image/webp"
                    };

                    s3.putObject(destparams).promise()
                        .then(() => {
                            fs.unlinkSync(options.outfile);
                            console.log({response: JSON.stringify(response)})
                            reply.send(response);
                        }); 
                } catch (error) {
                    console.log(error);
                    return;
                }
            });
                
    };

    // Generate le meme 
    memeMaker(options, putMemeOnS3);

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
