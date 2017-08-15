/*
 *
 *  Code created by Rico Fritzsche and Simon Sander 2015
 *  Copyright SAM [Rico Fritzsche, Christoph Prinz, Simon Sander]
 *
 */

var plot = require('plotter').plot;

/*
 * Prints gps points to a google map.
 * param:   array of gps points
 * ret:
 */
exports.mapResults = function (resultsArray){
    var points = [];
    var crossings = [];
    var file = "./../_test/gmap/points.js";

    resultsArray.forEach(function (item) {
        points.push(item.gpsPoint);
        if ((item.isCrossing) && (item.nextCrossing.distance < 50.0))
            crossings.push({lat: item.nextCrossing.lat, lon: item.nextCrossing.lon});
    });

    //TODO: write to extra file
    //console.log("var points = ", points);
    //console.log("var crossings = ", crossings);

};

/*
 * Plot given gps points in a diagram.
 * param:   array of gps points
 * ret:     pdf with logarithm scale (plotLogLine) and normal scale (plotPLine)
 */
exports.plotDistance2Crossroads = function(resultsArray){

    var points = [];
    var crossings = [];

    resultsArray.forEach(function (item) {
        if (item.nextCrossing) {
            points.push(item.nextCrossing.distance);

            if (item.isCrossing)
                crossings.push('20');
            else
                crossings.push('0');
        }
    });

    plotLogLine(points, crossings);
    plotPLine(points, crossings);
};

function plotLogLine(points, crossings){

    plot({
        data:       { 'points' : points, 'isCrossroad': crossings },
        filename:   'logs/plotLogLine.pdf',
        logscale:   true,
        title:      'Distance from GPS point to Crossroads',
        xlabel:     'GPS Point',
        ylabel:     'Distance [m]',
        format:     'pdf'
    });
    logger.log_all.debug("[plotter/plotLogLine] success");
}

function plotPLine(points, crossings){

    plot({
        data:       { 'points' : points, 'isCrossroad': crossings },
        filename:   'logs/plotPLine.pdf',
        style:      'linespoints', // 'points' 'lines'
        title:      'Distance from GPS point to Crossroads',
        xlabel:     'GPS Point',
        ylabel:     'Distance [m]',
        format:     'pdf'
    });
    logger.log_all.debug("[plotter/plotPLine] success");
}
