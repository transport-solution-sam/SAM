/**
 * Created by simon on 31.01.15.
 * Copyright SAM [Rico Fritzsche, Christoph Prinz, Simon Sander]
 * A Provider to work with external WebServices
 */

var Promise = require('prfun');
var extend = require('extend');
var querystring = require('querystring');
var request = require('request');

var publicNominatimServer = "http://nominatim.openstreetmap.org";
var publicGisgraphyServer = "http://free.gisgraphy.com";
var publicOverpassServer = "http://overpass-api.de/api";

function API (isLocal) {

    if (isLocal) {
        this._gisgraphyServer = publicGisgraphyServer;
        this._overpassServer = publicOverpassServer;
    }
    else {
        this._gisgraphyServer = publicGisgraphyServer;
        this._overpassServer = publicOverpassServer;
    }


}

//TODO return object, gps format
/*
 * Provider to work with the Nominatim Reverse Geocoding Webservices
 * param: gps (lat, lon)
 * return: promise
 */
API.prototype.nominatimReverse = function (gps) {
    var that = this;
    return new Promise(function (resolve, reject) {
        // set parameter for nominatim
        var param = {
            addressdetails: 1,
            limit: 1,
            format: 'json'
        };

        extend(param, gps);

        var url = that._nominatimServer + "/reverse?";

        request(url + querystring.stringify(param), function(error, response, body) {
            if (!error && response.statusCode === 200){
                // resolve Promise wether statusCode is 200 and nominatiom output has no error field
                var json = JSON.parse(body);
                if (json.error){
                    reject(json.error)
                } else
                    resolve(json);
            }
            else if (error) {
                reject('nominatim',error);
            } else if (response) {
                reject(response.statusCode)
            } else
                reject('unknown error')
        });
    });
};

//TODO return object
/*
 * Provider to work with the Gisgraphy Reverse Geocoding Webservices
 * param: gps (lat, lon)
 * return: promise
 */
API.prototype.gisgraphyReverse = function (gps) {
    var that = this;
    // change gps object to work with gisgraphy
    var geographyGps = {lat: gps.lat,lng: gps.lon};
    return new Promise(function (resolve, reject) {
        // set parameter for nominatim
        var param = {
            radius: 500,
            from: 1,
            to: 5,
            distance: true,
            streettype: 'MOTROWAY|TRUNK|PRIMARY|RESIDENTIAL|SECONDARY|TERTIARY|UNCLASSIFIED',
            format: 'json'
        };

        extend(param, geographyGps);

        var url = that._gisgraphyServer + "/street/streetsearch?";

        request(url + querystring.stringify(param), function(error, response, body) {
            if (!error && response.statusCode === 200) {
                // resolve Promise wether statusCode is 200 and gisgraphy output has no error field
                var json = JSON.parse(body);
                if (json.error){
                    reject(json.error)
                } else
                    resolve(json);
            }
            else if (error) {
                reject('gisgraphy: ' + error);
            } else if (response) {
                reject('gisgraphy statusCode: ' + response.statusCode)
            } else
                reject('gisgraphy: unknown error')
        })
    })
};

//TODO return object
/*
 * Provider to work with the Overpass Webservices
 * param: gps (lat, lon)
 * return: promise ()
 */

API.prototype.postOverpass = function (query) {
    var that = this;
    return new Promise(function (resolve, reject) {
        var url = that._overpassServer + '/interpreter?';
        // send query to the overpass API
        request.post(url, function (error, response, body) {
            if (!error && response.statusCode === 200) {
                // resolve Promise wether statusCode is 200
                var json = JSON.parse(body);
                resolve(json);
            }
            else if (error) {
                reject('overpass:' + error);
            } else if (response) {
                reject('overpass:' + response.statusCode)
            } else
                reject('overpass: unknown error')
        }).form({
            data: query
        });
    });
};

module.exports = function (isLocal){
    return new API(isLocal);
};
