/*
 *
 *  Code created by Rico Fritzsche 2015
 * Copyright SAM [Rico Fritzsche, Christoph Prinz, Simon Sander]
 *
 */

var assert = require("assert");
var time = require('../calculation/timeCalc.js');
var test_json = require('./test_json.json');

/*
 * Tests the calculation for needed time from a first gps point to the last one with first2last() in time.Calc.js.
 */
describe('time_differences', function(){
    describe('first2last', function(){
        it('should calculate time from first point to last one', function(){
            assert.equal(time.dTime(test_json),  "00:16:32");
        })
    });
});
