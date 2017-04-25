// bilookup.js
//
// Bi-directional lookup table data structure
// (Useful for representing feature vocabularies)

const _ = require('underscore');
const fs = require('fs');

// init
//
// index : dictionary mapping keys to values from which
//         to construct the table
//
// return lookup bilookup table object
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

// load
//
// inputFile : path to JSON file (saved using the save function)
//             from which to load a bilookup table
var load = function(inputFile) {
    var gameStr = fs.readFileSync(inputFile);
    return JSON.parse(gameStr);
};

// save
//
// bi : lookup table object
// outputFile : path to file in which to save the table
var save = function(bi, outputFile) {
    var gameStr = JSON.stringify(bi);
    fs.writeFileSync(outputFile, gameStr);
};

// insert
//
// bi : lookup table object
// key : key to store
// value : value to store
var insert = function(bi, key, value) {
    bi.forward[key] = value;
    bi.reverse[value] = key;
};

// get
//
// bi : lookup table object
// key : key for which to retrieve value
//
// return value stored at key
var get = function(bi, key) {
    return bi.forward[key];
};

// getReverse
//
// bi : lookup table object
// reverseKey : value for which to retrieve key
//
// return key stored at value
var getReverse = function(bi, reverseKey) {
    return bi.reverse[reverseKey];
};

// size
//
// bi : lookup table object
//
// return number of items stored in the table
var size = function(bi) {
    return Object.keys(bi.forward).length;
};

// contains
//
// bi : lookup table object
// key : key to check
//
// return whether table contains key
var contains = function(bi, key) {
    return (key in bi.forward);
};

// containsReverse
//
// bi : lookup table object
// reverseKey : value to check
//
// return whether table contains reverseKey value
var containsReverse = function(bi, reverseKey) {
    return (reverseKey in bi.reverse);
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