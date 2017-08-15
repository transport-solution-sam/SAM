/*
 *
 *  Code created by Rico Fritzsche 2015
 *  Copyright SAM [Rico Fritzsche, Christoph Prinz, Simon Sander]
 *
 */

var knex = require('knex')({
    client: 'mysql',
    connection: {
        host: 'localhost',  // your host
        user: 'root', // your database user
        password: '', // your database password
        database: 'dbUsers',
        charset: 'UTF8_GENERAL_CI'
    }
});
var bookshelf = require('bookshelf')(knex);

var User = bookshelf.Model.extend({
    tableName: 'tblUsers',
    idAttribute: 'userID',
    password: 'password'
});

module.exports = {
    User: User
};
