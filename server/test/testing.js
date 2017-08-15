/**
 * Created by simon on 02.05.15.
 * Copyright SAM [Rico Fritzsche, Christoph Prinz, Simon Sander]
 */

var jConfiguration = require('../config.json');
var db_con = require('../dbData/db.js')(jConfiguration.environment.isTest);
var GSP = require('../dbData/mergeTracks');
var G2C = require('../dbData/gps2crossing');
var test_data = require('../test/rawTestData/simpleTestData.json');
var test_merge = require('../test/rawTestData/mergeTestData.json');
var test_mergeDIFF = require('../test/rawTestData/mergeTestDataDiff.json');
var test_small = require('../test/rawTestData/oldTestDataSmall.json');
var test_ma = require('../test/rawTestData/oldTestDataMannheim.json');



var trip = {
    "userID": 1,
    "tag": "debug",
    "points": [
        {
            "lat": 49.50719,
            "lon": 8.49092,
            "t": 1432122523.2138314,
            "fuel": 0,
            "d": 0
        },
        {
            "lat": 49.50719,
            "lon": 8.49092,
            "t": 1432122523.2138314,
            "fuel": 1,
            "d": 1
        }
    ],
    "trackID": 49
};

//var sam_con = sam_db.create_SAM_DB_Connection(test);
//sam_con.addGPSListBatchv2(test_merge).then(
//    function (result) {
//        console.log(result);
//    }, function (err) {
//        console.log('db base: ', err);
//    });


//G2C.iterateListSync(test_ma, true);

//db_con.addGPSListBatch(test_merge);

//GSP.mergeNewData(test_merge);

G2C.iterateListSync(trip);


//db_con.addPointWithRelation(1, "tag", 2,
//    {lon:1,lat:1, osmID:1, fuel:1, distance:1, time:1},
//    {lon:2,lat:2, osmID:2, fuel:2, distance:2, time:2})
//.then(function(result){
//        console.log(result);
//    }, function(err){
//        console.log(err);
//    })
