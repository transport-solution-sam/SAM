/*
 *
 *  Code created by Rico Fritzsche 2015
 *  Copyright SAM [Rico Fritzsche, Christoph Prinz, Simon Sander]
 *
 */

var moment = require('moment');

/*
 * Calculates the used time from the first gps point to the last one
 * param:   data object with an array of points
 * ret:     used time from start to end of a track
 */
exports.dTime = function (data){
    var t1 = moment(new Date(data.points[0].t)*1000);
    var t2 = moment(new Date(data.points[(data.points.length)-1].t) *1000);

    var delta = t2.subtract(t1);
    delta = delta.toString();
    var splitTime = delta.split(" ");
    var diff_time = splitTime.splice(splitTime.length-2, 1);
    return diff_time[0];
};
