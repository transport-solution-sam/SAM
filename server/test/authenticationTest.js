/*
 *
 *  Code created by Rico Fritzsche 2015
 *  Copyright SAM [Rico Fritzsche, Christoph Prinz, Simon Sander]
 *
 */

var requestify = require('requestify');

/*
 * Tests the /signup/, /signin/ and /signout/ endpoints with http-requests in authentication.js.
 */
describe('authentication', function(){
    describe('signUpPost', function(){
        it('should register in db', function (){
            var body;
            requestify.request('http://localhost:8080/signup/', {
                method: 'POST',
                body: 'username=rico&password=rico',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                dataType: 'text/html'
            })
        })
    });

    describe('signUpPost', function(){
        it('should login for user rico', function(){
            requestify.request('http://localhost:8080/signin/', {
                method: 'POST',
                body: 'username=rico&password=rico',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                dataType: 'text/html'
            })
        })
    });

    describe('signOut', function(){
        it('should logout', function (){
            requestify.request('http://localhost:8080/signout/', {
                method: 'GET'
            })
        })
    });
});
