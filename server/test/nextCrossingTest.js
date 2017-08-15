/*
 *
 *  Code created by Rico Fritzsche 2015
 *  Copyright SAM [Rico Fritzsche, Christoph Prinz, Simon Sander]
 *
 */

var assert = require("assert");
var ncr = require('./../calculation/nextCrossing.js');
var logger = require('../util/logger.js');

var pointAtStreet = {"lat": 50.950133, "lon": 10.700867};
var crs = [
    {"id": 305178631, "lat": 50.9504197, "lon": 10.7019024},
    {"id": 1379350934, "lat": 50.9499614, "lon": 10.6999758}
];

/*
 * Tests function nextCrossroad() in nextCrossng.js
 */
describe('Geo Coding', function(){
    describe('nextCrossroad', function(){
        it('should find the closest Crossing', function(){
            var data = ncr.nextCrossroad(crs, pointAtStreet);
            var sol = {"id": 1379350934, "distance": 65.2816595575686};
            assert.equal(data.id, sol.id);
            assert.equal(data.distance, sol.distance);
        })
    });
});
