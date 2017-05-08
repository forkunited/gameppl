const _ = require('underscore');
const fs = require('fs');

const type = {
    PARTITION_SIZE : 0,
    PARTITION_BOUNDARY : 1
};

var _init_size = function(D, fn, partNames, partSizes, keepD) {
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

        //var nextMax = Math.min(partSize * keys.length + curIndex, keys.length);
        // NOTE: This can be written more simply
        var dCount = 0;
        var j = curIndex;
        while (dCount < partSize * D.length && j < keys.length) {
            dCount += D_key[keys[j]].length;
            j++;
        }
        var nextMax = j;

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

var _init_boundary = function(D, fn, partNames, partBoundaries, keepD) {
    var partition = { keepD : keepD, size : D.length, parts : {}};

    /* Add another type of partition for which to do this (SORTED_BOUNDARY)
    D.sort(function(obj1, obj2) {
        var key1 = fn(obj1);
        var key2 = fn(obj2);
        if (key1 < key2)
            return -1;
        else if (key1 > key2)
            return 1;
        else
            return 0;
    }); */

    var curPart = 0;
    for (var i = 0; i < D.length; i++) {
        var key = fn(D[i]);
        var partName = partNames[curPart];

        if (!(partName in partition.parts))
            partition.parts[partName] = {};

        if (!keepD) {
            partition.parts[partName][key] = 1;
        } else {
            if (!(key in partition.parts[partName])) {
                partition.parts[partName][key] = [];
            }
            partition.parts[partName][key].push(D[i]);
        }

        if (partBoundaries[curPart] === key) {
            curPart++;
        }
    }

    return partition;
};

var init = function(D, fn, partNames, parts, keepD, maybeType) {
    if (fn === undefined)
        fn = function(x) { return x };

    if (maybeType && maybeType === type.PARTITION_BOUNDARY) {
        return _init_boundary(D, fn, partNames, parts, keepD);
    } else {
        return _init_size(D, fn, partNames, parts, keepD);
    }
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

    return splitD;
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
    type : type,
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
