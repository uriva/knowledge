const LinkPreview = require('react-native-link-preview');
const getYouTubeID = require('get-youtube-id');
const { isUri } = require('valid-url');

const { makeCachedFunction } = require('./cache');

const cachedGetLinkInfo = makeCachedFunction(
  LinkPreview.getPreview,
  'linkGetPreview'
);

exports.getLinkInfo = async link => {
  try {
    const res = await cachedGetLinkInfo(link);
    // We rename some of the fields to conform to all other id-to-entity
    // functions.
    return {
      id: link,
      category: 'links',
      link: res.url,
      title: res.title,
      ytId: getYouTubeID(link, { fuzzy: false }),
      smallPictureSource: res.images.length ? res.images[0] : null,
      bigPictureSource: res.images.length ? res.images[0] : null,
      locationComplete: true
    };
  } catch (err) {
    return {
      id: link,
      category: 'links',
      link,
      title: link,
      locationComplete: true
    };
  }
};

exports.searchLink = async query => {
  const parts = query.match(/\S+/g) || [];
  const link = parts.find(isUri);
  if (!link) {
    return [];
  }
  const res = await exports.getLinkInfo(link);
  return res.link ? [res] : [];
};
