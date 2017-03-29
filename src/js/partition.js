const _ = require('underscore');
const fs = require('fs');

var init = function(D, fn, partNames, partSizes, keepD) {
    var D_key = {};
    for (var i = 0; i < D.length; i++) {
        var k = fn(D[i]);
        if (!(k in D_key))
            D_key[k] = [];
        D_key[k].push(D[i]);
    }

    var keys = _.keys(D_key);
    var partition = { keepD : keepD, size : D.length, parts : {}};
    var curIndex = 0;
    for (var i = 0; i < partSizes.length; i++) {
        partName = partNames[i];
        partSize = partSizes[i];
        var nextMax = Math.min(partSize * keys.length + curIndex, keys.length);
        partition.parts[partName] = {};
        while (curIndex < nextMax) {
            if (!keepD) {
                partition.parts[partName][keys[curIndex]] = 1;
            } else {
                partition.parts[partName][keys[curIndex]] = D_key[keys[curIndex]];
            }
            curIndex++;
        }
    }

    return partition;
};

var load = function(inputFile) {
    var partStr = fs.readFileSync(inputFile);
    return JSON.parse(partStr);
};

var save = function(part, outputFile) {
    var partStr = JSON.stringify(part);
    fs.writeFileSync(outputFile, partStr);
};

var getPart = function(part, name) {
    return part.parts[name];
};

var getPartNames = function(part) {
    return _.keys(part.parts);
};

var partContains = function(part, name, value) {
    return value in part.parts[name];
};

var size = function(part) {
    return part.size;
};

var split = function(part, D, fn) {
    var splitD = {};
    for (var i = 0; i < D.length; i++) {
        var D_key = fn(D[i]);
        for (var name in part.parts) {
            if (D_key in part.parts[name]) {
                if (!(name in splitD))
                    splitD[name] = [];
                splitD[name].push(D[i]);
                break;
            }
        }
    }
};

var mapKeysAndValues = function(part, keyFn, valueFn) {
    var newParts = {};
    for (var name in part.parts) {
        var keyValues = _.pairs(part.parts[name]);
        var newPart = {};
        for (var i = 0; i < keyValues.length; i++) {
            if (!part.keepD) {
                var key = keyFn(keyValues[i][0]);
                newPart[key] = 1;
            } else {
                for (var j = 0; j <keyValues[i][1].length; j++) {
                    var key = keyFn(keyValues[i][0],keyValues[i][1][j]);
                    var value = valueFn(keyValues[i][0], keyValues[i][1][j]);
                    if (!(key in newPart)) {
                        newPart[key] = [value];
                    } else {
                        newPart[key].push(value);
                    }
                }
            }
        }

        newParts[name] = newPart;
    }

    part.parts = newParts;
}

module.exports = {
    init : init,
    load : load,
    save : save,
    getPart : getPart,
    getPartNames : getPartNames,
    partContains : partContains,
    size : size,
    split : split,
    mapKeysAndValues : mapKeysAndValues
};