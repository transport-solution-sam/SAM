/*
 *
 *  Code created by Rico Fritzsche and Simon Sander 2015
 *  Copyright SAM [Rico Fritzsche, Christoph Prinz, Simon Sander]
 *
 */

var jConfiguration = require('../config.json');
var db_con = require('../dbData/db.js')(jConfiguration.environment.isTest, jConfiguration.environment.isLocal);
var logger = require('../util/logger.js');
var async = require('async');
var Hits = require('./hitObject.js');
var Model = require('../dbAuthentification/db');


function GetSPoint() {
}

/*
 * Decides how new data are to be connected with existing data sets. Four cases exists:
 *  1)  new crossing with new relation to new crossing
 *  2)  new crossing with new relation to existing crossing (because of implementation structure automatically implemented)
 *  3)  existing crossing with new relation to new crossing
 *  4)  existing crossing with new relation to existing crossing
 * param:   userID, tag, trackID, osmID, nextPoint, hitObj, callback
 * ret:     -
 */
function mergeAlgorithm(userID, tag, trackID, osmID, nextPoint, hitObj, callback) {
    var connectedNodes = [];    // could be more than one
    var selectedConnectedNode = null;

    // find all crossing which ar connected to an node (crossing)
    db_con.getConnectedCrossingNode(userID, tag, osmID)
        .then(function (result) {
            // if node has connected nodes, find next crossing from new data set with osmid
            if (result != null) {
                connectedNodes = result.slice();
                connectedNodes.forEach(function (item) {
                    if (item.osmID == nextPoint.osmID) {
                        selectedConnectedNode = item;
                    }
                });

                if (selectedConnectedNode != null) {
                    // no next node found then case 4
                    db_con.getRelation(osmID, selectedConnectedNode.osmID)
                        .then(function (result) {
                            var tracks =[];
                            var hits =[];

                            result.forEach(function (relation) {
                                tracks.push(relation.properties.trackID);
                                hits.push(relation.properties.hitID);

                                hitObj.updateHits(true, tracks, hits);

                            });

                    // *********************************
                    // merge both nodes with create
                    var properties = {
                        fuel: nextPoint.fuel,
                        time: nextPoint.time,
                        distance: nextPoint.distance,
                        userID: userID,
                        trackID: trackID,
                        tag: tag
                    };
                    db_con.addRelation(osmID, selectedConnectedNode.osmID, properties)
                        .then(function (relation) {
                            console.log("merged " + JSON.stringify(relation));
                            hitObj.addRelation(relation.id);

                                    callback(null, nextPoint);
                                },
                                function (err) {
                                    callback(err);
                                });

                        },
                        function (err) {
                            callback(err);
                        }
                    )
                } else {
                    // next node is found then case 3
                    hitObj.updateHits(false, null, null);
                    db_con.addRelationFromPreviousPoint(userID, tag, trackID, osmID, nextPoint)
                        .then(function (result) {
                            hitObj.addRelation(result.r.id);
                            callback(null, nextPoint);
                        }, function (err) {
                            callback(err);
                        })
                }
            } else {
                // no node is initial found then case 3
                hitObj.updateHits(false, null, null);
                db_con.addRelationFromPreviousPoint(userID, tag, trackID, osmID, nextPoint)
                    .then(function (result) {
                        hitObj.addRelation(result.r.id);
                        callback(null, nextPoint);
                    }, function (err) {
                        callback(err);
                    })
            }

        }, function (err) {
            callback(err);
        });
}

/*
 * Merges incoming data in the existing db set. Uses async.reduce merge point after point and functions from db.js.
 *  1)  new crossing with new relation to new crossing
 *  2)  new crossing with new relation to existing crossing
 *  3)  existing crossing with new relation to new crossing
 *  4)  existing crossing with new relation to existing crossing
 * param:   data object (userID, tag, points: [points.lat, points.lon, points.t, points.fuel, points.d])
 * ret:     -
 */
GetSPoint.prototype.mergeNewData = function (newDataObj, callback) {
    var userID = newDataObj.userID;
    var tag = newDataObj.tag;
    var trackID = newDataObj.trackID;
    var firstPoints = newDataObj.points[0];
    var points = newDataObj.points.slice(1);

    var hitObj = new Hits();

    // merge new data set and after that decide which hit id is needed
    async.reduce(points, firstPoints,
        function (previousPoint, nextPoint, reduceCallback) {
            // check, if previousPoint crossing is in database
            db_con.getCrossingNodeByOSMID(previousPoint.osmID)
                .then(function (node) {
                    if (node == null) {
                        // if no crossing node in db exists add new crossing point (case 1)
                        hitObj.updateHits(false, null, null);
                        db_con.addPointWithRelation(userID, tag, trackID, previousPoint, nextPoint)
                            .then(function (result) {
                                hitObj.addRelation(result.r.id);
                                reduceCallback(null, nextPoint)
                            },function(err){
                                reduceCallback(err)
                            });
                    } else {
                        // if a crossing node exists merge with cases 2 - 4
                        mergeAlgorithm(userID, tag, trackID, previousPoint.osmID, nextPoint, hitObj, reduceCallback);
                    }
                },function(err){
                    reduceCallback(err)
                });
        }
    , function (err, results) {
        // update hit id for user and at it to user track
        if (err) {
            console.log('mergeNewData err: ', err);
            callback(err);
        } else {
            console.log('hitObj: ', hitObj);
            if (!hitObj.isHit) {
                // if track not like track in db - increase hitID
                var hitID = 0;
                new Model.User({userID: userID}).fetch().then(function (dbUser) {
                    if (dbUser.attributes.hitID != null)
                        hitID = dbUser.attributes.hitID;
                    hitID += 1;

                    // get user model and save new hitID and add it for new track
                    new Model.User({userID: userID}).save({hitID: hitID}, {patch: true});
                    db_con.addHitToRealtion(hitObj.relationIDs, hitID)
                        .then(function (result) {
                            callback(null, true);
                        });
                });

            } else {
                // if track like a track in the set hitID for new track
                db_con.addHitToRealtion(hitObj.relationIDs, hitObj.hitIDs[0])
                    .then(function (result){
                        callback(null, true);
                    });
            }


        }

    });
};

module.exports = new GetSPoint();
