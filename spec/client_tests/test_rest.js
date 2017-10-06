// -----------------------------------------------------
// Author:  Jeff Beltz
// -----------------------------------------------------

describe("Test application", function()
{
    describe("Test REST collection", function()
    {
        beforeEach(function()
        {
            jasmine.Ajax.install();
        });

        afterEach(function()
        {
            jasmine.Ajax.uninstall();
        });

        it("Test tweet model/collection from REST", function()
        {
            var testTweets = fake_tweet_array(4);
            var testResponse = { total: testTweets.length
                               , entities: testTweets
                               };
            var tweetCollection = new TweetCollectionDef();
            tweetCollection.fetch();

            expect(jasmine.Ajax.requests.mostRecent().url).toBe('/v1/tweets');
            jasmine.Ajax.requests.mostRecent().respondWith({ "status": 200
                                                           , "contentType": 'application/json'
                                                           , "responseText": JSON.stringify(testResponse)
                                                           });

            expect(tweetCollection.length).toBe(4);
            // Validate the model of the 3rd element
            var expectedAttrs = new_fake_tweet(3);
            var testModelAttrs = tweetCollection.at(2).attributes;
            // create_at times don't quite match so exclude those the the attrs should be the same
            expect(_.omit(testModelAttrs, 'created_at')).toEqual(_.omit(expectedAttrs, 'created_at'));
        });
    });
    describe("Test Views", function()
    {
        beforeEach(function()
        {
            this.testTweets = fake_tweet_array(3);
            this.tweetCollection = new TweetCollectionDef();
            this.tweetCollection.reset(this.testTweets);
        });

        afterEach(function()
        {
        });

        it("Test Item View Render", function()
        {
            expect(this.tweetCollection.length).toBe(3);

            var expectedAttrs = new_fake_tweet(2);
            var item = new TweetItemViewDef({model: this.tweetCollection.at(1)});
            spyOn(item, 'mediaTemplate').and.callFake(function(mediaUrl)
            {
                expect(expectedAttrs.entities.media[0]).toEqual(mediaUrl);
                return mediaUrl.media_url
            });
            spyOn(item, 'template').and.callFake(function(mainData)
            {
                var expectedData = { user_name: expectedAttrs.user.name
                  , user_profile_image_url: expectedAttrs.user.profile_image_url
                  , user_screen_name: expectedAttrs.user.screen_name
                  , retweet_count: expectedAttrs.retweet_count 
                  , text: expectedAttrs.text
                  , media: expectedAttrs.entities.media[0].media_url
                  };
                expect(expectedData).toEqual(_.omit(mainData, 'created_at'));
            });
            item.render();
        });
        it("Test List View Render", function()
        {
            expect(this.tweetCollection.length).toBe(3);

            var appView = new TweetListView({collection: this.tweetCollection});
            spyOn(appView, 'set_title');
            var list = {append: function(string){} };
            spyOn(list, "append");

            appView.render_internal(list);
            expect(appView.set_title).toHaveBeenCalledWith(3);
            expect(list.append).toHaveBeenCalledTimes(3)
        });
        it("Test List View Render Filter", function()
        {
            expect(this.tweetCollection.length).toBe(3);

            var appView = new TweetListView({collection: this.tweetCollection});
            spyOn(appView, 'set_title');
            var list = {append: function(string){} };
            spyOn(list, "append");

            appView.render_internal(list, "1");
            expect(appView.set_title).toHaveBeenCalledWith(1);
            expect(list.append).toHaveBeenCalledTimes(1)
        });
    });
});
