# feed-watch

feed-watch is a highly configurable lightweight module for watching/emitting changes in rss feeds.

## Installation
You can install feed-watch by using:
```
  npm install feed-watch
```

## Usage

A basic feed-watch can be implemented as follows:
```ts
  import FeedWatch, { FeedConfig, FeedItem, FeedItemEvent } from 'feed-watch';

  const feedWatch = new FeedWatch();

  const myUidGenerator = (feedItem: FeedItem) => `${feedItem.guid}`;

  const feed: FeedConfig = {
    name: 'my-feed',
    url: '<my-feed-url>',
    refreshRateInSecs: 100,
    skipInitialList: false, // set this to true if you do not want events for the initial set of items.
    uidGenerator: null; // takes in a fuction that returns a unique string for every feed item, used to de-dupe
                        // make sure that this can uniquely identify an item in the feed.
    parserOpts: {}; // config options for feed-parser
    requestOpts: { // config options for axios
      headers: {
        'user-agent': '<user-agent-string>'
      }
    };
  }

  feedWatch.on('error', (err) => {
    console.error(err);
  });

  feedWatch.on('item', ({ feed, item }: FeedItemEvent) => {
    console.log(feed, item);
  });

  feedWatch.add(feed);
```
