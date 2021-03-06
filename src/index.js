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
const { podcastInfo, podcastSearch } = require('./podcasts');
const cache = require('./cache');
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

exports.search = async function search({ query, coords, categories }) {
  let results = await Promise.all(
    categories.map(categoryKey =>
      exports.categories[categoryKey].entityQueryFunction(query, coords)
    )
  );
  const merged = [];
  while (results.length) {
    results = results.filter(perCategoryResults => perCategoryResults.length);
    for (const perCategoryResults of results) {
      merged.push(perCategoryResults.shift());
    }
  }
  return merged;
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
    attribution: TMDB_ATTRIBUTION
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
    zeroPrefixFunction: getTvRecommendations
  },
  podcasts: {
    singular: 'Podcast',
    visibleName: 'Podcasts',
    plural: 'Podcasts',
    queueTitle: 'Podcasts to listen to',
    icon: 'md-headset',
    emoji: '🎧',
    iconFamily: 'Ionicons',
    askForMoreFiller: 'In need of a good podcast to listen on my commute :)',
    idToEntityFunction: podcastInfo,
    entityQueryFunction: podcastSearch,
    attribution: null
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
    attribution: GOOGLE_ATTRIBUTION
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
    entityQueryFunction: (query, coords) =>
      searchPlace({
        coords,
        query,
        types: ['restaurant'],
        excludedTypes: [],
        category: 'restaurants'
      }),
    itemsNeedLocation: true,
    useNativeLinking: true,
    attribution: GOOGLE_ATTRIBUTION,
    zeroPrefixFunction: (excludedPlaces, coords) =>
      searchWithoutQuery({
        coords,
        excludedPlaces,
        types: ['restaurant'],
        excludedTypes: [],
        category: 'restaurants'
      })
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
    entityQueryFunction: (query, coords) =>
      searchPlace({
        coords,
        query,
        types: [],
        category: 'places',
        excludedTypes: ['restaurants']
      }),
    itemsNeedLocation: true,
    useNativeLinking: true,
    attribution: GOOGLE_ATTRIBUTION,
    zeroPrefixFunction: (excludedPlaces, coords) =>
      searchWithoutQuery({
        coords,
        excludedPlaces,
        types: ['museum', 'night_club', 'park'],
        excludedTypes: ['restaurants'],
        category: 'places'
      })
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
    entityQueryFunction: linkPreview.searchLink
  }
};
