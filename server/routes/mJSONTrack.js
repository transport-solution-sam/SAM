/*
 *
 *  Code created by Rico Fritzsche 2014
 *  Copyright SAM [Rico Fritzsche, Christoph Prinz, Simon Sander]
 *
 */


var getCrossings = require('../dbData/gps2crossing.js');
var express = require('express');
var app = express();
var fs = require('fs');
var converterJSONCSV = require('json-2-csv');
var time = require('../calculation/timeCalc.js');
var gps = require('../calculation/gpsDistancesCalc.js');
var async = require('async');
var logger = require('../util/logger.js');
var versionFunctions = require('./mJSONTrackVersions.js');
var merge = require('../dbData/mergeTracks.js');
var http = require('http');
exports.version = "0.1.0";
var helpers = require('./httpResponseHelpers.js');
var Model = require('../dbAuthentification/db');
var jConfiguration = require('../config.json');
app.set('test_file_path', jConfiguration.data_logging.path);


exports.v01read_json = function(req, res){
    read_json(req, res, 1);
};
exports.v02read_json = function(req, res){
    read_json(req, res, 2);
};

/*
 * If the user is signed in a recorded data set in json will admitted. This function uses async.waterfall to
 * pass through data. Incoming data will be saved in a file an in DB with mergeData().
 * param:   post-body with defined data set, version number
 * ret:     http-response (success or fail)
 */
function read_json (req, res, version) {

    if (req.isAuthenticated()) {
        var user = req.user;
        if (user !== undefined) {
            user = user.toJSON();
        }

        async.waterfall([
            function (callback) {
                // read data from http-post body for each version

                switch(version){
                    case 1: versionFunctions.v01read_json_data(req, jsonCallback);
                        break;
                    case 2: versionFunctions.v02read_json_data(req, jsonCallback);
                        break;
                    default: logger.log_err.warn("wrong version for vXXread_json_data");
                        break;
                }

                function jsonCallback (err, data) {
                    // check for errors in read_json_data
                    if (err) {
                        logger.log_err.warn("wrong data - note saved for user " + user.username);
                        helpers.send_json_res(res, helpers.returnValues(helpers.error.FALSE_DATA, err.message));
                    } else {
                        logger.log_all.debug("[mJSONTrack/read_json/waterfall function 1] success - read json data");
                        callback(null, data);
                    }
                }
            },
            function(data, callback) {
                if ((data.userID) && (data.tag) && (data.points)){
                    callback(null, data);
                } else {
                    logger.log_con.trace("[mJSONTrack/read_json/waterfall] object data has false data");
                    var err = {"message": "few inputs"}
                    callback(err);
                }
            },
            function (data, callback) {
                //get user's trackID from SQL db
                new Model.User({userID: user.userID}).fetch().then(function (dbUser) {
                    var trackID = 0;
                    if (user.trackID != null)
                        trackID = user.trackID;

                    data.trackID = trackID;
                    trackID += 1;
                    logger.log_all.debug("[mJSONTrack/read_json/waterfall function 2] success - get trackID");
                    callback(null, data, dbUser, trackID);
                });
            },
            function (data, dbUser, trackID, callback) {
                // write data to files
                var errJSON = writeDataFileJSON(data);
                var errCSV = writeDataFileCSV(data);
                if((errJSON != null) || (errCSV != null)){
                    logger.log_err.warn("data couldn't save to file; JSON error: " + errJSON.message + ", CSV error: " + errCSV.message);
                }

                // update user's trackID from SQL db
                new Model.User({userID: user.userID})
                    .save({trackID: trackID}, {patch: true})
                    .then(function (model) {
                        logger.log_all.debug("[mJSONTrack/read_json/waterfall function 3] success - update sql db");
                        callback(null, data);
                    });
            },
            function (data, callback) {
                // find crossings
                // create route between to crossing points
                // sum up values between the crossings
                getCrossings.iterateListSync(data, function(err, filterCrossingPoints)
                {
                    if (err)
                        callback(err);

                    // calculate distance and time and send mail
                    var distance = gps.s2e_distance(data);
                    var dTime = time.dTime(data);
                    logger.log_all.debug("[mJSONTrack/read_json/waterfall function 4] success - getCrossings");
                    callback(null, filterCrossingPoints);
                });
            },
            function (filterCrossingPoints, callback) {
                // merge incoming data with data in the db
                logger.log_all.info("find " + filterCrossingPoints.points.length + " crossing on the track");
                 var mergedData = merge.mergeNewData(filterCrossingPoints, function (err, results) {
                        if (err)
                            callback(err);

                     logger.log_all.debug("[mJSONTrack/read_json/waterfall function 5] success - merge data");
                     callback(null, results);
                    });

            }
        ],  function (err, result) {
                if(err){
                    logger.log_con.trace("[mJSONTrack/read_json/waterfall] " + err.message);
                    if(err.message == "few inputs"){
                        helpers.send_json_res(res, helpers.returnValues(helpers.error.FALSE_DATA, err.message));
                    } else {
                        helpers.send_json_res(res, helpers.returnValues(helpers.error.INTERNAL_ERROR, err.message));
                    }
                } else {
                    logger.log_con.trace("data saved from user " + user.username);
                    helpers.send_json_res(res, helpers.returnValues(helpers.error.NO_ERROR, "data saved from user " + user.username));
                }
            }
        );
    } else {
        logger.log_con.info("No authentication, therefore wrong request for tracks");
        helpers.send_json_res(res, helpers.returnValues(helpers.error.NOT_AUTHENTICATED, "No authentication, therefore wrong request for tracks"));
    }
}

/*
 * Converts gps data to csv format for evaluation.
 * para:    data object
 * ret:     (csv-file in writeFile)
 */
function writeDataFileCSV(data) {

    converterJSONCSV.json2csv(data.points, function (err, csv) {
        if (err) return err;
        var filename = app.get('test_file_path') + generateDate() + "_" + "fahrt.csv";
        return writeFile(filename, csv);
    });
}

/*
 * Converts gps data to json format for evaluation.
 * para:    data object
 * ret:     (json-file in writeFile)
 */
function writeDataFileJSON(data){

    var filename = app.get('test_file_path') + generateDate() + "_" + "fahrt.txt";
    try {
        var strData = JSON.stringify(data);  // return a JSON string corresponding to the specified value
        return writeFile(filename, strData);
    } catch (err) {
        return err;
    }
}

/*
 * Writes converted data object to an file on the disk with given filename.
 * para:    filename, (converted) data object
 * ret:     data file
 */
function writeFile(filename, data){
    try {
        fs.writeFile(filename, data, function (err) {
            if (err) {
                logger.log_all.info("writeFile: No file was written and saved " + err.message);
            } else {
                logger.log_all.info("File saved to " +filename);
            }
        });
        return null;
    } catch (err) {
        return err;
    }
}

/*
 * Generate a current timestamp for filename in writeDataFileJSON and writeDataFileCSV
 * para:    -
 * ret:     timestamp
 */
function generateDate(){
    var date = new Date();
    return date.getFullYear() +""+ (date.getMonth() + 1) + "" + date.getDate() + "_" + date.getHours() + "" + date.getMinutes() + "" + date.getMilliseconds();
}
