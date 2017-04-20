const _ = require('underscore');
const Tensor = require("adnn/tensor");
const fs = require('fs');
const path = require('path');
const counter = require('./counter');
const bilookup = require('./bilookup');
const rgame = require('./rgame');
const matrix = require('./matrix');
const w2v = require('./w2v');

var FEATURE_FILE_PREFIX = "_f.";

var FIXED_SYMBOL_COUNT = 3;
var symbols = {
    START_SYMBOL : 0,
    TERMINAL_SYMBOL : 1,
    MISSING_SYMBOL : 2
};

var types = {
    ACTION_DIMENSION_SCALAR : "actionDimensionScalar",
    ACTION_DIMENSION_ENUMERABLE : "actionDimensionEnumerable",
    UTTERANCE_TOKEN_ANNOTATION_SCALAR : "utteranceTokenAnnotationScalar",
    UTTERANCE_TOKEN_ANNOTATION_ENUMERABLE : "utteranceTokenAnnotationEnumerable",
    UTTERANCE_TOKEN_ANNOTATION_W2V : "utteranceTokenAnnotationW2V"
};

var enumerableTypes = {
    INDEX : "index",
    ONE_HOT : "oneHot"
};

var initFeatureActionDimensionScalar = function(name, inputGameDirectory, utteranceFn, actionFn, parameters) {
    var game = rgame.readOneGame(inputGameDirectory);
    var actions = actionFn(game);
    var c = counter.init();

    for (var i = 0; i < actions.length; i++) {
        for (var dim in actions[i]) {
            if (dim.startsWith(parameters.prefix))
                counter.increment(c, dim);
        }
    }

    var bi = bilookup.init(counter.buildIndex(c));

    return {
        name : name,
        type : types.ACTION_DIMENSION_SCALAR,
        inputGameDirectory : inputGameDirectory,
        utteranceFn : utteranceFn.toString(),
        actionFn : actionFn.toString(),
        parameters : parameters,
        vocabulary : bi,
        size : bilookup.size(bi)
    }
};

var computeFeatureActionDimensionScalar = function(feature, utterance, action) {
    var v = matrix.vectorInit(bilookup.size(feature.vocabulary));

    for (var key in action) {
        if (bilookup.contains(feature.vocabulary, key)) {
            var index = bilookup.get(feature.vocabulary, key);
            matrix.vectorSet(v, index, parseFloat(action[key]));
        }
    }

    var M = matrix.matrixInit(0, matrix.vectorLength(v));
    return matrix.matrixAddRowVector(M, v);
};

var initFeatureActionDimensionEnumerable = function(name, inputGameDirectory, utteranceFn, actionFn, parameters) {
    var c = counter.init();
    var processGame = function(game) {
        var actions = actionFn(game);
        for (var a = 0; a < actions.length; a++) {
            var action = actions[a];
            for (var dim in action) {
                if (dim.startsWith(parameters.prefix)) {
                    counter.increment(c, dim + "_" + action[dim]);
                }
            }
        }
    };

    rgame.readGames(inputGameDirectory, processGame);

    counter.removeLessThan(c, parameters.minCount);

    var bi = bilookup.init(counter.buildIndex(c));

    return {
        name : name,
        type : types.ACTION_DIMENSION_ENUMERABLE,
        inputGameDirectory : inputGameDirectory,
        utteranceFn : utteranceFn.toString(),
        actionFn : actionFn.toString(),
        parameters : parameters,
        vocabulary : bi,
        size : bilookup.size(bi)
    }
};

var computeFeatureActionDimensionEnumerable = function(feature, utterance, action) {
    var vectorSize = (feature.parameters.type == enumerableTypes.INDEX) ? 1 : bilookup.size(feature.vocabulary);

    var v = matrix.vectorInit(vectorSize);
    for (var key in action) {
        var f = key + "_" + action[key];
        if (bilookup.contains(feature.vocabulary, f)) {
            var index = bilookup.get(feature.vocabulary, f);
            if (feature.parameters.type == enumerableTypes.ONE_HOT)
                matrix.vectorSet(v, index, 1);
            else
                matrix.vectorSet(v, 0, index);
        }
    }

    var M = matrix.matrixInit(0, matrix.vectorLength(v));
    return matrix.matrixAddRowVector(M, v);
};

var initFeatureUtteranceTokenAnnotationScalar = function(name, inputGameDirectory, utteranceFn, actionFn, parameters) {
    var game = rgame.readOneGame(inputGameDirectory);
    var utterances = utteranceFn(game);
    var c = counter.init();

    for (var u = 0; u < utterances.length; u++) {
        var utt = utterances[u];
        for (var i = 0; i < rgame.getUtteranceSentenceCount(utt); i++) {
            for (var j = 0; j < rgame.getUtteranceSentenceTokenCount(utt, i); j++) {
                var anno = rgame.getUtteranceTokenAnnotation(utt, parameters.annotation, i, j);
                for (var key in anno)
                    counter.increment(c, key);
            }
        }
    }

    for (var key in symbols)
        counter.increment(c, key);

    var bi = bilookup.init(counter.buildIndex(c, symbols));

    return {
        name : name,
        type : types.UTTERANCE_TOKEN_ANNOTATION_SCALAR,
        inputGameDirectory : inputGameDirectory,
        utteranceFn : utteranceFn.toString(),
        actionFn : actionFn.toString(),
        parameters : parameters,
        vocabulary : bi,
        size : bilookup.size(bi)
    }
};

var computeFeatureUtteranceTokenAnnotationScalar = function(feature, utterance, action) {
    var M = matrix.matrixInit(0, bilookup.size(feature.vocabulary));

    var vS = matrix.vectorInit(bilookup.size(feature.vocabulary));
    matrix.vectorSet(vS, symbols.START_SYMBOL, 1);
    M = matrix.matrixAddRowVector(M, vS);

    for (var i = 0; i < rgame.getUtteranceSentenceCount(utterance); i++) {
        for (var j = 0; j < rgame.getUtteranceSentenceTokenCount(utterance, i); j++) {
            var anno = rgame.getUtteranceTokenAnnotation(utterance, feature.parameters.annotation, i, j);
            var v = matrix.vectorInit(bilookup.size(feature.vocabulary));
            for (var key in anno) {
                if (bilookup.contains(feature.vocabulary, key)) {
                    var index = bilookup.get(feature.vocabulary, key);
                    matrix.vectorSet(v, index, parseFloat(anno[key]));
                }
            }
            M = matrix.matrixAddRowVector(M, v);
        }
    }

    var vT = matrix.vectorInit(bilookup.size(feature.vocabulary));
    matrix.vectorSet(vT, symbols.TERMINAL_SYMBOL, 1);
    M = matrix.matrixAddRowVector(M, vT);

    return M;
};

var initFeatureUtteranceTokenAnnotationEnumerable = function(name, inputGameDirectory, utteranceFn, actionFn, parameters) {
    var c = counter.init();
    var processGame = function(game) {
        var utterances = utteranceFn(game);
        for (var u = 0; u < utterances.length; u++) {
            var utt = utterances[u];
            for (var i = 0; i < rgame.getUtteranceSentenceCount(utt); i++) {
                for (var j = 0; j < rgame.getUtteranceSentenceTokenCount(utt, i); j++) {
                    var anno = rgame.getUtteranceTokenAnnotation(utt, parameters.annotation, i, j);
                    if (parameters.toLowerCase)
                        anno = anno.toLowerCase();
                    counter.increment(c, anno);
                }
            }
        }
    }

    rgame.readGames(inputGameDirectory, processGame);

    counter.removeLessThan(c, parameters.minCount);

    for (var key in symbols)
        counter.increment(c, key);

    var bi = bilookup.init(counter.buildIndex(c, symbols));

    return {
        name : name,
        type : types.UTTERANCE_TOKEN_ANNOTATION_ENUMERABLE,
        inputGameDirectory : inputGameDirectory,
        utteranceFn : utteranceFn.toString(),
        actionFn : actionFn.toString(),
        parameters : parameters,
        vocabulary : bi,
        size : bilookup.size(bi)
    }
};

var computeFeatureUtteranceTokenAnnotationEnumerable = function(feature, utterance, action) {
    var vocabularySize = (feature.parameters.type == enumerableTypes.ONE_HOT) ? bilookup.size(feature.vocabulary) : 1;
    var M = matrix.matrixInit(0, vocabularySize);

    var vS = matrix.vectorInit(vocabularySize);
    if (feature.parameters.type == enumerableTypes.ONE_HOT)
        matrix.vectorSet(vS, symbols.START_SYMBOL, 1);
    else
        matrix.vectorSet(vS, 0, symbols.START_SYMBOL);
    M = matrix.matrixAddRowVector(M, vS);

    for (var i = 0; i < rgame.getUtteranceSentenceCount(utterance); i++) {
        for (var j = 0; j < rgame.getUtteranceSentenceTokenCount(utterance, i); j++) {
            var anno = rgame.getUtteranceTokenAnnotation(utterance, feature.parameters.annotation, i, j);
            if (feature.parameters.toLowerCase)
                anno = anno.toLowerCase();

            var v = matrix.vectorInit(vocabularySize);
            var index = symbols.MISSING_SYMBOL;
            if (bilookup.contains(feature.vocabulary, anno)) {
                index = bilookup.get(feature.vocabulary, anno);
            }

            if (feature.parameters.type == enumerableTypes.ONE_HOT)
                matrix.vectorSet(v, index, 1);
            else
                matrix.vectorSet(v, 0, index);

            M = matrix.matrixAddRowVector(M, v);
        }
    }

    var vT = matrix.vectorInit(vocabularySize);
    if (feature.parameters.type == enumerableTypes.ONE_HOT)
        matrix.vectorSet(vT, symbols.TERMINAL_SYMBOL, 1);
    else
        matrix.vectorSet(vT, 0, symbols.TERMINAL_SYMBOL);
    M = matrix.matrixAddRowVector(M, vT);

    return M;
};

var initFeatureUtteranceTokenAnnotationW2V = function(name, inputGameDirectory, utteranceFn, actionFn, parameters) {
    var model = w2v.getModel(parameters.modelFile);

    return {
        name : name,
        type : types.UTTERANCE_TOKEN_ANNOTATION_W2V,
        inputGameDirectory : inputGameDirectory,
        utteranceFn : utteranceFn.toString(),
        actionFn : actionFn.toString(),
        parameters : parameters,
        size : model.size + FIXED_SYMBOL_COUNT
    }
};

var computeFeatureUtteranceTokenAnnotationW2V = function(feature, utterance, action) {
    var vSize = feature.size;
    var M = matrix.matrixInit(0, vSize);

    var vS = matrix.vectorInit(vSize);
    matrix.vectorSet(vS, symbols.START_SYMBOL, 1);
    M = matrix.matrixAddRowVector(M, vS);

    var model = w2v.getModel(feature.parameters.modelFile);

    for (var i = 0; i < rgame.getUtteranceSentenceCount(utterance); i++) {
        for (var j = 0; j < rgame.getUtteranceSentenceTokenCount(utterance, i); j++) {
            var anno = rgame.getUtteranceTokenAnnotation(utterance, feature.parameters.annotation, i, j);
            anno = anno.toLowerCase();

            var v = matrix.vectorInit(vSize);
            if (model.getVector(anno) != null) {
                vector = model.getVector(anno).values;
                for (var vec_i = 0; vec_i < vector.length; vec_i++) {
                    matrix.vectorSet(v, FIXED_SYMBOL_COUNT + vec_i, vector[vec_i]);
                }
            } else {
                matrix.vectorSet(v, symbols.MISSING_SYMBOL, 1);
            }

            M = matrix.matrixAddRowVector(M, v);
        }
    }

    var vT = matrix.vectorInit(vSize);
    matrix.vectorSet(vT, symbols.TERMINAL_SYMBOL, 1);
    M = matrix.matrixAddRowVector(M, vT);

    return M;
};

var initFeatureSet = function(name, inputGameDirectory, utteranceFn, actionFn, featureTypes, vector) {
    var features = {};
    var size = 0;
    for (var i = 0; i < featureTypes.length; i++) {
        var fname = featureTypes[i].name;
        var fparameters = featureTypes[i].parameters;
        var ftype = featureTypes[i].type;
        if (ftype == types.ACTION_DIMENSION_SCALAR) {
            var feature = initFeatureActionDimensionScalar(fname, inputGameDirectory, utteranceFn, actionFn, fparameters);
            features[fname] = feature;
        } else if (ftype == types.ACTION_DIMENSION_ENUMERABLE) {
            var feature = initFeatureActionDimensionEnumerable(fname, inputGameDirectory, utteranceFn, actionFn, fparameters);
            features[fname] = feature;
        } else if (ftype == types.UTTERANCE_TOKEN_ANNOTATION_SCALAR) {
            var feature = initFeatureUtteranceTokenAnnotationScalar(fname, inputGameDirectory, utteranceFn, actionFn, fparameters);
            features[fname] = feature;
        } else if (ftype == types.UTTERANCE_TOKEN_ANNOTATION_ENUMERABLE) {
            var feature = initFeatureUtteranceTokenAnnotationEnumerable(fname, inputGameDirectory, utteranceFn, actionFn, fparameters);
            features[fname] = feature;
        } else if (ftype == types.UTTERANCE_TOKEN_ANNOTATION_W2V) {
            var feature = initFeatureUtteranceTokenAnnotationW2V(fname, inputGameDirectory, utteranceFn, actionFn, fparameters);
            features[fname] = feature;
        }

        size += features[fname].size;
    }

    return {
        name : name,
        inputGameDirectory : inputGameDirectory,
        utteranceFn : utteranceFn.toString(),
        actionFn : actionFn.toString(),
        features : features,
        vector : vector,
        size : size
    }
};

// NOTE: This currently assumes that utteranceActionFn returns at most one
// utterance-action pair per game round.  This assumption is necessary
// for the returned datum ids to be computed uniquely in terms of game ids and rounds
var computeFeatureSet = function(f, inputGameDirectory, utteranceActionFn) {
    var featureMatrices = {};
    var processGame = function(game) {
        var utteranceActions = utteranceActionFn(game);
        for (var i = 0; i < utteranceActions.length; i++) {
            var utterance = rgame.getUtteranceActionPairUtterance(utteranceActions[i]);
            var action = rgame.getUtteranceActionPairAction(utteranceActions[i]);
            var F = matrix.matrixInit(1, 0);
            var round = rgame.getUtteranceActionPairRound(utteranceActions[i]);
            var game = rgame.getUtteranceActionPairGame(utteranceActions[i]);

            for (var j = 0; j < f.vector.length; j++) {
                var feature = f.features[f.vector[j]];
                if (feature.type == types.ACTION_DIMENSION_SCALAR) {
                    var M = computeFeatureActionDimensionScalar(feature, utterance, action);
                    F = matrix.matrixRowProductCat(F, M);
                } else if (feature.type == types.ACTION_DIMENSION_ENUMERABLE) {
                    var M = computeFeatureActionDimensionEnumerable(feature, utterance, action);
                    F = matrix.matrixRowProductCat(F, M);
                } else if (feature.type == types.UTTERANCE_TOKEN_ANNOTATION_SCALAR) {
                    var M = computeFeatureUtteranceTokenAnnotationScalar(feature, utterance, action);
                    F = matrix.matrixRowProductCat(F, M);
                } else if (feature.type == types.UTTERANCE_TOKEN_ANNOTATION_ENUMERABLE) {
                    var M = computeFeatureUtteranceTokenAnnotationEnumerable(feature, utterance, action);
                    F = matrix.matrixRowProductCat(F, M);
                } else if (feature.type == types.UTTERANCE_TOKEN_ANNOTATION_W2V) {
                    var M = computeFeatureUtteranceTokenAnnotationW2V(feature, utterance, action);
                    F = matrix.matrixRowProductCat(F, M);
                }
            }

            var id = game + '_' + round;
            featureMatrices[id] = { id : id, game : game, round : round, F: F };
        }
    };

    rgame.readGames(inputGameDirectory, processGame);

    return { name : f.name,
        inputGameDirectory : inputGameDirectory,
        utteranceActionFn : utteranceActionFn,
        vocabularySize : f.size,
        D : featureMatrices };
};

var loadFeatureSet = function(inputDirectory) {
    if (!fs.existsSync(inputDirectory))
        throw(inputDirectory + " does not exist.");
    var features = {};
    var f = {};
    var fileNames = fs.readdirSync(inputDirectory);
    for (var i = 0; i < fileNames.length; i++) {
        if (fileNames[i].startsWith(FEATURE_FILE_PREFIX)) {
            var feature = JSON.parse(fs.readFileSync(path.join(inputDirectory, fileNames[i]), 'utf8'));
            features[feature.name] = feature;
        } else {
            f = JSON.parse(fs.readFileSync(path.join(inputDirectory, fileNames[i]), 'utf8'));
        }
    }

    f.features = features;
    return f;
}

var saveFeatureSet = function(f, outputDirectory) {
    if (!fs.existsSync(outputDirectory))
        fs.mkdirSync(outputDirectory);

    var features = f.features;
    delete f.features;

    fs.writeFileSync(path.join(outputDirectory, f.name), JSON.stringify(f));

    for (key in features) {
        fs.writeFileSync(path.join(outputDirectory, FEATURE_FILE_PREFIX + f.name + "." + features[key].name), JSON.stringify(features[key]));
    }

    f.features = features;
}

var loadFeatureMatrix = function(inputFile) {
    if (!fs.existsSync(inputFile))
        throw(inputFile + " does not exist.");

    return JSON.parse(fs.readFileSync(inputFile));
};

var saveFeatureMatrix = function(F, outputFile) {
    fs.writeFileSync(outputFile, JSON.stringify(F));
};

var getFeatureMatrixData = function(F) {
    return F.D;
};

var getFeatureMatrixFromDatum = function(d) {
    return d.F;
};

var getGameFromDatum = function(d) {
    return d.game;
};

var getRoundFromDatum = function(d) {
    return d.round;
};

var getFeatureSetSize = function(f) {
    return f.size;
};

var getFeatureMatrixVocabularySize = function(f) {
    return f.vocabularySize;
};

var getFeatureSetDimensionFromIndex = function(f, index) {
    var fIndex = 0;
    for (var j = 0; j < f.vector.length; j++) {
        var feature = f.features[f.vector[j]];
        if (fIndex + feature.size > index) {
            return bilookup.getReverse(feature.vocabulary, (index - fIndex));
        }

        fIndex += feature.size;
    }

    return undefined;
};

var getFeatureSetDimensionsFromIndices = function(f, indices) {
    return _.map(indices, function(index) { return getFeatureSetDimensionFromIndex(f, index) });
};

var getFeatureSetFeatureRange = function(f, featureName) {
    var fIndex = 0;
    for (var j = 0; j < f.vector.length; j++) {
        var feature = f.features[f.vector[j]];
        if (feature !== featureName) {
            fIndex += feature.size;
        } else {
            return [fIndex, fIndex + feature.size];
        }
    }

    return undefined;
};

var getFeatureSetFeatureSize = function(f, featureName) {
    return f.features[featureName].size;
};

var getTensorFeatureRange = function(tensor, f, featureName) {
    var featureRange = getFeatureSetFeatureRange(f, featureName);
    var tensorRange = Tensor.range(tensor, featureRange[0], featureRange[1]);
    return tensorRange;
};

module.exports = {
    types : types,
    symbols : symbols,
    enumerableTypes : enumerableTypes,
    initFeatureActionDimensionScalar : initFeatureActionDimensionScalar,
    computeFeatureActionDimensionScalar : computeFeatureActionDimensionScalar,
    initFeatureActionDimensionEnumerable : initFeatureActionDimensionEnumerable,
    computeFeatureActionDimensionEnumerable : computeFeatureActionDimensionEnumerable,
    initFeatureUtteranceTokenAnnotationScalar : initFeatureUtteranceTokenAnnotationScalar,
    computeFeatureUtteranceTokenAnnotationScalar : computeFeatureUtteranceTokenAnnotationScalar,
    initFeatureUtteranceTokenAnnotationEnumerable : initFeatureUtteranceTokenAnnotationEnumerable,
    computeFeatureUtteranceTokenAnnotationEnumerable : computeFeatureUtteranceTokenAnnotationEnumerable,
    initFeatureUtteranceTokenAnnotationW2V : initFeatureUtteranceTokenAnnotationW2V,
    computeFeatureUtteranceTokenAnnotationW2V : computeFeatureUtteranceTokenAnnotationW2V,
    initFeatureSet : initFeatureSet,
    computeFeatureSet : computeFeatureSet,
    loadFeatureSet : loadFeatureSet,
    saveFeatureSet : saveFeatureSet,
    loadFeatureMatrix : loadFeatureMatrix,
    saveFeatureMatrix : saveFeatureMatrix,
    getFeatureMatrixData : getFeatureMatrixData,
    getFeatureMatrixFromDatum : getFeatureMatrixFromDatum,
    getGameFromDatum : getGameFromDatum,
    getRoundFromDatum : getRoundFromDatum,
    getFeatureSetSize : getFeatureSetSize,
    getFeatureMatrixVocabularySize : getFeatureMatrixVocabularySize,
    getFeatureSetDimensionFromIndex : getFeatureSetDimensionFromIndex,
    getFeatureSetDimensionsFromIndices : getFeatureSetDimensionsFromIndices,
    getFeatureSetFeatureRange : getFeatureSetFeatureRange,
    getTensorFeatureRange : getTensorFeatureRange,
    getFeatureSetFeatureSize : getFeatureSetFeatureSize
};
