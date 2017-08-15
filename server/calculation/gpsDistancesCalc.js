/*
 *
 *  Code created by Rico Fritzsche 2015
 *  Copyright SAM [Rico Fritzsche, Christoph Prinz, Simon Sander]
 *
 */

var distance = require('gps-distance');

var factor = 1000.0;

/*
 * Calculate the distance from the first gps point to the last one.
 * param:   data object with an array of points
 * ret:     distance over each gps points in meters
 */
 exports.s2e_distance = function(data){
    var result = 0;
    for(var i=0; i<(data.points.length)-1;i++){
        result += (distance(data.points[i].lat, data.points[i].lon, data.points[i+1].lat, data.points[i+1].lon) * factor);
    }
    return result;
};

/*
 * Calculate the distance from gps point to the next one.
 * param:   two gps points
 * ret:     distance in meters
 */
exports.p2p_distance = function(pt1, pt2){
    return (distance(pt1.lat, pt1.lon, pt2.lat, pt2.lon) * factor);
};


exports.v01sumDistance = function(data){
    var result = 0;
    for(var i=0; i<(data.points.length)-1;i++){
        result += (data.points[i].d);
    }
    return result;
};

exports.v02sumDistance = function(data){
    var result = 0;
    for(var i=0; i<(data.length)-1;i++){
        result += (data[i].properties.distance);
    }
    return result;
};
