/*
 *
 *  Code created by RicoFritzsche 2015
 *  Copyright SAM [Rico Fritzsche, Christoph Prinz, Simon Sander]
 *
 */

var passport = require('passport');
var bcrypt = require('bcrypt-nodejs');
var Model = require('../dbAuthentification/db');
var logger = require('../util/logger.js');
var helpers = require('./httpResponseHelpers.js');
var auth = require('./authentication.js');
var jConfiguration = require('../config.json');
var db_con = require('../dbData/db.js')(jConfiguration.environment.isTest, jConfiguration.environment.isLocal);

/*
 * The password of an user is changed to the incoming one.
 * param:   Post-Function; body password or username
 * format:  application/x-www-form-urlencoded (password=X)
 * ret:     http-response (NOT_ERROR, Password is changed.)
 */
exports.changeAccess = function(req, res) {

    // TODO Re-login (currently new login from the client needed)

    if (req.isAuthenticated()) {
        var user = req.user;
        if (user !== undefined) {
            user = user.toJSON();
        }

        // password should be changed (message from the client)
        if(req.body.password) {
            // hash password and set new password (with save - patch as parameter) in user db
            var hash = bcrypt.hashSync(req.body.password);
            new Model.User({userID: user.userID})
                .save({"password": hash}, {patch: true})
                .catch(function(err) {
                    logger.log_con.error("[routes/usermanagement/changeAccess] " + err.message);
                    helpers.send_json_res(res, helpers.returnValues(helpers.error.INTERNAL_ERROR, err.message));
                });
            helpers.send_json_res(res, helpers.returnValues(helpers.error.NO_ERROR, "Password is changed."))

        } else if(req.body.username){           // username should be changed (message from the client)
            // set new username (with save - patch as parameter) in user db
            new Model.User({userID: user.userID})
                .save({"username": req.body.username}, {patch: true})
                .catch(function(err) {
                    logger.log_err.error("[routes/usermanagement/changeAccess] " + err.message);
                    helpers.send_json_res(res, helpers.returnValues(helpers.error.INTERNAL_ERROR, err.message));
                });
            helpers.send_json_res(res, helpers.returnValues(helpers.error.NO_ERROR, "Username is changed."));

        } else {
            logger.log_err.error("[routes/usermanagement/changeAccess] ");
            helpers.send_json_res(res, helpers.returnValues(helpers.error.FALSE_DATA, "Nothing is changed, use username or password as parameter."));
        }
    } else {
        logger.log_con.info("No authentication, therefore wrong request for tracks");
        helpers.send_json_res(res, helpers.returnValues(helpers.error.NOT_AUTHENTICATED, "No authentication, therefore wrong request for tracks"));
    }

};

/*
 * This method delete the account of an user by deleting all information in the (mysql) user db.
 * param:   Post-Function; body confirm=true (String!)
 * format:  application/x-www-form-urlencoded
 * ret:     http-response (NO_ERROR, User X is deleted.)
 */
exports.deleteUser = function(req, res) {

    if (req.isAuthenticated()) {
        var user = req.user;
        if (user !== undefined) {
            user = user.toJSON();
        }

        // check body message
        if(req.body.confirm == "true"){
            // find user with userID an delete user from user db (destroy)
            new Model.User({userID: user.userID})
                .destroy()
                .then(function(){
                    req.logout();
                    logger.log_all.info("User " + user.username + " is deleted.");
                    helpers.send_json_res(res, helpers.returnValues(helpers.error.NO_ERROR, "User is deleted and logged out."));
                })
                .catch(function(err) {
                    logger.log_con.error("[routes/usermanagement/deleteUsers] " + err.message);
                    helpers.send_json_res(res, helpers.returnValues(helpers.error.INTERNAL_ERROR, err.message));
                });
        } else {
            helpers.send_json_res(res, helpers.returnValues(helpers.error.FALSE_DATA, "User " + user.username + " could not be deleted."))
        }

    }else{
        logger.log_con.info("No authentication, therefore wrong request for tracks");
        helpers.send_json_res(res, helpers.returnValues(helpers.error.NOT_AUTHENTICATED, "No authentication, therefore wrong request for tracks"));
    }
};
