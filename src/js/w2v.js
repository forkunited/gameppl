var w2v = require('word2vec');
var fs = require('fs');
var _ = require('underscore');

var MODELS = {};

// Adapted from https://github.com/Planeshifter/node-word2vec/blob/master/lib/model.js
// Needed a syncronous version of loadModel
var loadModel = function(filePath) {
	var model = {};
	var vocab = {};
	var words;
	var size;

	model.getVector = function ( word ) {
 		if (word in vocab)
			return vocab[word]; 
                else
			return null;
	};


	var txt = fs.readFileSync(filePath, 'utf8');
        var lines = txt.split("\n");
	for (var counter = 0; counter < lines.length; counter++) {
		var values;
		var word;
		var arr;
		var len;
		var val;
		var a;
		var i;
		var o;

		var line = lines[counter];

		if (counter === 0) {
			arr = line.split( ' ' );
			words = parseInt(arr[0]);
			size = parseInt(arr[1]);
			if( isNaN(words) || isNaN(size) ) {
				throw new Error( 'First line of text file has to be <number of words> <length of vector>.' );
			}
		} else {
			arr = line.split( ' ' );
			word = arr.shift( 1 );

			values = [];
			for ( i = 0; i < arr.length; i++ ) {
				val = arr[ i ];
				if ( val !== '' ) {
					values.push( parseFloat( val ) );
				}
			}
			o = new w2v.WordVector( word, values );

			len = 0;
			for ( a = 0; a < size; a++ ) {
				len += o.values[a] * o.values[a];
			}
			len = Math.sqrt(len);
			for (a = 0; a < size; a++) {
				o.values[a] /= len;
			}
			vocab[word] = o;
		}
	}

	model.words = words;
	model.size = size;
	return model;
		
}

var getModel = function(filePath) {
	if (filePath in MODELS)
		return MODELS[filePath];
	MODELS[filePath] = loadModel(filePath);
	return MODELS[filePath];
}

module.exports = {
	loadModel : loadModel,
	getModel : getModel
};

