var _ = require("underscore");

var distToObject = function(dist, roundPlace) {
	if (dist.params.vs !== undefined) {
		var obj = {};
		for (var i = 0; i < dist.params.vs.length; i++) {
			obj[dist.params.vs[i]] = Math.round(dist.params.ps[i] * Math.pow(10,roundPlace))/ Math.pow(10,roundPlace);
		}
		return obj;
    } else {
        return _.mapObject(dist.params.dist, function (val, key) {
            return Math.round(val.prob * Math.pow(10,roundPlace))/Math.pow(10,roundPlace);
        });
    }
}

var distToArray = function(dist, round) {
	return _.pairs(distToObject(dist, round)).sort(function(p1, p2) { return p1[1] === p2[1] ? 0 : p1[1] < p2[1] ? 1 : -1 });
}

var fullSupport = function(ps) {
    return objectFullSupport(_.map(ps, function(p) { return distToObject(p) }));
}

var arrayFullSupport = function(ps) {
    return objectFullSupport(_.map(ps, function(p) { return _.object(p) }));
}

var objectFullSupport = function(ps) {
    var supports = _.map(ps, function(p) { return _.keys(p)});
    return _.reduce(supports, function(acc, p) { return _.union(acc, p) }, []);
}

var unifySupport = function(p, q) {
	return objectUnifySupport(distToObject(p), distToObject(q));
}

var arrayUnifySupport = function(p, q) {
	return objectUnifySupport(_.object(p), _.object(q));
}

var objectUnifySupport = function(p, q) {
	var support = _.union(_.keys(p), _.keys(q));
	var newP = _.object(_.map(support, function(item) {
		return _.has(p, item) ? [item, p[item]] : [item, 0]
	}));

	var newQ = _.object(_.map(support, function(item) {
		return _.has(q, item) ? [item, q[item]] : [item, 0]
	}));

	return [newP,newQ];
}

var modes = function(p) {
	return objectModes(distToObject(p));
}

var arrayModes = function(p) {
	return objectModes(_.object(p));
}

var objectModes = function(p) {
    var pList = _.pairs(p);
    var pSorted = _.sortBy(pList, function(v){ return -v[1]; });
    var pTop = _.filter(pSorted, function(v) { return v[1] == pSorted[0][1] });
	return getDimension(pTop, 0);
}

var shareModes = function(p, q) {
    return objectShareModes(distToObject(p), distToObject(q));
}

var arrayShareModes = function(p, q) {
    return objectShareModes(_.object(p), _.object(q));
}

var objectShareModes = function(p, q) {
	var pModes = objectModes(p);
	var qModes = objectModes(q);
	return areDisjoint(pModes, qModes) ? 0.0 : 1.0;
}

var KL = function(p, q) {
	return objectKL(distToObject(p), distToObject(q));
}

var arrayKL = function(p, q) {
	return objectKL(_.object(p), _.object(q));
}

var objectKL = function(p, q) {
	return _.reduce(
		_.mapObject(p, function(val, key) {
			return (q[key] == 0) ? 0 : val*Math.log(val/q[key])/Math.log(2);
	
		}), 
		function (sum, val) { return sum + val }
	);
}

var kendallTauDistance = function(p, q) {
	return objectKendallTauDistance(distToObject(p), distToObject(q));
}

var arrayKendallTauDistance = function(p, q) {
	return arrayKendallTauDistance(_.object(p), _.object(q));
}

var objectKendallTauDistance = function(p, q) {
	var pq = objectUnifySupport(p,q);
	var uP = pq[0];
	var uQ = pq[1];
	var support = _.keys(uP);

	var results = _.reduce(_.flatten(
		_.map(support, function(i1) {
			return _.map(support, function(i2) {
				if (i1 >= i2 || uP[i1] == uP[i2]) {
					return { v : 0.0, n : 0.0 };
				} else if (Math.sign(uP[i1]-uP[i2]) == Math.sign(uQ[i1]-uQ[i2])) {
					return { v: 0.0, n : 1.0 };
				} else {
					return { v: 1.0, n : 1.0 };
				}
			})
		})), function(acc, i) { return { v : acc.v + i.v, n: acc.n + i.n } }, { v : 0, n : 0 }); 

	return results.v/results.n;
}

var weightedKendallTauDistance = function(p, q) {
	return objectWeightedKendallTauDistance(distToObject(p), distToObject(q));
}

var arrayWeightedKendallTauDistance = function(p, q) {
	return arrayWeightedKendallTauDistance(_.object(p), _.object(q));
}

var objectWeightedKendallTauDistance = function(p, q) {
	var pq = objectUnifySupport(p,q);
	var uP = pq[0];
	var uQ = pq[1];
	var support = _.keys(uP);

	var results = _.reduce(_.flatten(
		_.map(support, function(i1) {
			return _.map(support, function(i2) {
				if (i1 >= i2 || uP[i1] == uP[i2]) {
					return { v : 0.0, n : 0.0 };
				} else if (Math.sign(uP[i1]-uP[i2]) == Math.sign(uQ[i1]-uQ[i2])) {
					return { v: 0.0, n : uP[i1]*uP[i2] };
				} else {
					return { v: uP[i1]*uP[i2], n : uP[i1]*uP[i2] };
				}
			})
		})), function(acc, i) { return { v : acc.v + i.v, n: acc.n + i.n } }, { v : 0, n : 0 }); 

	return results.v/results.n;
}

module.exports = {
	distToArray : distToArray,
	distToObject : distToObject,
	objectFullSupport : objectFullSupport,
	arrayFullSupport : arrayFullSupport,
	fullSupport : fullSupport,
	objectModes : objectModes,
	arrayModes : arrayModes,
	modes : modes,
    shareModes : shareModes,
    objectShareModes : objectShareModes,
    arrayShareModes : arrayShareModes,
    objectUnifySupport : objectUnifySupport,
    arrayUnifySupport : arrayUnifySupport,
    unifySupport : unifySupport,
	KL : KL,
    objectKL : objectKL,
    arrayKL : arrayKL,
	kendallTauDistance : kendallTauDistance,
	objectKendallTauDistance : objectKendallTauDistance,
	arrayKendallTauDistance : arrayKendallTauDistance,
	weightedKendallTauDistance : weightedKendallTauDistance,
	objectWeightedKendallTauDistance : objectWeightedKendallTauDistance,
	arrayWeightedKendallTauDistance : arrayWeightedKendallTauDistance
}

