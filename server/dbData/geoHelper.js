/**
 * Created by simon on 16.11.14.
 * Copyright SAM [Rico Fritzsche, Christoph Prinz, Simon Sander]
 */

var Promise = require('prfun');
var extend = require('extend');
var builder = require('xmlbuilder');
var NodeCache = require("node-cache");

var jConfiguration = require('../config.json');
var overpassQuery = require('./overpassQuery');
var api = require('../dbData/apiProvider')(jConfiguration.environment.isLocal);
var ncr = require('../calculation/nextCrossing.js');
var gps_distance = require('../calculation/gpsDistancesCalc');


function GeoHelper() {
    this._crossingCache = new NodeCache({stdTTL: 3600, checkperiod: 0});
    this._previousStreetPromise = Promise.resolve(null);

    this._isEmpty = function (obj) {
        return Object.keys(obj).length === 0;
    };
    //TODO in overpassQuery auslagern
    this._createOverpassQueryStreetname = function (gps, streetname) {
        return new Promise(function (resolve, reject) {
            var overpassObj = overpassQuery.crossingFromStreetName(streetname, gps);
            var query = builder.create(overpassObj, {headless: true}).end({pretty: false});
            resolve(query);
        })
    };

    this._createOverpassQueryID = function (id) {
        return new Promise(function (resolve, reject) {
            var overpassObj = overpassQuery.crossingFromStreetID(id);
            var query = builder.create(overpassObj, {headless: true}).end({pretty: false});
            resolve(query);
        })
    };

    this._createOverpassQueryIDwithStreetNames = function (id) {
        return new Promise(function (resolve, reject) {
            var overpassObj = overpassQuery.crossingFromIDwithStreetNames(id);
            var query = builder.create(overpassObj, {headless: true}).end({pretty: false});
            //console.log(query)
            resolve(query);
        })
    };
}

/**
 * Find the crossings in an output of overpass. A crossing is definded as a node which connects more than 2 streets
 * @method findCrossingNodes
 * @param {object} result
 * @return {object} crossingNodes
 */
GeoHelper.prototype.findCrossingNodes = function (result) {
    var crossingNodes = [];
    var nodesArray = result.elements;
    var node = null;
    nodesArray.forEach(function (element) {
        // check the type of an elemnet in the result
        if (element.type == 'node')
            node = element;
        else if (element.count) {
            // check the count of ways at on node
            if (element.count.ways >= 2) {
                delete node.type;
                crossingNodes.push(node);
            }
        }
    });
    return crossingNodes;
};

/**
 * Find the crossings in an output of overpass.
 * A crossing is definded as a node which connects more than 2 streets with different names
 * @method findCrossingNodeswithStreetNames
 * @param {object} result
 * @return {object} crossingNodes
 */
GeoHelper.prototype.findCrossingNodeswithStreetNames = function (result) {
    var resultArray = result.elements;
    var crossingNodes = [];

    var resultObjArray = [];
    var waysArray = [];
    var node = null;
    var wayCount = 0;
    var wayMaxCount = 0;
    resultArray.forEach(function (item, index, array ) {
        // handle first element
        if ((wayMaxCount == wayCount) && (wayMaxCount != 0)) {
            node.ways = waysArray;
            resultObjArray.push(node);
            // reset
            waysArray = [];
            node = null;
            wayCount = 0;
            wayMaxCount = 0;
        }
        switch (item.type) {
            // save the node element
            case 'node':
            {
                node = item;
                delete node.type;
            }
                break;
            // save the street elements without duplicates
            case 'way':
            {
                wayCount++;

                var isOldStreet = waysArray.some(function (element) {
                    return (item.tags.name == element.name);
                });

                if (!isOldStreet) {
                    var way = {"name": item.tags.name, "id": item.id};
                    waysArray.push(way);
                }
            }
                break;
            default:
            {
                wayMaxCount = item.count.ways;
            }
        }

    });
    // handle last element
    if ((wayMaxCount == wayCount) && (wayMaxCount != 0)) {
        node.ways = waysArray;
        resultObjArray.push(node);
        // reset
        waysArray = [];
        node = null;
        wayCount = 0;
        wayMaxCount = 0;
    }

    // if all streets are parsed and verified, the crossing node will be append to the result
    resultObjArray.forEach(function (item, index, array ) {
        if (item.ways.length >= 2) {
            crossingNodes.push(item)
        }
    });

    return crossingNodes;
};

/**
 * Get the closest street to given gps point. Use gisgraphy webservice.
 * @method getStreetGisgraphy
 * @param gps (lat, lon)
 * @return {object} street
 */
GeoHelper.prototype.getStreetGisgraphy = function (gps) {
    return api.gisgraphyReverse(gps)
        .then(function (result) {
            if (result.numFound == 0) {
                //return {};
                throw 'Gisgraphy: found no road';
            }

            var streets = result.result;

            function sortStreetDistance(a, b) {
                if (a.distance > b.distance)
                    return 1;
                if (a.distance < b.distance)
                    return -1;

                return 0;
            }

            // sorts the street after the distance to the given point
            streets.sort(sortStreetDistance);

            return {
                "street": streets[0].name,
                "id": streets[0].openstreetmapId,
                "gps": {
                    "lat": streets[0].lat,
                    "lon": streets[0].lng
                }
            };
        });
};

/**
 * Get the closest street to given gps point. Use nominatim webservice.
 * @method getStreetNominatim
 * @param gps (lat, lon)
 * @return {object} street
 */
GeoHelper.prototype.getStreetNominatim = function (gps) {
    return api.nominatimReverse(gps)
        .then(function (result) {
            if (!result.address.road)
                throw 'Nominatim: found no road';

            streetname = result.address.road;
            return {
                "street": result.address.road,
                "gps": {lat: result.lat, lon: result.lon}
            };
        });
};

/**
 * Find all crossings on given street
 * @method getCrossingsByGisgraphyStreetName
 * @param streetname
 * @return {object} crossings
 */
GeoHelper.prototype.getCrossingsByGisgraphyStreetName = function (streetNamePromise) {
    var that = this;
    var newStreetPromise = Promise.all([streetNamePromise, that._previousStreetPromise])
        .bind(that)
        .then(function (result) {
            var streetname = result[0].street;
            var gps = result[0].gps;
            // look in the cache for the given street
            //console.log(' streetNamePromise: ', result);
            var cache = that._crossingCache.get(streetname);
            //console.log(' cache: ', cache);
            if (!that._isEmpty(cache)) {
                //console.log('get cache: ', streetname);
                return cache
            }
            // if street not in the Cache,
            // create overpass query and find the crossing nodes in the result of overpass
            return that._createOverpassQueryStreetname(gps, streetname)
                .bind(api)
                .then(api.postOverpass)
                .then(that.findCrossingNodes)
                .then(function (result) {
                    //console.log('set cache: ', streetname);
                    // put the result in the cache
                    that._crossingCache.set(streetname, result);
                    return streetname;
                })
        })
        .catch(function (err) {
            console.log('catch: ', reason);
            return;
        });
    this._previousStreetPromise = newStreetPromise;
    return newStreetPromise;
};

/**
 * Find all crossings on given street id
 * @method getCrossingsByGisgraphyStreetName
 * @param streetid
 * @return {object} crossings
 */
GeoHelper.prototype.getCrossingsByGisgraphyStreetId = function (streetIDPromise) {
    var that = this;
    var newStreetPromise = Promise.all([streetIDPromise, that._previousStreetPromise])
        .bind(that)
        .then(function (result) {
            var streetid = result[0].id;
            var gps = result[0].gps;
            //console.log(' streetid: ', streetid);
            // look in the cache for the given street
            var cache = that._crossingCache.get((streetid).toString());
            //console.log(' cache: ', cache);
            if (!that._isEmpty(cache)) {
                //console.log('get cache: ', streetid);
                return cache[(streetid).toString()]
            }
            // if street not in the Cache,
            // create overpass query and find the crossing nodes in the result of overpass
            return that._createOverpassQueryID(streetid)
                .then(api.postOverpass)
                .then(that.findCrossingNodes)
                .then(function (result) {
                    //console.log('set cache: ', streetid);
                    // put the result in the cache
                    that._crossingCache.set(streetid, result)
                    return result;
                })
        }).catch(function (reason) {
            console.log('catch: ', reason);
        });
    that._previousStreetPromise = newStreetPromise;
    return newStreetPromise;
};

/**
 * Find all crossings on given street id and use the streetnames to find crossings
 * @method getCrossingsByGisgraphyStreetIdAdvanced
 * @param streetid
 * @return {object} crossings
 */
GeoHelper.prototype.getCrossingsByGisgraphyStreetIdAdvanced = function (streetIDPromise) {
    var that = this;
    var newStreetPromise = Promise.all([streetIDPromise, that._previousStreetPromise])
        .bind(that)
        .then(function (result) {
            var streetid = result[0].id;
            var gps = result[0].gps;
            //console.log(' streetid: ', streetid);
            // look in the cache for the given street
            var cache = that._crossingCache.get((streetid).toString());
            //console.log(' cache: ', cache);
            if (!that._isEmpty(cache)) {
                //console.log('get cache: ', streetid);
                return cache[(streetid).toString()]
            }
            // if street not in the Cache,
            // create overpass query and find the crossing nodes in the result of overpass
            return that._createOverpassQueryIDwithStreetNames(streetid)
                .bind(api)
                .then(api.postOverpass)
                .then(that.findCrossingNodeswithStreetNames)
                .then(function (result) {
                    //console.log('set cache: ', streetid);
                    // put the result in the cache
                    that._crossingCache.set(streetid, result)
                    return result;
                })
        })
        .catch(function (reason) {
            console.log('catch: ', reason);
        });
    that._previousStreetPromise = newStreetPromise;
    return newStreetPromise;
};

GeoHelper.prototype.debugCache = function () {
    console.log('statistic: ', this._crossingCache.getStats());
    //console.log('keys: ', this._crossingCache.keys());

    //var cache = this._crossingCache.get(this._crossingCache.keys());
    //console.log('cache: ', JSON.stringify(cache));
    //var value = [];
    //for (var key in cache) {
    //    value = value.concat(cache[key]);
    //}
    //console.log(value)
};

//var overpass_test_output = function(crossingNodes) {
//    var overpassTestStr = '';
//
//    overpassTestStr = overpassTestStr.concat('(');
//    crossingNodes.forEach(function (element) {
//        overpassTestStr = overpassTestStr.concat('node(' + element.id + ');')
//    });
//    overpassTestStr = overpassTestStr.concat(')->.a;.a out;');
//
//    console.log(overpassTestStr);
//};

module.exports = new GeoHelper();
