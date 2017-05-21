const fs = require('fs');
const _ = require("underscore");
const Tensor = require("adnn/tensor");

var types = {
	JSON : 0,
    NUMBER : 1,
    LIST : 2,
    STRING : 3
};

var _mapProduct = function(fn, arr1, arr2) {
    return _.flatten(
        _.map(arr1, function(item1) {
            return _.map(arr2, function(item2) {
                return fn(item1, item2);
            });
        }), false);
}

var areDisjoint = function(l1, l2) {
    return _.some(_mapProduct(function(v1, v2) {
        return _.isEqual(v1, v2);
    }, l1, l2)) ? false : true;
}

var getDimension = function(points, index) {
	return _.map(points, function(point) {
		return point[index]
	});
}

var round = function(value, place) {
	if (place) {
		return Math.round(value*Math.pow(10,place))/(Math.pow(10,place));
	} else {
		return value;
	}
}

var arraySwap = function(arr, i, j) {
	var temp = arr[i];
	arr[i] = arr[j];
	arr[j] = temp;
	return arr;
}

var objectListToTSVString = function(objs) {
	var keys = _.keys(objs[0]);
	var makeTSVLine = function(strList) {
		var line = _.reduce(strList,
			function(acc, s) {
				return acc + "\t" + s;
			}, "");
		return line;
    };

	var headerStr = makeTSVLine(keys);
	var tsvList = _.map(objs,
		function(obj) {
			return makeTSVLine(_.values(obj));
		});

	return _.reduce(tsvList,
		function(acc, s) {
			return acc + "\n" + s;
		}, headerStr);
}

var objectToString = function(obj, valueToStringFn) {
	var objStrs = _.mapObject(obj,
		function(v, k) {
			return k + "\n" + valueToStringFn(v);
		});

    return _.reduce(_.values(objStrs),
    	function(acc, s) {
        	return s + "\n" + acc;
    	}, "");
}

var makeObject = function(l) {
	return _.object(l);
}

/* Vector argmax */

var argmax = function(vector) {
	var max_i = [];
	var maxValue = -Infinity;
	for (var i = 0; i < vector.length; i++) {
		var value = vector.data[i];
		if (value > maxValue) {
			maxValue = value;
			max_i = [];
			max_i.push(i);
		} else if (value == maxValue) {
			max_i.push(i);
		}
	}

	return max_i;
};

// Necessary because webppl
// drops the second argument
var _first = function(l, n) {
	return _.first(l, n);
};

var readListFile = function(filePath) {
    var str = fs.readFileSync(filePath, 'utf8');
	return str.trim().split("\n");
};

// Computes an "average list" from a list of lists
var listExpectation = function(lists) {
	var maxLength = _.max(lists, function(list) { return list.length }).length;
	var exp = [];
	var norms = [];
	for (var i = 0; i < maxLength; i++) {
        exp.push(0.0);
    	norms.push(0.0);
	}

	for (var i = 0; i < lists.length; i++) {
		for (var j = 0; j < lists[i].length; j++) {
			exp[j] += lists[i][j];
			norms[j] += 1.0;
		}
	}

	for (var i = 0; i < maxLength; i++) {
		exp[i] = exp[i] / norms[i];
	}

	return exp;
};

// aggregateKeyValuePairs
//
// kvPairs : list of (key, value)
//
// return object mapping key -> (value list)
var aggregateKeyValuePairs = function(kvPairs) {
	var obj = {};

	obj.full = [];
	for (var i = 0; i < kvPairs.length; i++) {
		if ("key" in kvPairs[i]) {
            var key = kvPairs[i].key;
            var value = kvPairs[i].value;

            if (!(key in obj))
                obj[key] = [];
            obj[key].push(value);
        }
		obj.full.push(value);
	}

	return obj;
};

var _fromString = function(item, type) {
	if (type === types.JSON) {
		return JSON.parse(item);
	} else if (type === types.LIST) {
		if (!item.startsWith("["))
			item = "[" + item + "]";
		return JSON.parse(item);
	} else if (type === types.NUMBER) {
		return parseInt(item);
	} else {
		return item;
	}
};


// removeDuplicateScoredValues
//
// items : (value, score) list
// itemType : (JSON, NUMBER, STRING, LIST)
//
// return (value, score) list with no duplicate values
var removeDuplicateScoredValues = function(items, itemType) {
	var obj = {};

	for (var i = 0; i < items.length; i++) {
		obj[items[i].value] = items[i].score;
	}

	var deduped = [];
	for (var key in obj) {
		deduped.push({ value : _fromString(key, itemType), score : obj[key] })
	}

	return deduped;
};

module.exports = {
	types : types,
	areDisjoint : areDisjoint,
	getDimension : getDimension,
	round : round,
	arraySwap : arraySwap,
	objectToString : objectToString,
	objectListToTSVString : objectListToTSVString,
	makeObject : makeObject,
	argmax : argmax,
	_first : _first,
	readListFile : readListFile,
	listExpectation : listExpectation,
    aggregateKeyValuePairs : aggregateKeyValuePairs,
	removeDuplicateScoredValues : removeDuplicateScoredValues
};
