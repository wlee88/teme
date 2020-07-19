const { uuid } = require('uuidv4');
const { capitalCase, paramCase } = require('change-case');
const fs = require('fs');
const AWS = require('aws-sdk');
const sharp = require('sharp');
const { autocorrect, randomNumber } = require('./utils');
const imagesFolder = './images/';
// Get these from terraform
const dstBucket = 'wlee-meme';
// random uuid here
const generateKey = prefix => `${prefix}/${uuid()}.jpg`;
const memeMaker = require('meme-maker');
const isLambda = require.main !== module;
const s3BucketUrl = `http://${dstBucket}.s3.ap-southeast-2.amazonaws.com`;

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

	// retrieve info from request
	const { body: { text, response_url, command } } = request;

	const autocorrectedText = autocorrect(text);
	const texts = autocorrectedText.trim().split(';');
	const formattedText = text.trim().replace(';', ' ');

	const COMMAND = command.replace("/","")
	const APP_NAME = capitalCase(COMMAND)
	const MEME_SOURCE_PREFIX = paramCase(COMMAND);
	const MEME_OUTPUT_PREFIX = `${MEME_SOURCE_PREFIX}-output`;

	console.log({
		COMMAND,
		APP_NAME,
		MEME_SOURCE_PREFIX,
		MEME_OUTPUT_PREFIX
	});

	const title = `${APP_NAME}: ${formattedText}`;
	
	const tempInputFile = `${retrieveTempDir()}/${uuid()}.webp`;
	const fileStream = require('fs').createWriteStream(tempInputFile);

	// Temporary input/output file
	const options = {
		image: tempInputFile,
		outfile: `${retrieveTempDir()}memefile-${uuid()}.webp`
	};

	console.log({request});

	options.topText = texts[0];

	if (texts.length > 1) {
		options.bottomText = texts[1];
	}

	// Grab and download a random meme from s3
	const objects = await s3.listObjectsV2({
		Bucket: dstBucket,
		Prefix: `${MEME_SOURCE_PREFIX}/`,
		Delimiter: '/'
	}).promise();

	const objectsLength = objects.Contents.length;
	const randomMemeKey = objects.Contents[randomNumber(objectsLength - 1)].Key;
	const objectParams = {
		Bucket: dstBucket,
		Key: randomMemeKey
	};

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


	const putMemeOnS3 = () => {
		// Upload the thumbnail image to the destination bucket
		sharp(options.outfile).jpeg({ quality: 70 }).toBuffer((err, buffer) => {
			if (err) {
				console.log({ err });
				throw new Error(err);
			}
			const key = generateKey(MEME_OUTPUT_PREFIX);
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
					// fs.unlinkSync(tempInputFile)
					// fs.unlinkSync(options.outfile);
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
