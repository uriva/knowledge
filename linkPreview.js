const LinkPreview = require('react-native-link-preview');
const getYouTubeID = require('get-youtube-id');
const { isUri } = require('valid-url');

const makeCachedFunction = require('./cache');

exports.getLinkInfo = makeCachedFunction(async link => {
  try {
    const res = await LinkPreview.getPreview(link);
    // We rename some of the fields to conform to all other id-to-entity
    // functions.
    return {
      id: link,
      category: 'links',
      link: res.url,
      title: res.title,
      ytId: getYouTubeID(link, { fuzzy: false }),
      description: res.description,
      smallPictureSource: res.images.length ? res.images[0] : null,
      bigPictureSource: res.images.length ? res.images[0] : null,
      locationComplete: true
    };
  } catch (err) {
    console.error('failed getting link info', err);
    return {
      id: link,
      category: 'links',
      link,
      title: link,
      locationComplete: true
    };
  }
}, 'link');

exports.searchLink = async query => {
  const parts = query.match(/\S+/g) || [];
  const link = parts.find(isUri);
  if (!link) {
    return [];
  }
  const res = await exports.getLinkInfo(link);
  return res.link ? [res] : [];
};
