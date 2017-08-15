/*
 *
 *  Code created by Rico Fritzsche 2014
 *  Copyright SAM [Rico Fritzsche, Christoph Prinz, Simon Sander]
 *
 */

/*
 * Enables switching off different comment levels.
 */

exports.version = "0.1.0";
var express = require('express');
var app = express();

var jConfiguration = require('../config.json');
app.set('config_log_path',  jConfiguration.logging.path);
app.set('setEnable',  jConfiguration.logging.enable);

var log4js = require('log4js');
log4js.configure(app.get('config_log_path'), {});

var log_con = log4js.getLogger('console');
var log_all = log4js.getLogger('all-logs');
var log_err = log4js.getLogger('err-logs');

switch(app.get('setEnable')){
    case 0:
        log_con.setLevel(log4js.levels.OFF);
        log_all.setLevel(log4js.levels.OFF);
        log_err.setLevel(log4js.levels.OFF);
        exports.log_con = log_con;
        exports.log_all = log_all;
        exports.log_err = log_err;
        break;
    case 1:
        log_con.setLevel(log4js.levels.ALL);
        log_all.setLevel(log4js.levels.ALL);
        log_err.setLevel(log4js.levels.ALL);
        exports.log_con = log_con;
        exports.log_all = log_all;
        exports.log_err = log_err;
        break;
    case 2:
        log_con.setLevel(log4js.levels.OFF);
        log_all.setLevel(log4js.levels.INFO);
        log_err.setLevel(log4js.levels.ALL);
        exports.log_con = log_con;
        exports.log_all = log_all;
        exports.log_err = log_err;
        break;
    case 3:
        log_con.setLevel(log4js.levels.OFF);
        log_all.setLevel(log4js.levels.OFF);
        log_err.setLevel(log4js.levels.ALL);
        exports.log_con = log_con;
        exports.log_all = log_all;
        exports.log_err = log_err;
        break;
    default:
        log_con.setLevel(log4js.levels.ALL);
        log_all.setLevel(log4js.levels.ALL);
        log_err.setLevel(log4js.levels.ALL);
        exports.log_con = log_con;
        exports.log_all = log_all;
        exports.log_err = log_err;
        break;
}
// https://github.com/nomiddlename/log4js-node
// logger.trace / logger.debug / logger.info / logger.warn / logger.error / logger.fatal
