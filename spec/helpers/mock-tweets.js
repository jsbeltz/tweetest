// -----------------------------------------------------
// Author:  Jeff Beltz
// -----------------------------------------------------

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


function fake_tweet_array(count)
{
    var mockTweets = [];
    for(let idx = 1; idx <= count; ++idx)
    {
        mockTweets.push(new_fake_tweet(idx));
    }
    return mockTweets;
}

// Prepare for node use
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined')
{
    module.exports.new_fake_tweet = new_fake_tweet;
    module.exports.fake_tweet_array = fake_tweet_array;
    module.exports.tweetTestDate = g_tweetDate;
}
