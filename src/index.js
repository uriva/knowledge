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
exports.setCacheTtl = function(ttl) {
  cache.ttl = ttl;
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

exports.getDetails = function getDetails({ id, category }) {
  return exports.categories[category].idToEntityFunction(id);
};

exports.categories = {
  movies: {
    singular: 'Movie',
    visibleName: 'Movies',
    plural: 'Movies',
    queueTitle: 'Movies to watch',
    icon: 'ios-film-outline',
    emoji: '🎥',
    iconFamily: 'Ionicons',
    askForMoreFiller: 'Action movies please :)',
    idToEntityFunction: movieInfo,
    entityQueryFunction: searchMovie,
    zeroPrefixFunction: getMovieRecommendations,
    attribution: TMDB_ATTRIBUTION,
    emptyQueueAddEntityText: 'Add a movie you want to watch',
    emptyLovedAddEntityText: 'Add your favorite movie'
  },
  tv: {
    singular: 'Show',
    visibleName: 'TV',
    plural: 'Shows',
    queueTitle: 'TV Shows to binge',
    icon: 'tv',
    emoji: '📺',
    iconFamily: 'Feather',
    iconSize: 20,
    iconOpacity: 0.8,
    askForMoreFiller: "I'm in need of something light and funny!",
    idToEntityFunction: tvInfo,
    entityQueryFunction: searchTv,
    attribution: TMDB_ATTRIBUTION,
    zeroPrefixFunction: getTvRecommendations,
    emptyQueueAddEntityText: 'Add a TV show to binge',
    emptyLovedAddEntityText: 'Add your favorite TV show'
  },
  books: {
    singular: 'Book',
    visibleName: 'Books',
    plural: 'Books',
    queueTitle: 'Books to read',
    icon: 'ios-book-outline',
    emoji: '📚',
    iconFamily: 'Ionicons',
    askForMoreFiller: 'Anything but bestsellers please :)',
    idToEntityFunction: bookInfo,
    entityQueryFunction: searchBook,
    attribution: GOOGLE_ATTRIBUTION,
    emptyQueueAddEntityText: 'Add a book you want to read',
    emptyLovedAddEntityText: 'Add your favorite book'
  },
  restaurants: {
    singular: 'Restaurant',
    visibleName: 'Restaurants',
    plural: 'Restaurants',
    queueTitle: 'Restaurants to dine in',
    iconFamily: 'Ionicons',
    icon: 'ios-restaurant-outline',
    emoji: '🍽️',
    askForMoreFiller: 'Looking for new vegan options!',
    idToEntityFunction: id => placeInfo(id, 'restaurants'),
    entityQueryFunction: query =>
      searchPlace({
        query,
        types: ['restaurant'],
        excludedTypes: [],
        category: 'restaurants'
      }),
    itemsNeedLocation: true,
    useNativeLinking: true,
    attribution: GOOGLE_ATTRIBUTION,
    zeroPrefixFunction: excludedPlaces =>
      searchWithoutQuery({
        excludedPlaces,
        types: ['restaurant'],
        excludedTypes: [],
        category: 'restaurants'
      }),
    emptyQueueAddEntityText: 'Add a restaurnat you want to eat in',
    emptyLovedAddEntityText: 'Add your favorite restaurnat'
  },
  places: {
    singular: 'Place',
    visibleName: 'Places',
    plural: 'Places',
    queueTitle: 'Places to go',
    iconFamily: 'Ionicons',
    icon: 'ios-pin-outline',
    emoji: '📍',
    askForMoreFiller: 'Looking for cool places to see in Amsterdam!',
    idToEntityFunction: id => placeInfo(id, 'places'),
    entityQueryFunction: query =>
      searchPlace({
        query,
        types: [],
        category: 'places',
        excludedTypes: ['restaurants']
      }),
    itemsNeedLocation: true,
    useNativeLinking: true,
    attribution: GOOGLE_ATTRIBUTION,
    zeroPrefixFunction: excludedPlaces =>
      searchWithoutQuery({
        excludedPlaces,
        types: ['museum', 'night_club', 'park'],
        excludedTypes: ['restaurants'],
        category: 'places'
      }),
    emptyQueueAddEntityText: 'Add a place you want to go to',
    emptyLovedAddEntityText: 'Add your favorite location'
  },
  links: {
    singular: 'Link',
    visibleName: 'Links',
    plural: 'Links',
    queueTitle: 'Links to kill time',
    icon: 'ios-link-outline',
    emoji: '🔗',
    iconFamily: 'Ionicons',
    idToEntityFunction: linkPreview.getLinkInfo,
    askForMoreFiller: 'Looking for interesting articles',
    entityQueryFunction: linkPreview.searchLink,
    emptyQueueAddEntityText: 'Paste a link to check out later',
    emptyLovedAddEntityText: 'Paste your favorite link'
  }
};
