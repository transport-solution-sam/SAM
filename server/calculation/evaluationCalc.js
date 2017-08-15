/*
 *
 *  Code created by RicoFritzsche 2015
 *  Copyright SAM [Rico Fritzsche, Christoph Prinz, Simon Sander]
 *
 */

var statistic = require('simple-statistics');


function TrackCalculation(){

    var totalFuelArray = [];
    var totalDistanceArray = [];
    var totalTimeArray = [];

}

/*
 * TODO explanation
 * param:  fuelArray, distanceArray, timeArray, startNode
 * ret:    point = {
 *                lon,
 *                lat,
 *                fuel,
 *                distance,
 *                time
 *                }
 */
function calculatePoint(fuelArray, distanceArray, timeArray, node) {
    var fuel = statistic.mean(fuelArray);
    var distance = statistic.mean(distanceArray);
    var time = statistic.mean(timeArray);

    totalFuelArray.push(fuel);
    totalDistanceArray.push(distance);
    totalTimeArray.push(time);

    var point = {
        lon: node.lon,
        lat: node.lat,
        fuel: fuel,
        distance: distance,
        time: time
    };

    return point;
}

/* TODO explanation and line
 * Sum up the values of identical tracks with common osm crossings as points.
 * param:  array of tracks
 * ret:    {totalFuel, totalDistance, totalTime, points: {
 *                    lon,
 *                    lat,
 *                    fuel,
 *                    distance,
 *                    time
 *                    }}
 */
TrackCalculation.prototype.addUpTrackValues = function(tracks) {
    totalFuelArray = [];
    totalDistanceArray = [];
    totalTimeArray = [];

    var firstTrack = tracks[0];
    var tracks = tracks.slice(0);

    var fuelArray = [];
    var distanceArray = [];
    var timeArray = [];

    var points = [];

    var newTrack = false;
    var endNode, startNode;

    tracks.reduce(function(previousValue, currentValue, index) {
        var pStartNode = previousValue.s;
        var pRelation = previousValue.r.properties;
        var pEndNode = previousValue.e;
        startNode = currentValue.s;
        var relation = currentValue.r.properties;
        endNode = currentValue.e;

        if (index == 0){

            point = {
                lon: pStartNode.lon,
                lat: pStartNode.lat,
                fuel: 0,
                distance: 0,
                time: 0
            };

            points.push(point);

            fuelArray.push(pRelation.fuel);
            distanceArray.push(pRelation.distance);
            timeArray.push(pRelation.time);
        } else {

            if ((pStartNode.id == startNode.id) && (pEndNode.id == endNode.id)) {
                fuelArray.push(relation.fuel);
                distanceArray.push(relation.distance);
                timeArray.push(relation.time);
            }
            else {
                points.push(calculatePoint(fuelArray, distanceArray, timeArray, startNode));

                fuelArray = [];
                distanceArray = [];
                timeArray = [];

                fuelArray.push(relation.fuel);
                distanceArray.push(relation.distance);
                timeArray.push(relation.time);
            }
        }

        return currentValue;

    }, firstTrack);

    points.push(calculatePoint(fuelArray, distanceArray, timeArray, endNode));

    var sumFuel = statistic.sum(totalFuelArray);
    var sumDistance = statistic.sum(totalDistanceArray);
    var sumTime = totalTimeArray[totalTimeArray.length - 1] - totalTimeArray[0];

    var result = {
        "totalFuel":sumFuel,
        "totalDistance":sumDistance,
        "totalTime":sumTime,
        "points":points
    }

    return result;
};

module.exports = new TrackCalculation();
