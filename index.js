let memeMaker = require('meme-maker');

let options = {
	image: 'alex-with-nips.png', // Required
	outfile: 'spiderman-meme.png', // Required
	topText: 'TODAY IM', // Required
	bottomText: 'AN ASS', // Optional
	fontSize: 50, // Optional
	fontFill: '#FFF', // Optional
	textPos: 'center', // Optional
	strokeColor: '#000', // Optional
	strokeWeight: 2 // Optional
};

memeMaker(options, function(err) {
	if (err) throw new Error(err);
	console.log('Image saved: ' + options.outfile);
});
