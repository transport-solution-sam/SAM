/*
 *
 *  Code created by Rico Fritzsche 2015
 *  Copyright SAM [Rico Fritzsche, Christoph Prinz, Simon Sander]
 *
 */

// use es6-shim as engine
var Promise = require('prfun');
var jConfiguration = require('../config.json');
var db_con = require('../dbData/db.js')(jConfiguration.environment.isTest, jConfiguration.environment.isLocal);
var logger = require('../util/logger.js');
var fs = require('fs');
var helpers = require('./httpResponseHelpers.js');
var async = require('async');
var evaluation = require('../calculation/evaluationCalc.js');

/*
 * Delivers a list with available user tags and there first points. Uses async.waterfall to pass through data and
 * async.eachSeries to approach each element of an array.
 * param:  -
 * style:  json {"userID":X}
 * format: text/plain
 * ret:    list of all available user tags and the first point which is persistent
 *          Array of [{tag, lat, lon, osmID}]
 */
exports.userRoutes = function (req, res) {
    if (req.isAuthenticated()) {
        var user = req.user;
        if (user !== undefined) {
            user = user.toJSON();
        }

        async.waterfall([
            function (callback) {                                           // get all tags for a user by userID
                var tags = [];
                db_con.getTagsByUserId(user.userID).then(
                    function (result) {
                        if (Array.isArray(result)) {
                            result.forEach(function (item) {
                                tags.push(item.tag);
                            });
                        }
                        else {
                            tags.push(item.tag);
                        }

                        callback(null, tags);
                    },
                    function (err) {
                        logger.log_err.error("[evaluationDBQueries/userTrack/getHitsByUserIdAndTag] " + err.message);
                        helpers.send_json_res(res, helpers.returnValues(helpers.error.INTERNAL_ERROR, err.message));
                        callback(err)
                    }
                )
            },
            function (tags, callback) {                                         // get first OSMID for each tag
                var tracksOsmID = [];
                async.eachSeries(tags, function (tag, eachSeriesCallback) {
                    db_con.getOSMIdByUserIdAndTag(user.userID, tag)
                        .then(function (result) {
                            tracksOsmID.push(result[0].osmID);
                            eachSeriesCallback();
                        },
                        function (err) {
                            helpers.send_json_res(res, helpers.returnValues(helpers.error.INTERNAL_ERROR, err.message));
                            callback(err);
                        }
                    )
                }, function (err) {
                    if (err) {
                        callback(err);
                    } else {
                        callback(null, tracksOsmID, tags);
                    }
                });
            }, function (osmIDs, tags, callback) {                              // get parameters for first OSMID and
                var tagsWithFirstCrossing = [];                                 // and build array of objects with tag
                tags.reverse();
                async.eachSeries(osmIDs, function(osmID, eachSeriesCallback) {
                    db_con.getCrossingNodeByOSMID(osmID).then(
                        function (result) {
                            tagsWithFirstCrossing.push({
                                tag: tags.pop(),
                                lat: result.lat,
                                lon: result.lon,
                                osmID: result.osmID
                            });
                            eachSeriesCallback();
                        },
                        function (err) {
                            helpers.send_json_res(res, helpers.returnValues(helpers.error.INTERNAL_ERROR, err.message));
                            callback(err);
                        }
                    )
                }, function (err) {
                    if (err) {
                        callback(err);
                    } else {
                        callback(null, tagsWithFirstCrossing);
                    }
                });
            },
            function (tagsWithFirstCrossing, callback) {                        // send array of objects with first
                helpers.send_json_res(res, tagsWithFirstCrossing);              // OSMID and tag
                callback(null);
            }
        ], function (err, result) {
            if (err) {
                logger.log_err.fatal("[evaluationDBQueries/userTrack/waterfall] " + err.message);
                helpers.send_json_res(res, helpers.returnValues(helpers.error.INTERNAL_ERROR, err.message));
            } else
                logger.log_con.info("Update hitID for user " + user.username);
        });
    }else{
        logger.log_con.info("No authentication, therefore wrong request for tracks");
        helpers.send_json_res(res, helpers.returnValues(helpers.error.NOT_AUTHENTICATED, "No authentication, therefore wrong request for tracks"));
    }
};

/*
 *  Takes an tag from an user, search all hits for this tag and calculate average of the hits
 *  param:  tag
 *  style:  json {"tag":"X"}
 *  format: text/plain
 *  ret:    Array of [{totalFuel, totalDistance, totalTime, points: [{lon, lat, fuel, distance, time}]}]
 */
exports.userTrack = function (req, res) {
    if (req.isAuthenticated()) {
        var user = req.user;
        if (user !== undefined) {
            user = user.toJSON();
        }

        async.waterfall([
            function (callback) {
                read_json_data(req, function (err, data) {
                    if (err) {
                        logger.log_err.error("[evaluationDBQueries/userTrack/read_json_data] " + err.message);
                        helpers.send_json_res(res, helpers.returnValues(helpers.error.FALSE_DATA, err.message));
                    } else {
                        callback(null, data.tag);
                    }
                });
            },
            function (userTag, callback){
                var hitIDs = [];
                db_con.getHitsByUserIdAndTag(user.userID, userTag).then(
                    function (result) {
                        if (Array.isArray(result))
                        {
                            result.forEach(function (item)
                            {
                                hitIDs.push(item.hitID);
                            });
                        }
                        else
                        {
                            hitIDs.push(result.hitID);
                        }

                        callback(null, userTag, hitIDs);
                    },
                    function (err) {
                        logger.log_err.error("[evaluationDBQueries/userTrack/getHitsByUserIdAndTag] " + err.message);
                        helpers.send_json_res(res, helpers.returnValues(helpers.error.INTERNAL_ERROR, err.message));
                        callback(err)
                    }
                )
            },
            function (userTag, hitIDs, callback){
                var evaluationTracks = [];
                async.eachSeries(hitIDs, function(hitID, eachSeriesCallback) {
                    db_con.getTracksWithUserIdAndTagAndHitID(user.userID, userTag, hitID).then(
                        function (result) {
                            var resultTrack = evaluation.addUpTrackValues(result);
                            evaluationTracks.push(resultTrack);
                            eachSeriesCallback();
                        },
                        function (err) {
                            helpers.send_json_res(res, helpers.returnValues(helpers.error.INTERNAL_ERROR, err.message));
                            callback(err);
                        }
                    )
                }, function (err) {
                    if (err) {
                        callback(err);
                    } else {
                        callback(null, evaluationTracks);
                    }
                });
            },
            function(evaluationTracks, callback){
                helpers.send_json_res(res, evaluationTracks);
                callback(null);
            }
        ], function (err, result) {
            if(err)
            {
                logger.log_err.fatal("[evaluationDBQueries/userTrack/waterfall] " + err.message);
                helpers.send_json_res(res, helpers.returnValues(helpers.error.INTERNAL_ERROR, err.message));
            } else
                logger.log_con.info("Update hitID for user " + user.username);
        });
    }else{
        logger.log_con.info("No authentication, therefore wrong request for tracks");
        helpers.send_json_res(res, helpers.returnValues(helpers.error.NOT_AUTHENTICATED, "No authentication, therefore wrong request for tracks"));
    }
};


// TODO: swap in extra file for different files
// get json data from request
function read_json_data(req, callback) {
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
            var jData = JSON.parse(json_body);  // parse a string to JSON
            callback(null, jData);
        } catch (err) {
            callback(err);
        }
    });
}
