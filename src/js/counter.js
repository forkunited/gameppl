const _ = require('underscore');
const fs = require('fs');

var init = function() {
    return { counts : {}};
};

var increment = function(c, key) {
    if (!(key in c.counts)) {
        c.counts[key] = 0;
    }
    c.counts[key] += 1;
};

var removeLessThan = function(c, min) {
    var toRemove = [];
    for (key in c.counts) {
        if (c.counts[key] < min)
            toRemove.push(key);
    }

    for (var i = 0; i < toRemove.length; i++) {
        delete c.counts[toRemove[i]];
    }
};

var buildIndex = function(c, fixedIndices) {
    var keys = Object.keys(c.counts).slice();
    keys.sort();
    var index = {};

    // FIXME This is a slow way to do this... but
    // it's fine for now
    if (fixedIndices) {
        for (var i = 0; i < keys.length; i++) {
            if (keys[i] in fixedIndices) {
                var index = fixedIndices[keys[i]];
                var temp = keys[index];
                keys[index] = keys[i];
                keys[i] = temp;
            }
        }
    }

    for (var i = 0; i < keys.length; i++) {
        index[keys[i]] = i;
    }
    return index;
};

var getSortedCounts = function(c) {
    return _.pairs(c.counts).sort(function(p1, p2) {
        if (p1[1] < p2[1]) {
            return 1;
        } else if (p1[1] > p2[1]) {
            return -1;
        } else {
            return p1[0].localeCompare(p2[0]);
        }
    });
};

var getTop = function(c, k) {
    var sorted = getSortedCounts(c);
    if (k <= sorted.length)
        sorted = _.first(sorted, k)
    return _.object(sorted);
};

var size = function(c) {
    return Object.keys(c.counts).length;
};

module.exports = {
    init : init,
    increment : increment,
    removeLessThan : removeLessThan,
    buildIndex : buildIndex,
    getSortedCounts : getSortedCounts,
    getTop : getTop,
    size : size
};