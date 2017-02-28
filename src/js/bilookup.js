const _ = require('underscore');
const fs = require('fs');

var init = function(index) {
    if (!index)
        return { forward : {}, reverse : {}};

    var b = { forward : {}, reverse : {}};
    for (var key in index) {
        b.forward[key] = index[key];
        b.reverse[index[key]] = key;
    }

    return b;
};

var load = function(inputFile) {
    var gameStr = fs.readFileSync(inputFile);
    return JSON.parse(gameStr);
};

var save = function(bi, outputFile) {
    var gameStr = JSON.stringify(bi);
    fs.writeFileSync(outputFile, gameStr);
};

var insert = function(bi, key, value) {
    bi.forward[key] = value;
    bi.reverse[value] = key;
};

var get = function(bi, key) {
    return bi.forward[key];
};

var getReverse = function(bi, reverseKey) {
    return bi.reverse[reverseKey];
};

var size = function(bi) {
    return Object.keys(bi.forward).length;
};

var contains = function(bi, key) {
    return (key in bi.forward);
};

var containsReverse = function(bi, key) {
    return (key in bi.reverse);
};

module.exports = {
    init : init,
    load : load,
    save : save,
    insert : insert,
    get : get,
    getReverse : getReverse,
    size : size,
    contains : contains,
    containsReverse : containsReverse
};