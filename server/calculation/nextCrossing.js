/*
 *
 *  Code created by Rico Fritzsche 2015
 *  Copyright SAM [Rico Fritzsche, Christoph Prinz, Simon Sander]
 *
 */

var gps_distance = require('./gpsDistancesCalc');
var logger = require('../util/logger');


/*
 * Calculates the crossroad, which is the next to a given gps point on a street
 * param:   array of crossroads points on a street, gps-point
 * ret:     crossroad on the street which has the shortest distance to the gps point
 */
exports.nextCrossroad = function(cr_list, gps_point){
    var shortest_distance = 0;
    var shortest_distance_node = {id: 0,lat: 0, lon: 0};

    for(var i=0; i<cr_list.length; i++){

        var pkt1 = cr_list[i];
        var distance = gps_distance.p2p_distance(pkt1, gps_point);

        if(i == 0){
            shortest_distance = distance;
            shortest_distance_node = cr_list[i];
        }

        if(shortest_distance > distance)
        {
            shortest_distance = distance;
            shortest_distance_node = cr_list[i];
        }
    }

    return {
        "id": shortest_distance_node.id,
        "distance": shortest_distance,
        "lat" : shortest_distance_node.lat,
        "lon": shortest_distance_node.lon
    };
};
