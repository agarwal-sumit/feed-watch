/* eslint-disable no-undef */
import * as assert from 'assert';
import FeedWatch, { FeedConfig, FeedItemEvent } from '../index';

const feedConfig: FeedConfig = {
  url: 'https://lorem-rss.herokuapp.com/feed?unit=second',
  name: 'my-feed',
};

describe('FeedEmitter', () => {
  const feedWatch = new FeedWatch();
  assert(feedWatch instanceof FeedWatch, 'constructor failed');

  describe('feedWatch.add', () => {
    it('should add a feed to the feedlist', () => {
      feedWatch.add(feedConfig);
      assert.strictEqual(feedWatch.list().length, 1, 'feedWatch should contain 1 feed');
    });
  });

  describe('feedWatch.list', () => {
    it('should list all feeds', () => {
      const list = feedWatch.list();
      assert.strictEqual(list.length, 1, 'feedWatch should contain 1 feed');
    });
  });

  describe('feedWatch.event', () => {
    it('should receive event items', async () => {
      const item = await new Promise<FeedItemEvent>((resolve, reject) => {
        feedWatch.on('item', resolve);
        feedWatch.on('error', reject);
      });
      assert.equal(item.feed.name, feedConfig.name);
    }).timeout(10000);
  });

  describe('feedWatch.remove', () => {
    it('should remove the feed that matches the url from the list', () => {
      feedWatch.remove(feedConfig.url);
      const list = feedWatch.list();
      assert.strictEqual(list.length, 0, 'feedWatch should contain 0 feeds');
    });
  });
});
