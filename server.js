// -----------------------------------------------------
// Author:  Jeff Beltz
// -----------------------------------------------------
"use strict";

// -----------------------------------------------------
// Command Line Interface
// -----------------------------------------------------
const cli = require('cli');
cli.setApp("tweetest", "0.1");
                                
let options = cli.parse({ webPort: [ 'p', 'Default web port', 'int', (process.env.SERVICE_PORT || 8080) ]
                        , screen_name: [ 'sn', 'Twitter screen name to use', 'string', process.env.TWITTER_SCREEN_NAME]
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
