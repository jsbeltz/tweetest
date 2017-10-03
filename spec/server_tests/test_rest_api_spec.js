// -----------------------------------------------------
// Author:  Jeff Beltz
// -----------------------------------------------------
"use strict";
const request = require("request");
const testServer = require("../../server.js");
const _ = require("lodash");

var g_tweetDate = new Date();
function new_fake_tweet( idx )
{
    var idxStr = idx.toString();
    return {
        "created_at": g_tweetDate,
        "id": idx,
        "id_str": idxStr, 
        "text": "text " + idxStr,
        "entities": {
            "media": [
                {
                    "media_url": "http://localhost/" + idxStr,
                }
            ]
        },
        "user": {
            "name": "name" + idxStr,
            "screen_name": "name" + idxStr,
            "profile_background_image_url": "http://localhost/" + idxStr + ".png"
        },
        "retweet_count":0
    };
}

describe("Test Rest API", function()
{
    describe("GET /v1/health_check", function()
    {
        it("returns status code 200 and payload", function(done)
        {
            request.get(testServer.baseUrl+"/v1/health_check", function(error, response, body)
            {
                expect(response.statusCode).toBe(200);
                expect(body).toContain('NodeVersion');
                expect(body).toContain('AppVersion');
                expect(body).toContain('StartTime');
                done();
            });
        });
    });
    describe("GET /v1/tweets", function()
    {
        let mockTweets;
        beforeEach(function()
        {
            mockTweets = [];
            for(let idx = 1; idx <= 5; ++idx)
            {
                mockTweets.push(new_fake_tweet(idx));
            }

            spyOn(testServer.twitterClient, "get").and.callFake(function(url, params, callback) {
                callback(null, mockTweets);
            });
        });
        it("returns status code 200 and payload", function(done)
        {
            request.get(testServer.baseUrl+"/v1/tweets", function(error, response, body)
            {
                expect(testServer.twitterClient.get).toHaveBeenCalled();
                expect(response.statusCode).toBe(200);
                let bodyObj = JSON.parse(body);
                expect(bodyObj.total).toBe(5);
                expect(bodyObj.entities[1].id).toBe(2);
                expect(bodyObj.entities[3].id).toBe(4);
                done();
            });
        });
        it("validate tweet call returns old data until 1min timeout", function(done)
        {
            let updatedVal;
            request.get(testServer.baseUrl+"/v1/tweets", function(error, response, body)
            {
                expect(response.statusCode).toBe(200);
                let bodyObj = JSON.parse(body);
                updatedVal = bodyObj.updated;
                expect(bodyObj.total).toBe(5);
            });

            // In 20 seconds should still have the same list, even though we add 2
            setTimeout(function()
            {
                // Add some new mock tweets
                mockTweets.push(new_fake_tweet(7));
                mockTweets.push(new_fake_tweet(8));
                request.get(testServer.baseUrl+"/v1/tweets", function(error, response, body)
                {
                    expect(response.statusCode).toBe(200);
                    let bodyObj = JSON.parse(body);
                    expect(bodyObj.total).toBe(5);
                    expect(bodyObj.updated).toBe(updatedVal);
                });
            }, 20000);

            // In 65 seconds should new items
            setTimeout(function()
            {
                request.get(testServer.baseUrl+"/v1/tweets", function(error, response, body)
                {
                    expect(testServer.twitterClient.get).toHaveBeenCalled();
                    expect(response.statusCode).toBe(200);
                    let bodyObj = JSON.parse(body);
                    expect(bodyObj.total).toBe(7);
                    expect(bodyObj.entities[6].id).toBe(8);
                    expect(bodyObj.updated).not.toBe(updatedVal);
                    done();
                });
            }, 65000);
        // wait a maximum of 70 seconds
        }, 70000);
    });
});
