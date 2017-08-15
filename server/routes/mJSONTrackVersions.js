/*
 *
 *  Code created by RicoFritzsche 2015
 *  Copyright SAM [Rico Fritzsche, Christoph Prinz, Simon Sander]
 *
 */

var fs = require('fs');
var logger = require('../util/logger.js');


/*
 *  Reads the body of a http post-response for data reception and conversion to internal data structure.
 *  param:  data.user, data.tag, data.points[i].la, data.points[i].lo, data.points[i].t, data.points[i].fuel, data.points[i].d
 *  format: text/plain
 *  ret:    userID, tag, points.lat, points.lon, points.t, points.fuel, points.d
 */
exports.v01read_json_data = function(req, callback) {
    var json_body = '';
    req.on(
        'readable',
        function () {
            var d = req.read();
            if (d) {
                if (typeof d == 'string') {
                    json_body += d;
                } else if (typeof d == 'object' && d instanceof Buffer) {
                    try {
                        json_body += d.toString('utf8');
                    } catch (err) {
                        callback(err);
                    }
                }
            }
        });

    req.on('end', function () {
        try {
            var pData = JSON.parse(json_body);  //JSON string to object
                var jData = {"userID": pData.user, "tag": pData.tag};
            var pointArray = new Array(pData.points.length);
            for (var i in pData.points) {
                pointArray[i] = {
                    "lat": pData.points[i].la,
                    "lon": pData.points[i].lo,
                    "t": pData.points[i].t,
                    "fuel": pData.points[i].fuel,
                    "d": pData.points[i].d
                }
            }
            jData.points = pointArray;
            callback(null, jData);
        } catch (err) {
            callback(err);
        }
    });
}

/*
 *  Reads the body of a http post-response for data reception without any conversion.
 *  param:  data.user, data.tag, data.points[i].lat, data.points[i].lon, data.points[i].t, data.points[i].fuel, data.points[i].d
 *  format: text/plain
 *  ret:    userID, tag, points.lat, points.lon, points.t, points.fuel, points.d
 */
exports.v02read_json_data = function(req, callback) {
    var json_body = '';
    req.on(
        'readable',
        function () {
            var d = req.read();
            if (d) {
                if (typeof d == 'string') {
                    json_body += d;
                } else if (typeof d == 'object' && d instanceof Buffer) {
                    try {
                        json_body += d.toString('utf8');
                    } catch (err) {
                        callback(err);
                    }
                }
            }
        });

    req.on('end', function () {

        try {
            var jData = JSON.parse(json_body);  // JSON string to object
            callback(null, jData);
        } catch (err) {
            callback(err);
        }
    });
}
