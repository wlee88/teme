const { uuid } = require('uuidv4');
const fs = require('fs');
const AWS = require('aws-sdk');
const sharp = require('sharp');
const { autocorrect, randomNumber } = require('./utils');
const imagesFolder = './images/';
// Get these from terraform
const dstBucket = 'wlee-meme';
// random uuid here
const generateDstKey = () => `${MEME_OUTPUT_PREFIX}/${uuid()}.jpg`;
const memeMaker = require('meme-maker');
const isLambda = require.main !== module;
const s3BucketUrl = `http://${dstBucket}.s3.ap-southeast-2.amazonaws.com`;

const APP_NAME = 'Alex Say';
const MEME_SOURCE_PREFIX = 'alex-say/';
const MEME_OUTPUT_PREFIX = 'alex-say-output';

const axios = require('axios');


const retrieveTempDir = () => (isLambda ? '/tmp/' : '.');

const s3 = new AWS.S3();
const express = require('express');
const app = express();
const bodyParser = require('body-parser')

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }))

// parse application/json
app.use(bodyParser.json())

app.post('/', async (request, reply) => {
	console.log({ request, reply });

	// Grab and download a random meme from s3
	const objects = await s3.listObjectsV2({
		Bucket: dstBucket,
		Prefix: MEME_SOURCE_PREFIX,
		Delimiter: '/'
	}).promise();

	console.log({objects})

	const objectsLength = objects.Contents.length;
	const randomMemeKey = objects.Contents[randomNumber(objectsLength - 1)].Key;
	const objectParams = {
		Bucket: dstBucket,
		Key: randomMemeKey
	};
	const tempInputFile = `${retrieveTempDir()}/${uuid()}.webp`;
	const fileStream = require('fs').createWriteStream(tempInputFile);

	await new Promise((resolve, reject) => {
		s3
			.getObject(objectParams)
			.createReadStream()
			.on('end', () => {
				return resolve();
			})
			.on('error', (error) => {
				return reject(error);
			})
			.pipe(fileStream);
	});

	// Temporary input/output file
	const options = {
		image: tempInputFile,
		outfile: `${retrieveTempDir()}memefile-${uuid()}.webp`
	};

	console.log({request});

	const { body: { text, response_url } } = request;

	const autocorrectedText = autocorrect(text);
	const texts = autocorrectedText.trim().split(';');
	const formattedText = text.trim().replace(';', ' ');
	const title = `${APP_NAME}: ${formattedText}`;
	options.topText = texts[0];

	if (texts.length > 1) {
		options.bottomText = texts[1];
	}

	const putMemeOnS3 = () => {
		// Upload the thumbnail image to the destination bucket
		sharp(options.outfile).jpeg({ quality: 70 }).toBuffer((err, buffer) => {
			if (err) {
				console.log({ err });
				throw new Error(err);
			}
			const key = generateDstKey();
			const response = {
				blocks: [
					{
						type: 'image',
						title: {
							type: 'plain_text',
							text: title
						},
						image_url: `${s3BucketUrl}/${key}`,
						alt_text: title,
						block_id: 'derp'
					}
				]
			};

			try {
				// Reply with ok - we'll send the meme when we're done.
				reply.send();

				const destparams = {
					Bucket: dstBucket,
					Key: key,
					Body: buffer,
					ContentType: 'image/jpeg'
				};

				s3.putObject(destparams).promise().then(() => {
					fs.unlinkSync(tempInputFile)
					fs.unlinkSync(options.outfile);
					console.log({ response: JSON.stringify(response) });
					axios.post(response_url, {
						response_type: 'in_channel',
						text: title,
						attachments: [ response ]
					});
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

const PORT = process.env.PORT || 3000;

if (!isLambda) {
	app.listen(PORT, (err) => {
		if (err) console.error(err);
		console.log(`server listening on ${PORT}`);
	});
} else {
	// required as a module => executed on aws lambda
	module.exports = app;
}
