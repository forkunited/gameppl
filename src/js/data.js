/* Note: These are in javascript rather than webppl
 * so that they can be passed into javascript functions
 */

var getDatumGame = function(d) {
    return d.game;
};

var getDatumRound = function(d) {
    return d.round;
};

var getDatumGameRound = function(d) {
    return d.game + "_" + d.round;
};

var makeDatumInfoIndicator = function(field, value) {
    return function(datum) {
        return datum.info[field] === value;
    }
};

module.exports = {
    getDatumGame : getDatumGame,
    getDatumRound : getDatumRound,
    getDatumGameRound : getDatumGameRound,
    makeDatumInfoIndicator : makeDatumInfoIndicator
};
