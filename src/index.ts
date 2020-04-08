import { EventEmitter } from 'events';
import { get as getFeed, FeedParserOptions, AxiosRequestConfig } from './modules/FeedParser';

export interface FeedItem {
  title: string;
  description: string;
  summary: string;
  date: Date | null;
  pubdate: Date | null;
  link: string;
  origlink: string;
  author: string;
  guid: string;
  comments: string;
  [x: string]: any;
}

export interface FeedItemEvent {
  feed: {
    name: string;
    url: string;
  };
  item: FeedItem;
}

export interface FeedConfig {
  name: string;
  url: string;
  refreshRateInSecs?: number;
  skipInitialList?: boolean;
  uidGenerator?: (item: FeedItem) => string;
  parserOpts?: FeedParserOptions;
  requestOpts?: AxiosRequestConfig;
}

type Feed = {
  timer?: NodeJS.Timer;
  config: FeedConfig;
  lastUid: string;
};

function defaultUidGenerator(el: FeedItem): string {
  return `${el.guid}:${el.link}:${el.title}`;
}

export default class FeedWatch extends EventEmitter {
  private feedList: Feed[] = [];

  async fetchAndUpdateItems(feed: Feed, isInitialRun = false): Promise<void> {
    try {
      const feedItems = await getFeed(
        feed.config.url,
        feed.config.requestOpts,
        feed.config.parserOpts
      );
      feedItems.some(el => {
        const uniqueId = feed.config.uidGenerator(el);
        if (feed.lastUid === uniqueId) return true;
        if (isInitialRun && feed.config.skipInitialList) return false;
        this.emit('item', {
          feed: {
            name: feed.config.name,
            url: feed.config.url,
          },
          item: el,
        });
        return false;
      });
    } catch (err) {
      this.emit('error', err);
    }
  }

  async initFeed(config: FeedConfig): Promise<void> {
    const feed: Feed = {
      config,
      lastUid: null,
    };
    this.feedList.push(feed);
    await this.fetchAndUpdateItems(feed, true);
    feed.timer = setInterval(function() {
      this.fetchAndUpdateItems(feed);
    }, config.refreshRateInSecs * 1000);
  }

  add({
    name,
    url,
    skipInitialList = false,
    refreshRateInSecs = 300,
    uidGenerator = defaultUidGenerator,
    requestOpts = {
      headers: {
        'user-agent': 'FeedWatch/0.1.0',
        accept: 'text/html,application/xhtml+xml,application/xml,text/xml',
      },
      maxRedirects: 5,
    },
    parserOpts,
  }: FeedConfig): void {
    const config: FeedConfig = {
      name,
      url,
      skipInitialList,
      refreshRateInSecs,
      uidGenerator,
      requestOpts,
      parserOpts,
    };
    const existingFeed = this.feedList.find(el => el.config.url === url);
    if (existingFeed) throw new Error(`Feed: ${url} already subscribed`);
    this.initFeed(config);
  }

  remove(url: string): void {
    const feed = this.feedList.find(el => el.config.url === url);
    if (feed?.timer) {
      clearInterval(feed.timer);
    }
    this.feedList = this.feedList.filter(el => el.config.url !== url);
  }

  destroy(): void {
    this.feedList.forEach(feed => {
      if (feed?.timer) {
        clearInterval(feed.timer);
      }
    });
    this.feedList = [];
  }

  list(): FeedConfig[] {
    return this.feedList.map(el => el.config);
  }
}
