/*
 *
 *  Code created by Rico Fritzsche 2014
 * Copyright SAM [Rico Fritzsche, Christoph Prinz, Simon Sander]
 *
 */

var express = require('express');
var app = express();
var fs = require('fs');
var path = require('path');
var jConfiguration = require('../config.json');

app.set('redirect_downloads',  jConfiguration.paths.redirect_downloads);
var logger = require('../util/logger.js');
var http = require('http');
exports.version = "0.1.0";


exports.index = function(req, res){
    var dir = path.join(__dirname, "/../");
    logger.log_con.debug(dir + "public/index.html");
    fs.readFile(dir + "public/index.html",function (err, data){
        if (err) {
            logger.log_err.error("Error in / " +err);
            res.writeHead(500, {'Content-Type': 'text/html'});
            res.write(err.toString());
            res.end();
        } else {
            res.writeHead(200, {"Content-Type": "text/html"});
            res.write(data);
            res.end();
        }
    });
};

exports.dReleaseNotes = function(req, res){
    var dir = path.join(__dirname, "/../");
    logger.log_con.debug(dir + "public/html/releaseNotes.html");
    fs.readFile(dir + "public/html/releaseNotes.html",function (err, data){
        if (err) {
            logger.log_err.error("Error in /release_notes/ " +err);
            res.writeHead(500, {'Content-Type': 'text/html'});
            res.write(err.toString());
            res.end();
        } else {
            res.writeHead(200, {"Content-Type": "text/html"});
            res.write(data);
            res.end();
        }
    });
};

exports.dTestdata = function(req, res){
    var dir = path.join(__dirname, "/../");
    logger.log_con.debug(dir + "public/html/safe_download.html");
    fs.readFile(dir + "public/html/safe_download.html",function (err, data){
        if (err) {
            logger.log_err.error("Error in /downloads/ " +err);
            res.writeHead(500, {'Content-Type': 'text/html'});
            res.write(err.toString());
            res.end();
        } else {
            res.writeHead(200, {"Content-Type": "text/html"});
            res.write(data);
            res.end();
        }
    });
};

exports.pwTestdata = function(req, res){
    var dir = path.join(__dirname, "/../");
    logger.log_con.debug(dir+"public/html/basic.html");
    logger.log_con.debug(req.query.password);
    if(req.query.password == "sam2015"){
        fs.readFile(dir + "public/html/basic.html",function (err, data){
            if (err) {
                logger.log_err.error("Error in /downloads/ " +err);
                res.writeHead(500, {'Content-Type': 'text/html'});
                res.write(err.toString());
            } else {
                res.writeHead(200, {"Content-Type": "text/html"});
                res.write(data);
                res.end();
            }
        });
    }else{
        return res.redirect(app.get('redirect_downloads'));
    }
};
