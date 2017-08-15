/*
 *
 *  Code created by Rico Fritzsche 2014
 *  Copyright SAM [Rico Fritzsche, Christoph Prinz, Simon Sander]
 *
 */

var express = require('express');
var app = express();
var path = require('path');
var url = require("url");
var logger = require('../util/logger.js');
var http = require('http');
exports.version = "0.1.0";

exports.testdata = function(req, res){
    var dir = path.join(__dirname, "/..");
    var uri =  dir + url.parse(req.url).pathname;
    res.download(uri, (getFileName(url.parse(req.url).pathname)+ '.txt'), function(err){
        if (err) {
            logger.log_err.error("Download error /sam/logs/ " +err);
        } else {
            logger.log_all.info("Download from " +uri);
        }
    });
};

exports.releaseNotes = function(req, res){
    var dir = path.join(__dirname, "/..");
    var uri =  dir + url.parse(req.url).pathname;
    res.download(uri, (getFileName(url.parse(req.url).pathname)), function(err){
        if (err) {
            logger.log_err.error("Download error /sam/releases/ " +err);
        } else {
            logger.log_all.info("Download from " +uri);
        }
    });
};

function getFileName(parsedURL){
    var splitURL = parsedURL.split("/");
    return splitURL.pop(splitURL.length-1);
}
