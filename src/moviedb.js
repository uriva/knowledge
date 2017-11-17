let mdbLib = null;

exports.init = function() {
  mdbLib = require('moviedb')(require('./tokens').tokens.tmdb);
};

const { makeCachedFunction } = require('./cache');
const { makeRetryableFunction } = require('./retry');

// Wrapping to make promises instead of callbacks.
const mdb = (m, q) =>
  new Promise((res, rej) => {
    mdbLib[m](q, (err, data) => (err ? rej(err) : res(data)));
  });

const basePosterUrl = 'https://image.tmdb.org/t/p/';
const baseIMDBLinkUrl = 'https://www.imdb.com/title/';
const baseTMDBLinkUrl = 'https://www.themoviedb.org/';

const getPosterUrl = (posterPath, widthString) =>
  posterPath ? basePosterUrl + widthString + posterPath : null;

const smallPosterUrl = posterPath => getPosterUrl(posterPath, 'w185');
const bigPosterUrl = posterPath => getPosterUrl(posterPath, 'w500');

const getBasicInfo = res => ({
  id: res.id,
  smallPictureSource: smallPosterUrl(res.backdrop_path),
  bigPictureSource: bigPosterUrl(res.backdrop_path),
  locationComplete: true
});

const getGenresString = (res, currentString) => {
  const { genres } = res;
  let ret = !!currentString ? ', ' : '';
  if (genres && genres.length) {
    ret += `${genres[0].name.toLowerCase()}`;
    if (genres.length > 1) {
      ret += `, ${genres[1].name.toLowerCase()}`;
    }
  }
  return ret;
};

const getMovieDescription = res => {
  let ret = '';
  const { runtime } = res;
  if (runtime) {
    ret = `${runtime} minutes`;
  }
  ret += getGenresString(res, ret);
  return ret;
};

const getBasicMovieInfo = res => ({
  ...getBasicInfo(res),
  title: res.title,
  description: getMovieDescription(res),
  category: 'movies',
  link: res.imdb_id ? baseIMDBLinkUrl + res.imdb_id : ''
});

const getTvDescription = res => {
  let ret = '';
  const { episode_run_time } = res;
  if (episode_run_time && episode_run_time.length) {
    ret = `${episode_run_time[0]} minutes`;
  }
  ret += getGenresString(res, ret);
  return ret;
};

const getBasicTvInfo = res => ({
  ...getBasicInfo(res),
  title: res.name,
  description: getTvDescription(res),
  category: 'tv',
  link: baseTMDBLinkUrl + 'tv/' + res.id
});

const getResultsByPopularity = (response, limit) => {
  return response.results
    .sort((a, b) => b.popularity - a.popularity)
    .slice(0, limit || 5);
};

const getRecommendationsWithPage = async (
  mdbFunction,
  getBasicInfoFunction,
  existingEntities,
  page
) => {
  const existingIds = existingEntities.map(entity => entity.id);
  const response = await mdb(mdbFunction, { page });
  return {
    results: getResultsByPopularity(response, 20)
      .map(getBasicInfoFunction)
      .map(entity => Object.assign(entity, { subtitle: 'Popular now' }))
      .filter(result => !existingIds.includes('' + result.id)),
    moreDataFunction: () =>
      getRecommendationsWithPage(
        mdbFunction,
        getBasicInfoFunction,
        existingEntities,
        page + 1
      )
  };
};

const getMovieRecommendationsWithPage = async (existingEntities, page) =>
  getRecommendationsWithPage(
    'miscPopularMovies',
    getBasicMovieInfo,
    existingEntities,
    page
  );

exports.getMovieRecommendations = existingEntities =>
  getMovieRecommendationsWithPage(existingEntities, 1);

const getTvRecommendationsWithPage = async (existingEntities, page) =>
  getRecommendationsWithPage(
    'miscPopularTvs',
    getBasicTvInfo,
    existingEntities,
    page
  );

exports.getTvRecommendations = existingEntities =>
  getTvRecommendationsWithPage(existingEntities, 1);

exports.searchTv = async query =>
  getResultsByPopularity(await mdb('searchTv', { query })).map(getBasicTvInfo);

exports.searchMovie = async query =>
  getResultsByPopularity(await mdb('searchMovie', { query })).map(
    getBasicMovieInfo
  );

exports.movieInfo = makeCachedFunction(
  makeRetryableFunction(
    async id => getBasicMovieInfo(await mdb('movieInfo', { id: parseInt(id) })),
    'movieInfo'
  ),
  'movieInfo'
);

exports.tvInfo = makeCachedFunction(
  makeRetryableFunction(
    async id => getBasicTvInfo(await mdb('tvInfo', { id: parseInt(id) })),
    'tvInfo'
  ),
  'tvInfo'
);
