/**
 * Created by simon on 02.11.14.
 * Copyright SAM [Rico Fritzsche, Christoph Prinz, Simon Sander]
 */

// use es6-shim as engine
var Promise = require('prfun');
var logger = require('../util/logger.js');

var db_test = require("seraph")({
    server: "http://neo4j-server",  // replace adress with own neo4j server
    user: "username",
    pass: "password"
});

/**
 * Description
 * @method SAM_DB
 * @return
 */
function SAM_DB(isTest, isLocal) {

    if (isTest == true)
        this._db = db_test;
    else if (isLocal == true)
        this._db = db_remote;
    else
        this._db = db_remote_docker;

    this._crossingLabel = "CR";
    this._sectionLabel = "DRIVE";

    this._sendNode = Promise.promisify(this._db.save, false, this);
    this._sendRelation = Promise.promisify(this._db.relate, false, this);

    this._addRelation = function (startNode, type, endNode, properties) {
        var that = this;
        return new Promise(function (resolve, reject) {
            if (startNode != null) {
                resolve(that._sendRelation(startNode, type, endNode, properties));
            }
            else {
                reject('no Relation');
            }

        });
    };

    this._promiseBatch = function (operations) {
        var that = this;
        return new Promise(function (resolve, reject) {
            that._db.batch(operations.bind(that), function (err, results) {
                if (err)
                // TODO read error
                    reject(err);
                else {
                    resolve(results.length);
                }

            })
        });
    };

    this._promiseQuery = function (query, param) {
        var that = this;
        return new Promise(function (resolve, reject) {
            that._db.query(query, param, function (err, result) {
                    if (err) {
                        // TODO read error
                        reject(err);
                    } else {
                        resolve(result);
                    }
                }
            )
        });
    };

}

/**
 * Clear DB
 * @method clearDB
 * @return
 */
SAM_DB.prototype.clearDB = function () {
    var cypher = "MATCH (n) "
        + "OPTIONAL MATCH (n)-[r]-() "
        + "DELETE n,r ";

    this._db.queryRaw(cypher, function (err, result) {
        if (err) throw err;
    })
};

/**
 * Add a List of GPSPoints and Section in a fast Batch Mode
 * @method addGPSListBatch
 * @param {object} tripObject
 * @return promise
 */
SAM_DB.prototype.addGPSListBatch = function (tripObject) {

    var userID = tripObject.userID;
    var trackID = tripObject.trackID;
    var hitID = tripObject.hitID;
    var tag = tripObject.tag;
    var gpsPoints = [];
    var gpsPointNodes = [];
    var sections = [];

    for (var i = 0; i < tripObject.points.length; i++) {

        var gpsPoint = {
            'lon': tripObject.points[i].lon,
            'lat': tripObject.points[i].lat,
            'osmID': tripObject.points[i].osmID
        };

        gpsPoints.push(gpsPoint);

        var section = {
            // calc time duration
            //'duration': tripObject.points[i].duration,
            'fuel': tripObject.points[i].fuel,
            'time': tripObject.points[i].time,
            'distance': tripObject.points[i].distance,
            'userID': userID,
            'trackID': trackID,
            'hitID': hitID,
            'tag': tag
        };

        sections.push(section);
    }

    logger.log_all.info("save " + tripObject.points.length + " to the GraphDataBase");


    return promise = this._promiseBatch(function (txn) {
        var i;
        for (i = 0; i < gpsPoints.length; i++) {
            gpsPointNodes.push(txn.save(gpsPoints[i]));
        }

        for (i = 0; i < (gpsPointNodes.length - 1); i++) {
            txn.relate(gpsPointNodes[i], this._sectionLabel, gpsPointNodes[i + 1], sections[i + 1]);
        }

        for (i = 1; i < (gpsPointNodes.length - 1); i++) {
            txn.label(gpsPointNodes[i], this._crossingLabel);
        }
    });
};

/**
 * Find a hitID for a users tag.
 * @method getHitsByUserIdAndTag
 * @param userID, tag
 * @return promise
 */
SAM_DB.prototype.getHitsByUserIdAndTag = function(userID, tag){
    var param = {
        userID: userID,
        tag: tag
    };

    var cypher = "Match (s)-[r]->(e) " +
        "WHERE r.userID = {userID} AND r.tag = {tag} " +
        "RETURN DISTINCT r.hitID AS hitID";

    return this._promiseQuery(cypher, param).then(function (result) {
                return result;
        },
        function (err) {
            throw err;
        });
};

/**
 * Get all trackIDs for a user with tag and hitID.
 * @method getTrackIDsWithUserIdAndTagAndHitID
 * @param userID, tag, hitID
 * @return promise
 */
SAM_DB.prototype.getTrackIDsWithUserIdAndTagAndHitID = function(userID, tag, hitID){
    var param = {
        userID: userID,
        tag: tag,
        hitID: hitID
    };

    var cypher = "MATCH ()-[r:DRIVE]->() " +
        "WHERE r.userID = {id} AND r.tag = {tag} AND r.hitID = {hitID} " +
        "RETURN DISTINCT r.trackID";

    return this._promiseQuery(cypher, param).then(function (result) {
            return result;
        },
        function (err) {
            throw err;
        });
};


/**
 * Get all complete tracks for a user with tag and hitID ordered by time
 * @method getTracksWithUserIdAndTagAndHitID
 * @param userID, tag, hitID
 * @return promise
 */
SAM_DB.prototype.getTracksWithUserIdAndTagAndHitID = function(userID, tag, hitID){
    var param = {
        userID: userID,
        tag: tag,
        hitID: hitID
    };

    var cypher = "MATCH (s)-[r:DRIVE]->(e) " +
        "WHERE r.userID = {userID} AND r.tag = {tag} AND r.hitID = {hitID} " +
        "RETURN s,r,e " +
        "ORDER BY r.time";

    return this._promiseQuery(cypher, param).then(function (result) {
            return result;
        },
        function (err) {
            throw err;
        });
};

/**
 * Connect two new nodes (crossings) with a new relation and new relation parameteres.
 * @method createPointsWithRelation
 * @param that, userID, tag, trackID, previousPoint, nextPoint
 * @return promise
 */
function createPointsWithRelation(that, userID, tag, trackID, previousPoint, nextPoint) {
    var param = {
        fuel: nextPoint.fuel,
        time: nextPoint.time,
        distance: nextPoint.distance,
        userID: userID,
        trackID: trackID,
        tag: tag,
        pOsmID: previousPoint.osmID,
        pLat: previousPoint.lat,
        pLon: previousPoint.lon,
        nOsmID: nextPoint.osmID,
        nLat: nextPoint.lat,
        nLon: nextPoint.lon
    };

    var cypher = "CREATE (s:CR {osmID:{pOsmID}, lat: {pLat}, lon: {pLon}}),(e:CR {osmID:{nOsmID}, lat: {nLat}, lon: {nLon}}) " +
        "CREATE (s)-[r:DRIVE {fuel: {fuel}, time:{time}, distance:{distance}, userID:{userID}, trackID: {trackID}, tag: {tag}}]->(e) " +
        "RETURN s,r,e";

    return that._promiseQuery(cypher, param).then(function (result) {
            if (result.length == 0)
                return null;
            else {
                return result[0]; }
        },
        function (err) {
            throw err;
        });
}

/**
 * Create the first node (crossing) and add a relation with all parameters to the next node which is given.
 * @method createPointWithRelation
 * @param that, userID, tag, trackID, previousPoint, nextPoint
 * @return promise
 */
function createPointWithRelation(that, userID, tag, trackID, previousPoint, nextPoint){
    var param = {
        fuel: nextPoint.fuel,
        time: nextPoint.time,
        distance: nextPoint.distance,
        userID: userID,
        trackID: trackID,
        tag: tag,
        pOsmID: previousPoint.osmID,
        pLat: previousPoint.lat,
        pLon: previousPoint.lon,
        nOsmID: nextPoint.osmID
    };

    var cypher = "MATCH (e:CR {osmID:{nOsmID}}) " +
        "CREATE (s:CR {osmID:{pOsmID}, lat: {pLat}, lon: {pLon}}) " +
        "CREATE (s)-[r:DRIVE {fuel: {fuel}, time:{time}, distance:{distance}, userID:{userID}, trackID: {trackID}, tag: {tag}}]->(e) " +
        "RETURN s,r,e";

    return that._promiseQuery(cypher, param).then(function (result) {
            if (result.length == 0)
                return null;
            else
                return result[0];
        },
        function (err) {
            throw err;
        });
}

/**
 * Create a relation between two points. Neither the next node is given or not. If not then create the first, the second
 * and the relation. Otherwise just create the first point and the relation to the given second point. (case 1 or 2)
 * Four cases exists:
 *  1)  new crossing with new relation to new crossing
 *  2)  new crossing with new relation to existing crossing (because of implementation structure automatically implemented)
 *  3)  existing crossing with new relation to new crossing
 *  4)  existing crossing with new relation to existing crossing
 * @method addPointWithRelation
 * @para userID, tag, trackID, previousPoint, nextPoint
 * @return promis
 */
SAM_DB.prototype.addPointWithRelation = function (userID, tag, trackID, previousPoint, nextPoint) {
    var that = this;

    return that.getCrossingNodeByOSMID(nextPoint.osmID)
        .then(function (node) {
            if (node == null) {
                return createPointsWithRelation(that, userID, tag, trackID, previousPoint, nextPoint);
            } else {
                return createPointWithRelation(that, userID, tag, trackID, previousPoint, nextPoint);
            }
        });
};

/**
 * Add a relation from a given node (crossing) to a new created node.
 * @method createRelationWithNewPoint
 * @param that, userID, tag, trackID, previousOSMID, nextPoint
 * @return promise
 */
function createRelationWithNewPoint(that, userID, tag, trackID, previousOSMID, nextPoint) {
    var param = {
        fuel: nextPoint.fuel,
        time: nextPoint.time,
        distance: nextPoint.distance,
        userID: userID,
        trackID: trackID,
        tag: tag,
        pOsmID: previousOSMID,
        nOsmID: nextPoint.osmID,
        nLat: nextPoint.lat,
        nLon: nextPoint.lon
    };

    var cypher = "MATCH (s) " +
        "WHERE s.osmID = {pOsmID} " +
        "CREATE (e:CR {osmID:{nOsmID}, lat: {nLat}, lon:{nLon}})<-[r:DRIVE {fuel:{fuel}, time:{time}, distance:{distance}, userID:{userID}, trackID:{trackID}, tag:{tag}}]-(s) " +
        "RETURN s,r,e";

    return that._promiseQuery(cypher, param).then(function (result) {
            if (result.length == 0)
                return null;
            else
                return result[0];
        },
        function (err) {
            throw err;
        });
}

/**
 * Add a new relation from a given point (with osmID) to a next node.
 * @method addRelationFromPreviousPoint
 * @param userID, tag, trackID, previousOSMID, nextPoint
 * @return promise
 */
SAM_DB.prototype.addRelationFromPreviousPoint = function (userID, tag, trackID, previousOSMID, nextPoint) {
    var that = this;

    return that.getCrossingNodeByOSMID(nextPoint.osmID)
        .then(function (node) {
            if (node != null) {
                var properties = {
                    fuel: nextPoint.fuel,
                    time: nextPoint.time,
                    distance: nextPoint.distance,
                    userID: userID,
                    trackID: trackID,
                    tag: tag
                };

                return that.addRelation(previousOSMID, nextPoint.osmID, properties)
                     .then(function(relation) {
                         return {r: relation};
                     })
            } else {
                return createRelationWithNewPoint(that, userID, tag, trackID, previousOSMID, nextPoint);
            }
        });
};

/**
 * Find all tags to an user.
 * @method getTagsByUserId
 * @para userID
 * @return promis
 */
SAM_DB.prototype.getTagsByUserId = function (userID) {
    var that = this;
    var param = {userID: userID};
    var cypher = "MATCH (n)-[r:DRIVE]->() " +
        "WHERE r.userID = {userID} " +
        "RETURN DISTINCT r.tag AS tag";

    return this._promiseQuery(cypher, param).then(function (result) {
            return result;
        },
        function (err) {
            throw err;
        });
};

/**
 * Get all osmIDs (nodes) for a tag of a user ordered by (input) time.
 * @method getOSMIdByUserIdAndTag
 * @para userID, tag
 * @return promis
 */
SAM_DB.prototype.getOSMIdByUserIdAndTag = function(userID, tag){
    var param = {
        userID: userID,
        tag: tag
    };

    var cypher = "MATCH (n)-[r:DRIVE]->() " +
        "WHERE r.userID = {userID} AND r.tag = {tag} " +
        "RETURN n.osmID AS osmID " +
        "ORDER BY r.time";

    return this._promiseQuery(cypher, param).then(function (result) {
            return result;
        },
        function (err) {
            throw err;
        });
};

/**
 * Get a especially node (given osmID).
 * @method getCrossingNodeByOSMID
 * @param osmID
 * @return promise
 */
SAM_DB.prototype.getCrossingNodeByOSMID = function (osmID) {
    var param = {osmID: osmID};
    var cypher = "MATCH (n {osmID:{osmID}}) " +
        "RETURN DISTINCT n";

    return this._promiseQuery(cypher, param).then(function (result) {
            if (result.length == 0)
                return null;
            else
                return result[0];
        },
        function (err) {
            throw err;
        });
};

/**
 * Find all connected nodes from a given node (given osmID) of userID and tag.
 * @method getConnectedCrossingNode
 * @param userID, tag, osmID
 * @return promise
 */
SAM_DB.prototype.getConnectedCrossingNode = function (userID, tag, osmID) {
    var param = {userID: userID, tag: tag, osmID: osmID};
    var cypher = "MATCH (s)-[r:DRIVE]-(e) " +
        "WHERE r.userID={userID} AND r.tag={tag} AND s.osmID={osmID} " +
        "RETURN DISTINCT e";

    return this._promiseQuery(cypher, param).then(function (result) {
            if (result.length == 0)
                return null;
            else
                return result;
        },
        function (err) {
            throw err;
        });
};


/**
 *
 * @method deleteTrackParam
 * @param
 * @return promise
 */
/*
SAM_DB.prototype.deleteTrackParam = function (userID, trackID, tag) {

 // delete userID, trackID und hitID löschen an jedem Konten und Graph
 // REMOVE n:Person Remove a label from n.
 // REMOVE n.property Remove a property.

    var param = {userID: userID, tag: tag, trackID: trackID};
    var cypher = "MATCH (s)-[r:DRIVE]->(e) " +
        "WHERE r.userID = {userID} AND r.tag = {tag} AND r.trackID = {trackID} " +
        "REMOVE n.property";

    return this._promiseQuery(cypher, param).then(function (result) {
            if (result.length == 0)
                return null;
            else
                return result;
        },
        function (err) {
            throw err;
        });
};
*/
/**
 * Add a relation with all given properties between two given osmIDs (nodes).
 * @method addRelation
 * @para startOSMID, endOSMID, properties
 * @return promis
 */
SAM_DB.prototype.addRelation = function (startOSMID, endOSMID, properties) {
    var param = {
        start: startOSMID,
        end: endOSMID,
        fuel: properties.fuel,
        time: properties.time,
        distance: properties.distance,
        userID: properties.userID,
        trackID: properties.trackID,
        tag: properties.tag
    };

    var cypher = "MATCH (s {osmID:{start}}),(e {osmID:{end}}) " +
        "CREATE (s)-[r:DRIVE {fuel: {fuel}, time:{time}, distance:{distance}, userID:{userID}, trackID: {trackID}, tag: {tag}}]->(e) " +
        "RETURN r";

    return this._promiseQuery(cypher, param).then(function (result) {
            if (result.length == 0)
                return null;
            else
                return result[0];
        },
        function (err) {
            throw err;
        });
};

/**
 * Find a relation between two given omsIDs (nodes) with all relation parameters.
 * @method getRelation
 * @para startOSMID, endOSMID
 * @return promis
 */
SAM_DB.prototype.getRelation = function (startOSMID, endOSMID) {
    var param = {
        start: startOSMID,
        end: endOSMID
    };
    var cypher = "MATCH (s {osmID:{start}})-[r:DRIVE]-(e {osmID:{end}}) " +
        "RETURN r";

    return this._promiseQuery(cypher, param).then(function (result) {
            if (result.length == 0)
                return null;
            else
                return result;
        },
        function (err) {
            throw err;
        });
};

/**
 * Add to an array of relationIDs (belong to a track) hitID.
 * @method addHitToRealtion
 * @para relationIDs, hit
 * @return promis
 */
SAM_DB.prototype.addHitToRealtion = function (relationIDs, hit) {
    var that = this;
    var querys = [];

    relationIDs.forEach(function(id) {
        var param = {id: id, hit: hit};
        var cypher = "MATCH ()-[r]->() " +
            "WHERE id(r)= {id} " +
            "SET r.hitID = {hit} " +
            "RETURN r";
        querys.push(that._promiseQuery(cypher, param));
    });

    return Promise.all(querys).then(function (result) {
            if (result.length == 0)
                return null;
            else
                return result;
        },
        function (err) {
            throw err;
        });
};

// get tracks form a user to evaluate them
//TODO work only for two separate tracks
SAM_DB.prototype.getUserTrack = function (userid, tag) {
    var param = {id: userid, tag: tag};
    var cypher = "MATCH (s)-[r:DRIVE]->(e) " +
        "WHERE r.userID = {id} AND r.tag = {tag} " +
        "RETURN s,r,e";

    return this._promiseQuery(cypher, param).then(function (result) {
            var tracks = [];
            var lastNodeId = null;
            var lastRelation = null;
            var newTrack = false;
            var track = [];
            console.log("RESULT length :\n", result.length);
            console.log("RESULT:\n", result);
            for (var i = 0; i < result.length; i++) {
                var startNode = result[i].s;
                var relation = result[i].r;
                var endNode = result[i].e;
                var point;
                if (lastNodeId == startNode.id) {
                    point = {
                        lon: startNode.lon,
                        lat: startNode.lat,
                        osmID: startNode.osmID,
                        fuel: relation.properties.fuel,
                        distance: relation.properties.distance,
                        time: relation.properties.time
                    };
                    track.push(point);
                    lastRelation = relation;
                    lastNodeId = endNode.id;
                    newTrack = true;
                }
                else {
                    if (newTrack) {
                        tracks.push(track);
                        track = [];
                    }
                    point = {
                        lon: startNode.lon,
                        lat: startNode.lat,
                        osmID: startNode.osmID,
                        fuel: 0,
                        distance: 0,
                        time: 0
                    };
                    track.push(point);
                    lastRelation = relation;
                    lastNodeId = endNode.id;
                }
            }

            tracks.push(track);
            return tracks

        },
        function (err) {
            throw err;
        });
};

/**
 * TODO name correct?
 * @method getTrackIDByUserIdAndTag
 * @param userID, tag
 * @return promise
 */
SAM_DB.prototype.getTrackIDByUserIdAndTag = function (userID, tag) {
    var param = {userID: userID, tag: tag};
    var cypher = "MATCH (n)-[r:DRIVE]->() " +
        "WHERE r.userID = {userID} AND r.tag= {tag} " +
        "RETURN DISTINCT r.trackID AS trackID";

    return this._promiseQuery(cypher, param).then(function (result) {
            var trackIDs = [];
            if (Array.isArray(result)) {
                result.forEach(function (item) {
                    trackIDs.push(item.trackID);
                });
            }
            else {
                trackIDs.push(result.trackID);
            }
            return trackIDs
        },
        function (err) {
            throw err;
        });
};


/**
 * Create a DB Connection
 * @method create_SAM_DB_Connection
 * @return
 */
module.exports = function (isTest, isLocal){
    return new SAM_DB(isTest, isLocal);
};
