// -----------------------------------------------------
// Author:  Jeff Beltz
// -----------------------------------------------------
"use strict";
const request = require("request");
const testServer = require("../../server.js");
const mockTweets = require("../helpers/mock-tweets.js");
const _ = require("lodash");

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
        var testTweets;
        beforeEach(function()
        {
            testTweets = mockTweets.fake_tweet_array(5);
            spyOn(testServer.twitterClient, "get").and.callFake(function(url, params, callback) {
                callback(null, testTweets);
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
                testTweets.push(mockTweets.new_fake_tweet(7));
                testTweets.push(mockTweets.new_fake_tweet(8));
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
