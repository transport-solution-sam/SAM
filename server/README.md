# Node.js Server

We use Node.js for the backend to integrate the web server and the backend functionality.
## Features
You will find all interfaces that provide the corresponding functions for the client, which are (HTTP POST methods unless otherwise indicated): 

* Get the current server version (HTTP GET method)
* Receive recorded trips from the client
* Get all user tags
* Get all user tracks (same routes are summed up)
* User sign in
* User sign up
* User logout (HTTP GET method)
* Change user data
* Delete a user

## Setup
The backend need some additional services. First, Gisgraphy for inverse gecoding. If you run locally, then Gisgraphy needs a PostgreSQL Openstreetmap data base. Next Overpass is used to get all crossroads on the driven streets. Usually, you can use open REST-APIs with limited calls per day to run the code instead of installing these services locally. You have to replace these in the code (see below). Also a very rudimentary MySQL database is used for user management. Finally, a Neo4J database is used to save all tracks.

## Developer Instructions
The backend was developed with WebStorm, therefor you can use the integrated REST client. The web server provides APIs for the website and for the Windows Phone 8.1 client. To run the server do the following:

1. Install Node.js on your computer
2. Clone SAM and change to /server
3. Run *sudo npm install*
4. Adapt paths in *config.json*
5. Install and adapt SQL data base (e.g. *source <path>/database/schema.sql*).
6. Start server with command *node server.js* or use WebStorm.
7. The server works if you get after calling http://localhost:8080/get/ the message `{"error":10,"note":"User isn't logged in."}`.
8. Use a REST client to send a POST request to http://localhost:8080/signup/ - add the content value header *application/x-www-form-urlencoded* and include to the body your sign up data in the following form: *username=XXX&password=XXX*
9. Now, the user can send JSON trip data to the server (you could use test data and send it as POST method without any content value header to http://localhost:8080/v02/send_data.json)

Your data could look like the following (lat – latitude, lon – longitude, t – time [to the predecessor], d – distance [to the predecessor]). In a real scenario with an client, the client get the userID from the server during sign in and also the trackID.

```
{"userID":1,"tag":"Test","trackID":1,"points":[
{"lat":49.50201,"lon":8.48822,"t":1432317148.6752887,"fuel":0,"d":0},
{"lat":49.50203,"lon":8.48818,"t":1432317149.6661944,"fuel":1.0760608333333335,"d":3.85},
{"lat":49.50205,"lon":8.48813,"t":1432317150.6587212,"fuel":0.6517941666666667,"d":4.49},
{"lat":49.50209,"lon":8.48809,"t":1432317151.6657283,"fuel":0.5359477777777778,"d":4.73},
{"lat":49.50213,"lon":8.48806,"t":1432317152.662321,"fuel":1.1407341666666668,"d":5.61},
{"lat":49.50219,"lon":8.48804,"t":1432317153.6601915,"fuel":1.4279716666666666,"d":6.71}]}
```

<br/>In order to get everything up and running, you have to adjust Overpass, Gisgraphy, Neo4j and mySQL. You need to change the following:  
#### Neo4J in dbData/db.js
```javascript
var db_test = require("seraph")({
    server: "http://neo4j-server",  // replace address with own neo4j server
    user: "username",
    pass: "password"
});
```

#### Overpass and Gisgraphy in dbData/apiProvider.js
```javascript
var publicGisgraphyServer = "http://free.gisgraphy.com"; 	// use API
var publicOverpassServer = "http://overpass-api.de/api";	// use API
```

#### MySQL in dbAuthentification/db.js
```javascript
var knex = require('knex')({
    client: 'mysql',
    connection: {
        host: 'localhost', 	// your host
        user: 'root', 		// your database user
        password: '', 		// your database password
        database: 'dbUsers',
        charset: 'UTF8_GENERAL_CI'
    }
});
```


---
Daten von <a href="http://www.openstreetmap.org/">OpenStreetMap</a> - Veröffentlicht unter <a href="http://opendatacommons.org/licenses/odbl/">ODbL</a>
