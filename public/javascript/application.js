// Author: Jeff Beltz

//  The tweet model definition
var TweetModelDef = Backbone.Model.extend({
    default: {
        "created_at": null,
        "id": 0,
        "id_str": null, 
        "text": null,
        // "truncated":false,
        "entities": null,
        // "source": null,
        // "in_reply_to_status_id":null,
        // "in_reply_to_status_id_str":null,
        // "in_reply_to_user_id":null,
        // "in_reply_to_user_id_str":null,
        // "in_reply_to_screen_name":null,
        "user": null,
        // "geo":null,
        // "coordinates":null,
        // "place":null,
        // "contributors":null,
        // "is_quote_status":false,
        // "favorite_count":19,
        // "favorited":false,
        // "retweeted":false,
        // "possibly_sensitive":false,
        // "lang":"en"
        "retweet_count":10
    }
});

// The collection of tweets from the REST endpoint
var TweetCollectionDef = Backbone.Collection.extend({
    url: '/v1/tweets',
    model: TweetModelDef,
    parse: function(data) {
        // console.log("data=%j", data);
        return data.entities;
    }
});

// The individual tweet's view definition
var TweetItemViewDef = Backbone.View.extend({
    tagName: 'div',
    className: 'tweet-item',
    template: _.template($('#tweet-item-tmpl').html()),

    initialize: function() {
        this.listenTo(this.model, 'destroy', this.remove)
    },

    render: function() {
        var modelAttrs = this.model.attributes;
        var text = '<div>' + modelAttrs.text + '</div>';
        if (modelAttrs.entities !== undefined &&
            modelAttrs.entities.media !== undefined)
        {
            modelAttrs.entities.media.forEach(function(url)
            {
                text += '<img class="tweet-img", src="' + url.media_url + '"></img>';
            });
        }

        var renderModel = { user_name: modelAttrs.user.name
                          , user_profile_image_url: modelAttrs.user.profile_image_url
                          , user_screen_name: modelAttrs.user.screen_name
                          , created_at: modelAttrs.created_at
                          , retweet_count: modelAttrs.retweet_count 
                          , text: text
                          };

        var html = this.template(renderModel);
        // console.log("html=%j", html);
        this.$el.html(html);
        return this;
    },
});

// View class for rendering the tweets
var TweetListView = Backbone.View.extend({
    el: '#tweet-list',

    initialize: function()
    {
        // console.log("collection=%j", this.collection);
        this.listenTo(this.collection, 'sync', this.render);
    },

    events:
    {
        "click #tweet-filter-button": "applyFilter",
        "click #tweet-filter-reset": "render"
    },

    render: function()
    {
        // var $list = this.$('ul.tweet-list').empty();
        var $list = this.$el.empty();
        this.collection.each(function(model) {
            var item = new TweetItemViewDef({model: model});
            $list.append(item.render().$el);
        }, this);
        return this;
    },

    applyFilter: function()
    {
        var filter = $('#tweet-filter').val();
        if (filter.length === 0)
        {
            console.log('no filter, render normally');
            return this.render;
        }

        console.log('filter value=%s', filter, typeof filter);
        var $list = this.$el.empty();
        // var $list = this.$('ul.tweet-list').empty();
        this.collection.each(function(model) {
            var modelAttrs = model.attributes;
            if (modelAttrs.text !== undefined && modelAttrs.text.indexOf(filter) !== -1)
            {
                var item = new TweetItemViewDef({model: model});
                $list.append(item.render().$el);
            }
        }, this);
        return this;
    }
});

var tweetCollection = new TweetCollectionDef();
var appView = new TweetListView({collection: tweetCollection});
tweetCollection.fetch();