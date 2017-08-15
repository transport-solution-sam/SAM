/*
 *
 *  Code created by Rico Fritzsche 2014
 *  Copyright SAM [Rico Fritzsche, Christoph Prinz, Simon Sander]
 *
 */

var express = require('express');
var proxy = require('express-http-proxy');
var app = express();
var http = require('http');
var url = require("url");
var logger = require('./util/logger.js');
var dHTML = require('./routes/deliverHTML.js');
var mJSON = require('./routes/mJSONTrack.js');
var dbQueries = require('./routes/evaluationDBQueries.js');
var userMA = require('./routes/usermanagement.js');
var sv_hdlr = require('./routes/getServerVersion.js');
var downloads = require('./routes/downloads.js');
var helpers = require('./routes/httpResponseHelpers.js');
var loadTestData = require('./routes/loadTestData.js');
var loadReleases = require('./routes/loadReleases.js');
var packagejson = require('./package.json');
var jConfiguration = require('./config.json');

// authentification
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var session = require('express-session');
var bcrypt = require('bcrypt-nodejs');
var path = require('path');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var authentication = require('./routes/authentication');
var Model = require('./dbAuthentification/db');

// set express parameter with configuration data (config.json)
app.set('port',  jConfiguration.ports.http);
app.set('file_path',  jConfiguration.data_logging.file_path);
app.use(express.static(__dirname + '/public'));

// initialize authentification
app.use(cookieParser());
app.use(bodyParser());
app.use(session({secret: 'This is a very new project for all of us!§$'}));
app.use(passport.initialize());
app.use(passport.session());


passport.use(new LocalStrategy(function(username, password, done) {
    new Model.User({username: username}).fetch().then(function(data) {
        var user = data;
        if(user === null) {
            return done(null, false, {message: 'Invalid username or password'});
        } else {
            user = data.toJSON();
            if(!bcrypt.compareSync(password, user.password)) {
                return done(null, false, {message: 'Invalid username or password'});
            } else {
                return done(null, user);
            }
        }
    });
}));
passport.serializeUser(function(user, done) {
    done(null, user.username);
});
passport.deserializeUser(function(username, done) {
    new Model.User({username: username}).fetch().then(function(user) {
        done(null, user);
    });
});

// log incoming requests
app.all('*', function(req, res, next) {
    logger.log_all.trace("INCOMING REQUEST:          " + req.method + " " + req.url);
    logger.log_con.trace("INCOMING REQUEST host:     " + JSON.stringify(req.headers.host));
    logger.log_con.trace("INCOMING REQUEST agent:    " + JSON.stringify(req.headers['user-agent']));
    next();
});

// get requests
app.get('/', dHTML.index);
app.get('/serverversion/', sv_hdlr.getServerVersion);
app.get('/release_notes/', dHTML.dReleaseNotes);
app.get('/downloads/', dHTML.dTestdata);
app.get('/data_files/', dHTML.pwTestdata);
app.get('/v01/downloads.json', loadTestData.load_testdata_files);
app.get('/v01/sreleases.json', loadReleases.load_server_release_files);
app.get('/v01/areleases.json', loadReleases.load_appwp_release_files);
app.get('/logs/*', downloads.testdata);
app.get('/releases/server/*', downloads.releaseNotes);
app.get('/signout/', authentication.signOut);
app.get('*', function(req, res){
    helpers.send_json_res(res, helpers.returnValues(helpers.error.INVALID_RESOURCE, helpers.invalid_resource()));
});

// POST requests
app.post('/v01/send_data.json', mJSON.v01read_json);
app.post('/v02/send_data.json', mJSON.v02read_json);
app.post('/get_usertags/', dbQueries.userRoutes);
app.post('/get_usertrack/', dbQueries.userTrack);
app.post('/signin/', authentication.signInPost);
app.post('/register/', authentication.signUpPost);
app.post('/changeaccess/', userMA.changeAccess);
app.post('/deleteuser/', userMA.deleteUser);
app.post('*', function(req, res){
    helpers.send_json_res(res, helpers.returnValues(helpers.error.INVALID_RESOURCE, helpers.invalid_resource()));
});

// start server with port and show log
app.listen(app.get('port'), function(err){
    if(err) throw err.message;
    logger.log_all.info('Server with version ' + packagejson.version + ' starts at port ' + app.get('port')+"\n");
});
