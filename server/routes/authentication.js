/*
 *
 *  Code created by Rico Fritzsche 2015
 *  Copyright SAM [Rico Fritzsche, Christoph Prinz, Simon Sander] 
 *
 */

var passport = require('passport');
var bcrypt = require('bcrypt-nodejs');
var Model = require('../dbAuthentification/db');
var logger = require('../util/logger.js');
var helpers = require('./httpResponseHelpers.js');
var _this = this;

/*
 * User log in. Authenticate an incoming request and if user exists return userID from DB
 * param:   Post-Function; body with username and password
 * format:  application/x-www-form-urlencoded
 * ret:     http-response with userID from DB (LOGGED_IN, "User is logged in." or user isn't logged in)
 */
exports.signInPost = function(req, res, next) {
   passport.authenticate('local', function(err, user, info) {
      if(err) {
         logger.log_err.warn("[authentication/sigInPost/authenticate] " + err.message);
         logger.log_err.warn("[authentication/sigInPost/authenticate] " + info.message);
         helpers.send_json_res(res, helpers.returnValues(helpers.error.NOT_AUTHENTICATED, err.message));
         return;
      }

      if(!user) {
          logger.log_con.trace("[authentication/sigInPost/authenticate] " + info.message);
          helpers.send_json_res(res, helpers.returnValues(helpers.error.NOT_REGISTERED, info.message));
          return;
      }

       // user is in database and can be sign in
      return req.logIn(user, function(err) {
         if(err) {
            logger.log_con.trace("[authentication/sigInPost/req.logIn] " + err.message);
            helpers.send_json_res(res, helpers.returnValues(helpers.error.NOT_AUTHENTICATED, err.message));
         } else {
             logger.log_all.info("User login:" +user.username+" with ID "+user.userID);
             var retValue = helpers.returnValues(helpers.error.NO_ERROR, "User is logged in.");
             retValue.id = user.userID;
             helpers.send_json_res(res, retValue);
         }
      });
   })(req, res, next);
};

/*
 * A new user can create an account with email and password. First create a new user model, then it is checked if the
 * user already exists. Otherwise create new user with hashed password and finally the user is logged in.
 * param:   Post-Function; body with username and password
 * format:  application/x-www-form-urlencoded
 * ret:     http-response (LOGGED_IN, "User is logged in." or USER_ALREADY_EXISTS, "Username already exists")
 */
exports.signUpPost = function(req, res, next) {
   var user = req.body;
   var usernamePromise = new Model.User({username: user.username}).fetch();

   return usernamePromise.then(function(model) {
      if(model) {
         logger.log_con.warn("User " +user.username+ " wants to sign up, but already exists in database.");
         helpers.send_json_res(res, helpers.returnValues(helpers.error.USER_ALREADY_EXISTS, "Username already exists"));
      } else {
        // hash password
        var hash = bcrypt.hashSync(user.password);

        // get new model of an user
         var signUpUser = new Model.User({username: user.username, password: hash});
         logger.log_all.info("New user " +user.username+ " in database.");
         signUpUser
             .save()
             .then(function() {       // then(function(model) - for pw,user,id - etc
                _this.signInPost(req, res, next);      // sign in the newly registered user
             })
             .catch(function(err) {
                 logger.log_err.error("[authentication/sigInPost/authenticate] " + err.message);
                 helpers.send_json_res(res, helpers.returnValues(helpers.error.INTERNAL_ERROR, err.message));
             });
      }
   });
};

/*
 * Enables user to logout
 * param:   GET-Function
 * ret:     http-response (LOGGED_OUT, "User is logged out.")
 */
exports.signOut = function(req, res) {
   if(!req.isAuthenticated()) {
       helpers.send_json_res(res, helpers.returnValues(helpers.error.NOT_AUTHENTICATED, "User isn't logged in."));
   } else {
       req.logout();            // logout user
       logger.log_all.info("User logout");
       helpers.send_json_res(res, helpers.returnValues(helpers.error.NO_ERROR, "User is logged out."));
   }
};
