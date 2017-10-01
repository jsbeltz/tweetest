// -----------------------------------------------------
// Author:  Jeff Beltz
// -----------------------------------------------------
"use strict";

// -----------------------------------------------------
// Command Line Interface
// -----------------------------------------------------
const cli = require('cli');
cli.setApp("tweetest", "0.1");
let options = cli.parse({ webPort: [ 'p', 'Default web port', 'int', 8080 ]
                        , screen_name: [ 'sn', 'Twitter screen name to use', 'string', 'salesforce']
                        // , expires: [ 'e', 'Timer for the options message (in millsecs - default: 120 sec)', 'int', 120000]
                        });

// -----------------------------------------------------
// Web portion
// -----------------------------------------------------
const express = require('express');
const body = require('body-parser');
const app = express();

// If development use pretty html...
if (app.get('env') === 'development') {
  app.locals.pretty = true;
}

// puts the request in the body?
app.use(body.urlencoded({ extended: true }));
app.use(body.json());

// Setup the stylus compiler for the css files.
// css builder
var stylus = require('stylus');
var nib = require('nib');
app.use(stylus.middleware({ 
    src: __dirname + '/public',
    compile: function (str, filePath) {
            return stylus(str)
                .set('filename', filePath)
                .use(nib());
    }
}));

// The local public directory
app.use(express.static(__dirname + '/public'));


// -----------------------------------------------------
// Connect to twitter using application authorization
// -----------------------------------------------------
const Twitter = require('twitter');
const OAuth = require('oauth');
let g_oauth2 = new OAuth.OAuth2(process.env.TWITTER_CONSUMER_KEY,
                                process.env.TWITTER_CONSUMER_SECRET,
                                'https://api.twitter.com/',
                                null,
                                'oauth2/token',
                                null);

let g_twitterClient;
g_oauth2.getOAuthAccessToken('', {'grant_type':'client_credentials'}, function (e, access_token, refresh_token, results)
{
    console.log('e=%j, bearer=%j refresh_token=%j results=%j', e, access_token, refresh_token, results);
    g_twitterClient = new Twitter({
      consumer_key: process.env.TWITTER_CONSUMER_KEY,
      consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
      bearer_token: access_token
    });
});


// -----------------------------------------------------
// REST API Section
// -----------------------------------------------------
// HTTP provides response codes to inform clients of the status of their request. Use them! Don’t just return a 200 response with an error description if something is wrong.
// These are the main ones used:
// 2xx – Success codes
// 200 – OK, all is fine. Entity-body contains the resource requested in its current state
// 201 – Created, a new resource has been created. Location header contains the address of the new resource. Entity-body contains the representation of the new resource as it is on the server
// 202 – Accepted, a clients request is pending and will be completed later. Location header contains the expected address of the new resource so it can be checked later.
// 3xx – Redirection codes
// 301 – Moved Permanently, the API has moved a resource in response to the request, or an old resource is requested. Location contains the new URI.
// 304 – Not Modified, the client already has this data, used when the client provided a If-Modified-Since header and the data hasn’t been modified. Date header is required, ETag and Content-Location should be same as a 200, Expires, Cache-Control and Vary are required if they’ve changed since last sent.
// 4xx – Client side error
// 400 – Bad Request, there is a client-side problem, the document in the entity-body should contain more info on the problem
// 401 – Unauthorized, wrong credentials provided, or no credentials provided. WWW-Authenticate header should describe the authentication methods accepted. Entity-body could contain more details about the error.
// 404 – Not Found, no resource matches the requested URI, there is no reference to it on the server
// 409 – Conflict, client attempted to do something which would leave a resource in an inconsistent state, such as create a user with an already taken name. Location could point to the source of the conflict. Entity-body to describe the conflict.
// 412 – Precondition failed, client wanted to modify a resource using a If-Unmodified-Since/If-Match header, the resource had been modified by someone else.
// 5xx – Server side error
// 500 – Internal Server Error, there is an error on the server

const moment = require('moment');
const g_startTime = new moment();

//-----------------------------------------------------
// Used by the AWS service to make sure all is well
app.get('/v1/health_check', function (req, res)
{
    let healthCheckResponse = { AppVersion: "0.1.0"
                              , NodeVersion: process.version
                              , StartTime: g_startTime.format('YYYY-MM-DD HH:mm:ss') + ' [about '+g_startTime.fromNow()+']'
                              };
    res.contentType('json');
    res.status(200);
    res.json(healthCheckResponse);
});


let g_nextAllowedGet;
let g_tweets;

//-----------------------------------------------------
// GET: /v1/tweets
app.get('/v1/tweets', function (req, res) {
    // The tweet api is limited to 15 call in a 15 min time window (1 every minute) 
    // https://developer.twitter.com/en/docs/basics/rate-limiting
    if (g_nextAllowedGet === undefined || g_nextAllowedGet.isSameOrBefore(/*currentTime*/))
    {
        g_nextAllowedGet = new moment().add(1,'minute');
        console.log("refreshing list, next=%s", g_nextAllowedGet);
        var params = { screen_name: options.screen_name
                     , count: 10
                     , exclude_replies: true
                     };
        g_twitterClient.get('statuses/user_timeline', params, function(error, tweets/*, response*/)
        {
            res.contentType('json');
            if (error)
            {
                console.error("error=%j", error);
                res.status(500).send(error);
                return;
            }
            g_tweets = tweets;

            // Should the tweets be omitted
            res.status(200).send({ total: g_tweets.length
                                 , entities: g_tweets
                                 });
        });
        return;
    }

    console.log("sending old data, next=%s", g_nextAllowedGet.fromNow());
    // Should the tweets be omitted
    res.status(200).send({ total: g_tweets.length
                         , entities: g_tweets
                         });
});


// Reads the configuration to determine the starting port.
app.listen(options.webPort);
console.log('started %s\nListening on port %d', g_startTime, options.webPort);
