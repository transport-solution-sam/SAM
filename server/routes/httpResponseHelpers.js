exports.version = '0.1.0';
var logger = require('../util/logger.js');
exports.error = {
    'NO_ERROR': 0,
    'NOT_AUTHENTICATED': 100,
    'NOT_REGISTERED': 110,
    'USER_ALREADY_EXISTS': 140,
    'FALSE_DATA': 150,
    'INTERNAL_ERROR': 170,
    'INVALID_RESOURCE': 200
};
exports.returnValues = function ReturnValue(error, text) {
    return {
        err: error,
        note: text
    }
};

exports.send_json_res = function(res, output) {
    res.writeHead(200, {"Content-Type": "application/json"});
    res.write(JSON.stringify(output) +"\n");
    res.end();
};

exports.invalid_resource = function() {
    return "invalid resource: the requested resource does not exist.";
};
