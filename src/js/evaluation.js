var _ = require("underscore");
var dist = require("./dist");
var Tensor = require("adnn/tensor");

var _meanMeasure = function(p_hats, ps, measureFn) {
    var pp_hats = _.zip(ps, p_hats);
    var ktds = _.map(pphats, function(pphat) { return measureFn(pphat[0], pphat[1])});
    return listMean(ktds);
}

var accuracy = function(p_hats, ps) {
    return _meanMeasure(p_hats, ps, dist.shareModes);
};

var KL = function(p_hats, ps) {
    return _meanMeasure(p_hats, ps, dist.KL);
};

var KTD = function(p_hats, ps) {
	return _meanMeasure(p_hats, ps, dist.kendallTauDistance);
};

var WKTD = function(p_hats, ps) {
    return _meanMeasure(p_hats, ps, dist.weightedKendallTauDistance);
};

var MAUC = function(p_hats, ps) {
    var op_hats = _.map(p_hats, function (p_hat) { return dist.distToObject(p) });
    var ops = _.map(ps, function (p) { return dist.distToObject(p) });

	var A_hat_cond = function (c_i, c_j) {
		var num = 0.0;
		var den = 0.0;
		for (var x_j = 0; x_j < ops.length; x_j++) {
			var op_hat_j = op_hats[x_j];
			var op_j = ops[x_j];
			if (_.contains(dist.objectModes(op_j), c_j)) {
				for (var x_i = 0; x_i < ops.length; x_j++) {
					var op_hat_i = op_hats[x_i];
					var op_i = ops[x_i];
					if (_.contains(dist.objectModes(op_i, c_i))) {
						// Randomly drawn true class j has estimated est_ji = p_j(c_i) less than
						// est_ii=p_i(c_i) for randomly drawn true class i
						var est_ji = _.contains(op_hat_j, c_i) ? op_hat_j[c_i] : 0.0;
						var est_ii = _.contains(op_hat_i, c_i) ? op_hat_i[c_i] : 0.0;

						num += (est_ji < est_ii) ? 1.0 : 0.0;
						den += 1.0;
					}
				}
			}
		}

		return num/den;
    };

    var A_hat = function (c_i, c_j) {
        return (A_hat_cond(c_i, c_j) + A_hat_cond(c_j, c_i)) / 2.0;
    };

    var classes = _.union(dist.objectFullSupport(op_hats), dist.objectFullSupport(ops));
    var sumA = 0.0;
    var c = classes.length;
    for (var i = 0; i < c; i++) {
        for (var j = i + 1; j < c; j++) {
            sumA = sumA + A_hat(classes[i], classes[j]);
        }
    }

    return (2.0 / (c * (c - 1.0))) * sumA;
}

var sampleMSE = function(Y_hat, Y) {
	var total = 0.0;
	for (var i = 0; i < Y.length; i++) {
        var y_i = Y[i];
        var y_hat_i = Y_hat[i];
		var diff_i = T.sub(y_i, y_hat_i);
		var value = T.sumreduce(T.dot(diff_i, T.transpose(diff_i)));
		total += value;
	}

	return total/Y.length;
}

module.exports = {
	accuracy : accuracy,
	KL : KL,
	KTD : KTD,
	WKTD : WKTD,
    MAUC : MAUC,
	sampleMSE : sampleMSE
}
