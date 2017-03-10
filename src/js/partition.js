const _ = require('underscore');
const fs = require('fs');

var init = function(D, fn, partNames, partSizes) {
    var partition = { size : D.length, parts : {}};

    var curIndex = 0;
    for (var i = 0; i < partSizes.length; i++) {
        partName = partNames[i];
        partSize = partSizes[i];
        var nextMax = Math.min(partSize * D.length + curIndex, D.length);
        partition.parts[partName] = {};
        while (curIndex < nextMax) {
            partition.parts[partName][fn(D[curIndex])] = 1;
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
}

module.exports = {
    init : init,
    load : load,
    save : save,
    getPart : getPart,
    getPartNames : getPartNames,
    partContains : partContains,
    size : size,
    split : split
};