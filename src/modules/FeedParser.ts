import * as FeedParser from 'feedparser';
import { Item, Options as FeedParserOptions } from 'feedparser';
import axios, { AxiosResponse, AxiosRequestConfig } from 'axios';
import { Iconv } from 'iconv';
import * as zlib from 'zlib';

function getParams(str): Record<string, string> {
  return str.split(';').reduce((params, param) => {
    const [key, value] = param.split('=').map(part => part.trim());
    if (key != null && value != null) {
      return { ...params, [key]: value };
    }
    return params;
  }, {});
}

function throughDecompressor(stream: AxiosResponse['data']): AxiosResponse['data'] {
  const encoding = stream.headers['content-encoding'] || 'identity';
  let decompress;
  if (encoding.match(/\bdeflate\b/)) {
    decompress = zlib.createInflate();
  } else if (encoding.match(/\bgzip\b/)) {
    decompress = zlib.createGunzip();
  }
  return decompress ? stream.pipe(decompress) : stream;
}

function throughTranslator(stream: AxiosResponse['data']): AxiosResponse['data'] {
  const { charset } = getParams(stream.headers['content-type'] || '');
  if (charset && !/utf-*8/i.test(charset)) {
    try {
      const iconv = new Iconv(charset, 'utf-8');
      iconv.on('error', err => {
        stream.emit('error', err);
      });
      return stream.pipe(iconv);
    } catch (err) {
      stream.emit('error', err);
    }
  }
  return stream;
}

export async function get(
  url,
  axiosOpts: AxiosRequestConfig,
  parserOpts: FeedParserOptions
): Promise<Item[]> {
  const posts: Item[] = [];
  const feedparser = new FeedParser(parserOpts);
  const { data: stream }: AxiosResponse = await axios.get(url, {
    ...axiosOpts,
    responseType: 'stream',
  });
  if (stream.statusCode !== 200) throw new Error('Bad Status Code');
  throughTranslator(throughDecompressor(stream)).pipe(feedparser);

  feedparser.on('readable', () => {
    let post: Item;
    // eslint-disable-next-line no-cond-assign
    while ((post = feedparser.read())) {
      posts.push(post);
    }
  });

  await new Promise((resolve, reject) => {
    stream.on('error', reject);
    feedparser.on('error', reject);
    feedparser.on('end', resolve);
  });

  return posts;
}

export { AxiosRequestConfig, FeedParserOptions };
