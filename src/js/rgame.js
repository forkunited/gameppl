const fs = require('fs');
const path = require('path');
const _ = require('underscore');


var FIELD_GAME_ID = "gameid";
var FIELD_GAME_ROUNDS = "records";
var FIELD_ROUND_ID = "roundNum";
var FIELD_ROUND_EVENTS = "events";
var FIELD_EVENT_TYPE = "type";
var FIELD_UTTERANCE_SENDER = "sender";
var FIELD_UTTERANCE_TOKEN_ANNOTATIONS = "contents_anno";

var annotations = {
    TOKEN : "words",
    LEMMA : "lemmas",
    POS : "pos"
}

var senders = {
    SPEAKER : "speaker",
    LISTENER : "listener"
};

var events = {
    UTTERANCE : "UTTERANCE",
    ACTION : "ACTION"
};

var getGameId = function(game) {
    return game[FIELD_GAME_ID];
};

var getGameRounds = function(game) {
    return game[FIELD_GAME_ROUNDS];
};

var getRoundId = function(round) {
    return round[FIELD_ROUND_ID];
}

var getGameRoundCount = function(game) {
    return getGameRounds(game).length;
};

var getGameRound = function(game, i) {
    return getGameRounds(game)[i];
};

var getRoundEvents = function(round) {
    return round[FIELD_ROUND_EVENTS];
};

var getRoundEventCount = function(round) {
    return getRoundEvents(round).length;
};

var getRoundEvent = function(round, i) {
    return getRoundEvents(round)[i];
};

var getRoundUtteranceEvents = function(round, sender) {
    return _.filter(getRoundEvents(round), function(event) {
       return event[FIELD_EVENT_TYPE] == events.UTTERANCE
           && event[FIELD_UTTERANCE_SENDER] == sender;
    });
};

var getRoundActionEvents = function(round) {
    return _.filter(getRoundEvents(round), function(event) {
        return event[FIELD_EVENT_TYPE] == events.ACTION;
    });
};

var getRoundUtteranceActionPairs = function(gameId, round, sender) {
    var pairs = [];

    for (var i = 1; i < getRoundEventCount(round); i++) {
        if (getRoundEvent(round, i)[FIELD_EVENT_TYPE] != events.ACTION
        || getRoundEvent(round, i-1)[FIELD_EVENT_TYPE] != events.UTTERANCE
        || (sender && getRoundEvent(round, i-1)[FIELD_UTTERANCE_SENDER] != sender))
            continue;
        var pair = { utterance : getRoundEvent(round, i-1), action : getRoundEvent(round, i) };
        pair[FIELD_GAME_ID] = gameId;
        pair[FIELD_ROUND_ID] = getRoundId(round);
        pairs.push(pair);
    }

    return pairs;
};

var getGameEvents = function(game) {
    return _.flatten(_.map(getGameRounds(game), function(round) {
        return getRoundEvents(round);
    }), true);
};

var getGameUtteranceEvents = function(game, sender) {
    return _.flatten(_.map(getGameRounds(game), function(round) {
        return getRoundUtteranceEvents(round, sender);
    }), true);
};

var getGameActionEvents = function(game) {
    return _.flatten(_.map(getGameRounds(game), function(round) {
        return getRoundActionEvents(round);
    }), true);
};

var getGameUtteranceActionPairs = function(game, sender) {
    return _.flatten(_.map(getGameRounds(game), function(round) {
        return getRoundUtteranceActionPairs(getGameId(game), round, sender);
    }), true);
};

var getUtteranceTokenAnnotations = function(utterance, annotation) {
    return utterance[FIELD_UTTERANCE_TOKEN_ANNOTATIONS][annotation];
};

var getUtteranceSentenceCount = function(utterance) {
    return getUtteranceTokenAnnotations(utterance, annotations.TOKEN).length;
};

var getUtteranceSentenceTokenCount = function(utterance, sentence) {
    return getUtteranceTokenAnnotations(utterance, annotations.TOKEN)[sentence].length;
};

var getUtteranceTokenAnnotation = function(utterance, annotation, sentence, i) {
    return getUtteranceTokenAnnotations(utterance, annotations.TOKEN)[sentence][i];
};

var getUtteranceActionPairsUtterances = function(uaPairs) {
    return _.map(uaPairs, function(uaPair) { return uaPair.utterance });
}

var getUtteranceActionPairsActions = function(uaPairs) {
    return _.map(uaPairs, function(uaPair) { return uaPair.action });
}

var getPairedUtterancesFn = function(sender) {
    return function(game) {
        var pairs = getGameUtteranceActionPairs(game, sender);
        return getUtteranceActionPairsUtterances(pairs);
    }
};

var getPairedActionsFn = function(sender) {
    return function (game) {
        var pairs = getGameUtteranceActionPairs(game, sender);
        return getUtteranceActionPairsActions(pairs);
    }
};

var getUtteranceActionPairRound = function(uaPair) {
    return uaPair[FIELD_ROUND_ID];
};

var getUtteranceActionPairGame = function(uaPair) {
    return uaPair[FIELD_GAME_ID];
};

var getUtteranceActionPairUtterance = function(uaPair) {
    return uaPair.utterance;
};

var getUtteranceActionPairAction = function(uaPair) {
    return uaPair.action;
};

var readOneGame = function(directoryPath, fn) {
    var fileNames = fs.readdirSync(directoryPath);
    return readGame(path.join(directoryPath,  fileNames[0]), fn);
};

var readGames = function(directoryPath, fn) {
    var fileNames = fs.readdirSync(directoryPath);
    return _.map(fileNames, function (fileName) {
        return readGame(path.join(directoryPath,  fileName), fn);
    });
};

var readGame = function(filePath, fn) {
    var gameStr = fs.readFileSync(filePath, 'utf8');
    if (fn) {
        return fn(JSON.parse(gameStr));
    } else {
        return JSON.parse(gameStr);
    }
};

module.exports = {
    senders : senders,
    events : events,
    annotations : annotations,
    getGameId : getGameId,
    getGameRounds : getGameRounds,
    getGameRoundCount : getGameRoundCount,
    getGameRound : getGameRound,
    getRoundEvents : getRoundEvents,
    getRoundEventCount : getRoundEventCount,
    getRoundEvent : getRoundEvent,
    getRoundUtteranceEvents : getRoundUtteranceEvents,
    getRoundActionEvents : getRoundActionEvents,
    getRoundUtteranceActionPairs : getRoundUtteranceActionPairs,
    getGameEvents : getGameEvents,
    getGameUtteranceEvents : getGameUtteranceEvents,
    getGameActionEvents : getGameActionEvents,
    getGameUtteranceActionPairs : getGameUtteranceActionPairs,
    getUtteranceTokenAnnotations : getUtteranceTokenAnnotations,
    getUtteranceSentenceCount : getUtteranceSentenceCount,
    getUtteranceSentenceTokenCount : getUtteranceSentenceTokenCount,
    getUtteranceTokenAnnotation : getUtteranceTokenAnnotation,
    getUtteranceActionPairsUtterances : getUtteranceActionPairsUtterances,
    getUtteranceActionPairsActions : getUtteranceActionPairsActions,
    getPairedActionsFn : getPairedActionsFn,
    getPairedUtterancesFn : getPairedUtterancesFn,
    getUtteranceActionPairGame : getUtteranceActionPairGame,
    getUtteranceActionPairRound : getUtteranceActionPairRound,
    getUtteranceActionPairUtterance : getUtteranceActionPairUtterance,
    getUtteranceActionPairAction : getUtteranceActionPairAction,
    readGame : readGame,
    readGames : readGames,
    readOneGame : readOneGame
};