/*
 *
 *  Code created by Rico Fritzsche 2014
 *  Copyright SAM [Rico Fritzsche, Christoph Prinz, Simon Sander]
 *
 */

var helpers = require('./httpResponseHelpers.js');
var packagejson = require('../package.json');


/*
 * Send a http-response to client with current server version from package.json
 * param:   get-function
 * ret:     http-response with server version
 */
exports.getServerVersion = function(req, res){
    helpers.send_json_res(res, packagejson.version);
};
