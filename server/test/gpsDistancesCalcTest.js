/*
 *
 *  Code created by Rico Fritzsche 2015
 *  Copyright SAM [Rico Fritzsche, Christoph Prinz, Simon Sander]
 *
 */

var assert = require("assert");
var gps = require('../calculation/gpsDistancesCalc.js');
var test_json = require('./test_json.json');
var ptGPS1 = { "lat":50.96124,"lon":10.7119 }
var ptGPS2 = { "lat":51.99192,"lon":10.82904 }

/*
 * Tests the functions from gpsDistanceCalc.js (s2e_distance - start to end distance and p2p_distance - point to point
 * distance).
 */
describe('gps_distance', function(){
    describe('s2e_distance', function(){
        it('should calculate distance from first point to last one', function(){
            assert.equal(gps.s2e_distance(test_json),  15283.619137503143);
        })
    });

    describe('p2p_distance', function(){
        it('should calculate distance from first point to the second one', function(){
            assert.equal(gps.p2p_distance(ptGPS1, ptGPS2),  114893.1193331568);
        })
    });
});
