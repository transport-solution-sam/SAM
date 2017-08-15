/**
 * Created by RicoFritzsche on 19.11.14.
 * Copyright SAM [Rico Fritzsche, Christoph Prinz, Simon Sander]
 */

var fs = require('fs');
var http = require('http');
var express = require('express');
var app = express();
var jConfiguration = require('../config.json');          // load configuration file
app.set('test_file_path',  jConfiguration.data_logging.path);
var logger = require('../util/logger.js');
exports.version = "0.1.0";

exports.load_testdata_files = function (req, res) {
	load_testfile(function (err, data) {
        	if (err) {
           		res.writeHead(503, {"Content-Type": "text/html"});
           		res.end(JSON.stringify(err) + "\n");
        		return;
      	  	}
		res.writeHead(200, {"Content-Type": "application/json"});
        res.end(JSON.stringify(data));
    });
 };

function load_testfile(callback) {
    fs.readdir(
        app.get('test_file_path'),
        function (err, files) {
            if (err) {
                callback(err);
                return;
            }

            var dFiles = [];
            (function iterator(index) {
                if (index == files.length) {
                    logger.log_all.info("test data files deliverd");
                    callback(null, dFiles);
                    return;
                }

                fs.stat(
                    app.get('test_file_path') + files[index],
                    function (err, stats) {
                        if (err) {
                            logger.log_err.error("load_testfile()" + e);
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
