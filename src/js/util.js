const fs = require('fs');
const _ = require("underscore");
const Tensor = require("adnn/tensor");

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
	var maxLength = _.max(lists, function(list) { return list.length });
	var exp = [];
	var norms = [];
	for (var i = 0; i < maxLength; i++) {
        exp.push(0.0);
    	norms.push(0.0);
	}

	for (var i = 0; i < lists.length; i++) {
		for (var j = 0; j < lists[i].length; j++) {
			exp[i] += lists[i][j];
			norms[i] += 1.0;
		}
	}

	for (var i = 0; i < maxLength; i++) {
		exp[i] = exp[i] / norms[i];
	}

	return exp;
}

module.exports = {
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
	listExpectation : listExpectation
}
