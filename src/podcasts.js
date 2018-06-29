const unirest = require('unirest');
const h2p = require('html2plaintext');

const { makeCachedFunction } = require('./cache');
const { makeRetryableFunction } = require('./retry');
const { tokens } = require('./tokens');

const podcastSearch = function(query) {
  return new Promise((resolve, reject) => {
    unirest
      .get(
        `https://listennotes.p.mashape.com/api/v1/search?q=${query}&type=episode`
      )
      .header('X-Mashape-Key', tokens.mashape)
      .header('Accept', 'application/json')
      .end(result => {
        resolve(
          (result.body.results || []).map(x => ({
            id: x.id,
            title: x.title_original,
            category: 'podcasts',
            link: x.audio,
            description: h2p(x.description_original),
            bigPictureSource: x.image,
            smallPictureSource: x.image
          }))
        );
      });
  });
};

exports.podcastSearch = makeCachedFunction(
  makeRetryableFunction(podcastSearch, 'podcastSearch'),
  'podcastSearch'
);

const podcastInfo = function(id) {
  return new Promise((resolve, reject) => {
    unirest
      .get('https://listennotes.p.mashape.com/api/v1/episodes/' + id)
      .header('X-Mashape-Key', tokens.mashape)
      .header('Accept', 'application/json')
      .end(result => {
        const data = result.body;
        resolve({
          id: data.id,
          title: data.title,
          category: 'podcasts',
          link: data.audio,
          description: h2p(data.description),
          bigPictureSource: data.podcast.image,
          smallPictureSource: data.podcast.image
        });
      });
  });
};

exports.podcastInfo = makeCachedFunction(
  makeRetryableFunction(podcastInfo, 'podcastInfo'),
  'podcastInfo'
);
