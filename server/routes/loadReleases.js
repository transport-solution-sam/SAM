/**
 * Created by RicoFritzsche on 27.02.15.
 * Copyright SAM [Rico Fritzsche, Christoph Prinz, Simon Sander]
 */

var fs = require('fs');
var http = require('http');
var express = require('express');
var app = express();
var jConfiguration = require('../config.json');
app.set('server_release_file_path', jConfiguration.data_logging.server_release);
app.set('appwp_release_file_path', jConfiguration.data_logging.appwp_release);
var logger = require('../util/logger.js');
exports.version = "0.1.0";

exports.load_server_release_files = function (req, res) {
    load_file(app.get('server_release_file_path') ,function (err, data) {
        if (err) {
            res.writeHead(503, {"Content-Type": "text/html"});
            res.end(JSON.stringify(err) + "\n");
            return;
        }
        logger.log_con.trace(data);
        res.writeHead(200, {"Content-Type": "application/json"});
        res.end(JSON.stringify(data));
    });
};


exports.load_appwp_release_files = function (req, res) {
    load_file(app.get('server_release_file_path') ,function (err, data) {
        if (err) {
            res.writeHead(503, {"Content-Type": "text/html"});
            res.end(JSON.stringify(err) + "\n");
            return;
        }
        logger.log_con.trace(data);
        res.writeHead(200, {"Content-Type": "application/json"});
        res.end(JSON.stringify(data));
    });
};

function load_file(path, callback) {
    fs.readdir(
        path,
        function (err, files) {
            if (err) {
                callback(err);
                return;
            }

            var dFiles = [];
            (function iterator(index) {
                if (index == files.length) {
                    logger.log_all.info("server release data files deliverd");
                    callback(null, dFiles);
                    return;
                }

                fs.stat(
                    path + files[index],
                    function (err, stats) {
                        if (err) {
                            logger.log_err.error("load_server_release_notes()" + e);
                            callback(err);
                            return;
                        }

                        if (stats.isFile()) {
                            dFiles.push(files[index]);
                        }
                        iterator(index + 1)
                    }
                );
            })(0);
        }
    );
}
