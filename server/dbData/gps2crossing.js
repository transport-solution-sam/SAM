/*
 *
 *  Code created by Rico Fritzsche and Simon Sander 2015
 *  Copyright SAM [Rico Fritzsche, Christoph Prinz, Simon Sander]
 *
 */
var Promise = require('prfun');
var fs = require('fs');
var async = require('async');
var geoHelper = require('./geoHelper.js');
var plotter = require("./../calculation/plotter.js");
var gps = require('../calculation/gpsDistancesCalc.js');
var nextCrossing = require('../calculation/nextCrossing.js');
var gps_distance = require('../calculation/gpsDistancesCalc');

function Crossing() {
    this.gpsPoint = null
    this.properties = null;
    this.street = null;
    this.crossingsOnStreet = null;
    this.nextCrossing = null;
    this.isCrossing = null;
    this.CrossingProperties = null;
}

Crossing.FIND_CROSSING = false;

function GPS2Crossing() {
    this.objCrossArray = [];
    this.output = null;
}

/**
 * a) Convert incoming data object for further procedure and build up the objCross - object.
 * b) Get street name and street id next to a gps point by gisgraphy.
 * c) Get all crossings on a street (over street id).
 * d) Find the crossing on the street next to a given gps point.
 * e) Find the nearest gps point next to a crossing and define it as crossing.
 *    Calculate distance, fuel and time from first point after a crossing to next crossing point.
 * f) Write data to output object
 * @method iterateListSync
 * @param {object} tripObj, callback
 * @return {userID, trackID, tag, points[osmID, lat, lon, fuel, distance, time]}
 */
GPS2Crossing.prototype.iterateListSync = function (tripObj, callback) {
    var that = this;

    this.objCrossArray = [];
    async.series([
            function (seriesCallback) {
                async.eachSeries(tripObj.points, function (item, eachSeriesCallback) {
                    // convert incoming data object for further procedure and build up the objCross - object.
                    var objCross = new Crossing();

                    objCross.gpsPoint = {
                        'lat': item.lat,
                        'lon': item.lon
                    };

                    objCross.properties = {
                        'userID': tripObj.userID,
                        'trackID': tripObj.trackID,
                        'tag': tripObj.tag,
                        'fuel': item.fuel,
                        'time': item.t,
                        'distance': item.d

                    };
                    that.objCrossArray.push(objCross);
                    eachSeriesCallback();
                }, function (err) {
                    if (err) {
                        seriesCallback(err);
                    } else {
                        seriesCallback(null, 'gps points');
                    }
                });
            },
            function (seriesCallback) {
                // get street name and street id next to a gps point by gisgraphy
                async.eachLimit(that.objCrossArray, 10, function (item, eachLimitCallback) {
                    geoHelper.getStreetGisgraphy(item.gpsPoint)
                        .then(function (result) {
                            item.street = result;
                            //console.log("gisgraphy result: ", result);
                            eachLimitCallback()
                        }, function (err) {
                            eachLimitCallback(err);
                        });
                }, function (err) {
                    if (err) {
                        seriesCallback(err);
                    } else {
                        seriesCallback(null, 'getStreetGisgraphy');
                    }
                });
            },
            function (seriesCallback) {
                // Get all crossings on a street (over street id).
                async.each(that.objCrossArray, function (item, eachCallback) {
                    geoHelper.getCrossingsByGisgraphyStreetIdAdvanced(item.street)
                        .then(function (result) {
                            item.crossingsOnStreet = result;
                            //console.log("overpass result: ", result);
                            eachCallback()
                        }, function (err) {
                            eachCallback(err);
                        });
                }, function (err) {
                    if (err) {
                        seriesCallback(err);
                    } else {
                        seriesCallback(null, 'getCrossingsByGisgraphyStreetId');
                    }
                });
            },
            function (seriesCallback) {
                // find the crossing on the street next to a given gps point
                that.objCrossArray.forEach(function (item) {
                    if (item.crossingsOnStreet.length != 0) {
                        item.nextCrossing = nextCrossing.nextCrossroad(item.crossingsOnStreet, item.gpsPoint);
                    }
                });
                seriesCallback(null, 'nextCrossing');
            },
            function (seriesCallback) {
                // find the nearest gps point next to a crossing and define it as crossing
                // calculate distance, fuel and time from first point after a crossing to next crossing point
                findVisitedCrossing(that.objCrossArray);
                seriesCallback(null, 'findVisitedCrossing');
            },
            function (seriesCallback) {
                // write data from previous findVisitedCrossing() to output object
                var lastCrossing = null;
                var totalCrossingDistance = 0

                var crossings = [];
                that.objCrossArray.forEach(function (item, index, array) {

                    if (item.isCrossing) {
                        // eliminate errors and uncertainties
                        // TODO implement elimination of errors and uncertainties
                        if (item.nextCrossing == null) {
                            //console.log("nextCrossing null ", item.CrossingProperties)
                            return;
                        }
                        if (item.nextCrossing.distance > 50.0) {
                            //console.log("to far ", item.CrossingProperties)
                            //console.log("nextCrossing.distance ", item.nextCrossing.distance)
                            return;
                        }
                        if (lastCrossing != null) {
                                if(lastCrossing.nextCrossing.id == item.nextCrossing.id) {
                                    //console.log("delete same id", item.CrossingProperties)
                                    return;
                                }
                        } else {
                                //console.log("lastCrossing null ",item.CrossingProperties)
                            }

                        lastCrossing = item;
                        crossings.push({
                            osmID: item.nextCrossing.id,
                            lat: item.nextCrossing.lat,
                            lon: item.nextCrossing.lon,
                            fuel: item.CrossingProperties.fuel,
                            distance: item.CrossingProperties.distance,
                            time: item.properties.time
                        });
                    }
                });

                that.output = {
                    'userID': that.objCrossArray[0].properties.userID,
                    'trackID': that.objCrossArray[0].properties.trackID,
                    'tag': that.objCrossArray[0].properties.tag,
                    'points': crossings
                };

                seriesCallback(null, 'create OBJ');
            }
        ],

        function (err, results) {
            if (err) {
                logger.log_err.fatal('[gps2crossing/iterateListSync/async.series]: ', err);
                callback(err);
            } else {

                // generate some fancy output if you want
                // plotter.mapResults(that.objCrossArray);
                // plotter.plotDistance2Crossroads(that.objCrossArray);
                // geoHelper.debugCache();

                // check and use of callback function
                if (callback && (typeof callback == "function")) {
                    callback(null, that.output);
                }

                // TODO return needed?
                return that.output;
            }

        });

};

/**
 * Sum up values (fuel, distance) from gps points from crossing to crossing and save is to externel object. Uses the
 * wave function \./\./ to finde the next crossing (shrinking distance from gps points to a crossing and after that
 * raises again). -- Transformation from single gps points to segments between every two crossing points.
 * @method findVisitedCrossing
 * @param objCrossArray
 * @return objCrossArray
 */
var findVisitedCrossing = function (objCrossArray) {

    var fuel = 0;
    var distance = 0;
    var totalDistance=0;
    var totalCrossingDistance=0;

    function saveValues(item) {
        // save the properties in local variables in order to sum up
        fuel += item.properties.fuel;
        distance += item.properties.distance;
        totalDistance += item.properties.distance
        item.CrossingProperties = null;
    }

    objCrossArray.reduce(function (memo, item) {
        // save propertires of the first node
        if (memo == null) {
            item.isCrossing = false;
            saveValues(item);
            return item;
        }
        // save properties if there is any next Crossing
        if (memo.nextCrossing == null || item.nextCrossing == null) {
            item.isCrossing = false;
            saveValues(item);
            return item;
        }


        if (!Crossing.FIND_CROSSING) {
            // when a crossing appear the distance to the crosssing drops
            if (item.nextCrossing.distance < memo.nextCrossing.distance) {
                item.isCrossing = false;
                saveValues(item);
                return item;
            }
            else {
                // at the low point the crossing is detected
                Crossing.FIND_CROSSING = true;
                memo.isCrossing = true;
                memo.CrossingProperties = {fuel: fuel, distance: distance};
                //console.log("add CrossingProperties ", memo.CrossingProperties.distance)
                //console.log("add nextcrossing distance ", memo.nextCrossing.distance)
                totalCrossingDistance += memo.CrossingProperties.distance
                fuel = 0;
                distance = 0;
                saveValues(item);

                return item;
            }
        }
        else {
            // after a crossing the distance to the crossing is going up
            if (item.nextCrossing.distance > memo.nextCrossing.distance) {
                item.isCrossing = false;
                saveValues(item);
                return item;
            }
            else {
                // if the high point is reached, it will be searched the next crossing
                Crossing.FIND_CROSSING = false;
                item.isCrossing = false;
                saveValues(item);
                return item;
            }
        }
    }, null);



    //console.log("last distance", distance)
    //if (objCrossArray[objCrossArray.length-1].nextCrossing)
    //    console.log("last .nextCrossing.distance", objCrossArray[objCrossArray.length-1].nextCrossing.distance)
    //console.log("total: ", totalDistance)
    //console.log("totalCrossing: ", totalCrossingDistance)
    // TODO is return needed?
    return objCrossArray;
};


module.exports = new GPS2Crossing();
