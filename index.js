const linkPreview = require('./linkPreview');
const movieDb = require('./moviedb');
const places = require('./places');
const {
  movieInfo,
  tvInfo,
  searchTv,
  searchMovie,
  getMovieRecommendations,
  getTvRecommendations
} = require('./moviedb');
const { placeInfo, searchPlace, searchWithoutQuery } = require('./places');
const { bookInfo, searchBook } = require('./books');
const cache = require('./cache');
const geolocate = require('./geolocate');
const tokens = require('./tokens');

exports.setTokens = function(givenTokens) {
  tokens.setTokens(givenTokens);
  movieDb.init();
  places.init();
};

exports.setAsyncStorage = function(storage) {
  cache.AsyncStorage = storage;
};
exports.setGeolocateFunction = function(func) {
  geolocate.setGeolocate(func);
};

const TMDB_ATTRIBUTION = {
  uri:
    'https://www.themoviedb.org/assets/static_cache/fd6543b66d4fd736a628af57a75bbfda/images/v4/logos/293x302-powered-by-square-blue.png',
  width: 20,
  height: 20
};

const GOOGLE_ATTRIBUTION = {
  uri:
    'http://vignette1.wikia.nocookie.net/ichc-channel/images/7/70/Powered_by_google.png/revision/latest?cb=20160331203712',
  width: 40,
  height: 8
};

exports.categories = {
  movies: {
    singular: 'Movie',
    visibleName: 'Movies',
    plural: 'Movies',
    queueTitle: 'Movies to Watch',
    icon: 'local-movies',
    emoji: '🎥',
    iconFamily: 'MaterialIcons',
    askForMoreFiller: 'Action movies please :)',
    idToEntityFunction: movieInfo,
    entityQueryFunction: searchMovie,
    zeroPrefixFunction: getMovieRecommendations,
    attribution: TMDB_ATTRIBUTION,
    emptyQueueAddEntityText: 'Try typing a movie name. E.g., "Avatar"'
  },
  tv: {
    singular: 'Show',
    visibleName: 'TV',
    plural: 'Shows',
    queueTitle: 'TV Shows to Binge',
    icon: 'tv',
    emoji: '📺',
    iconFamily: 'Entypo',
    askForMoreFiller: "I'm in need of something light and funny!",
    idToEntityFunction: tvInfo,
    entityQueryFunction: searchTv,
    attribution: TMDB_ATTRIBUTION,
    zeroPrefixFunction: getTvRecommendations,
    emptyQueueAddEntityText: 'Try typing a tv show name. E.g., "Fargo"'
  },
  books: {
    singular: 'Book',
    visibleName: 'Books',
    plural: 'Books',
    queueTitle: 'Books to Read',
    icon: 'open-book',
    emoji: '📚',
    iconFamily: 'Entypo',
    askForMoreFiller: 'Anything but bestsellers please :)',
    idToEntityFunction: bookInfo,
    entityQueryFunction: searchBook,
    attribution: GOOGLE_ATTRIBUTION,
    emptyQueueAddEntityText: 'Try typing a book name. E.g., "Shantaram"'
  },
  restaurants: {
    singular: 'Restaurant',
    visibleName: 'Restaurants',
    plural: 'Restaurants',
    queueTitle: 'Restaurants to Dine in',
    iconFamily: 'MaterialIcons',
    icon: 'restaurant-menu',
    emoji: '🍽️',
    askForMoreFiller: 'Looking for new vegan options!',
    idToEntityFunction: placeInfo,
    entityQueryFunction: searchPlace,
    itemsNeedLocation: true,
    useNativeLinking: true,
    attribution: GOOGLE_ATTRIBUTION,
    zeroPrefixFunction: searchWithoutQuery,
    emptyQueueAddEntityText:
      'Try typing a restaurant name. E.g., "Lia\'s Kitchen"'
  },
  links: {
    singular: 'Link',
    visibleName: 'Links',
    plural: 'Links',
    queueTitle: 'Links to Kill Time',
    icon: 'link',
    emoji: '🔗',
    iconFamily: 'Entypo',
    idToEntityFunction: linkPreview.getLinkInfo,
    askForMoreFiller: 'Looking for interesting articles',
    entityQueryFunction: linkPreview.searchLink,
    emptyQueueAddEntityText: 'Try searching for a link using the search button'
  }
};
