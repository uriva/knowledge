const { makeCachedFunction } = require('./cache');
const geolib = require('geolib');
const geolocate = require('./geolocate');
const { fetch } = require('cross-fetch');
let TOKEN;

exports.init = function () {
  TOKEN = require('./tokens').tokens.gmaps;
};

// Prepare a link with all needed details to call the places API.
// We sometimes want just the URL for future requests, so this function doesn't perform the call itself.
const makeUrlWithParams = function (action, params, parseJson) {
  const searchParams = ['key=' + TOKEN];
  Object.keys(params).forEach(k => {
    if (typeof params[k] != 'undefined') {
      searchParams.push(k + '=' + params[k]);
    }
  });
  return `https://maps.googleapis.com/maps/api/place/${action}${parseJson
    ? '/json'
    : ''}?${searchParams.join('&')}`;
};

// Prepare a link, do the request and return the parsed response.
const doRequest = function (action, params, parseJson = true) {
  return fetch(makeUrlWithParams(action, params, parseJson), {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json'
    }
  }).then(res => {
    if (parseJson) {
      try {
        res = res.json();
      } catch (e) {
        console.error(e);
      }
    }
    return res;
  });
};

// Makes a URL for a picture for the given result.
// Response example:
// https://maps.googleapis.com/maps/api/place/photo?key=API_KEY&maxwidth=400&photoreference=CnRtAAAATLZNl354RwP_9UKbQ_5Psy40texXePv4oAlgP4qNEkdIrkyse7rPXYGd9D_Uj1rVsQdWT4oRz4QrYAJNpFX7rzqqMlZw2h2E2y5IKMUZ7ouD_SlcHxYq1yL4KbKUv3qtWgTK0A6QbGh87GB3sscrHRIQiG2RrmU_jF4tENr9wGS_YxoUSSDrYjWmrNfeEHSGSc3FyhNLlBU
const getPictureSource = (result, maxwidth = 500) =>
  result.photos && result.photos.length
    ? makeUrlWithParams(
      'photo',
      { photoreference: result.photos[0].photo_reference, maxwidth },
      false
    )
    : undefined;

// Given a Google Maps response and location, returns a nice description string with:
// - current open status
// - distance
const createDescription = (result, location) => {
  let ret = !result.opening_hours
    ? 'Opening hours unknown'
    : result.opening_hours.open_now ? 'Open now' : 'Closed now';

  if (location.coords) {
    const distance = geolib.getDistance(
      location.coords,
      result.geometry.location
    );
    ret += ', ' + (distance / 1000).toFixed(1) + ' KM';
  }
  return ret;
};

// A cached data requester based on place ID.
const cachedPlaceInfo = makeCachedFunction(doRequest, 'placeInfoDetails');

// Response example:
// https://maps.googleapis.com/maps/api/place/details/json?key=API_KEY&placeid=ChIJEScAUn9MHRURzG4ggK8ID4Y
exports.placeInfo = async (placeid, category) => {
  const { result } = await cachedPlaceInfo('details', { placeid });
  if (!result) {
    return Promise.reject();
  }
  const currentLocation = geolocate.get();
  return {
    id: placeid,
    title: result.name,
    category,
    link: result.url,
    locationComplete: currentLocation.coords,
    description: createDescription(result, currentLocation),
    location: result.geometry.location,
    bigPictureSource: getPictureSource(result),
    smallPictureSource: getPictureSource(result, 100)
  };
};

const mapSearchResultsToEntities = (response, limit, category, excludedTypes) =>
  !response.results
    ? []
    : response.results
      .filter(
        result =>
          result.types && !excludedTypes.some(excludedType =>
            result.types.includes(excludedType)
          )
      )
      .slice(0, limit || 5)
      .map(result => ({
        id: result.place_id,
        title: result.name,
        category,
        description: createDescription(result, geolocate.get()),
        location: result.geometry.location,
        bigPictureSource: getPictureSource(result),
        smallPictureSource: getPictureSource(result, 100)
      }));

const getLocationParam = () => {
  const currentLocation = geolocate.get();
  return currentLocation.coords
    ? [currentLocation.coords.latitude, currentLocation.coords.longitude].join(
      ','
    )
    : undefined;
};

// Returns an object with processed results, filtered against excludedPlaces and a recursion call for next pages.
// Example URL for next_page_token usage:
// https://maps.googleapis.com/maps/api/place/textsearch/json?key=API_KEY_HERE&location=32.0853%2C34.7818&type=restaurant&pagetoken=CpQCBwEAAGjYNql6iKPC2kOaCtS4Lc4tyj42ak9WZy2h6isCJWEUY9TQUpAh1Vwf35M0MC2qf9l1zJVgrnEqIt5GPYaM3dw2EiwgM1EEr--upS0FoKvv94jN3ACJVYTmrgA0SzguL-Np4AkJ704ngw1wKfdMaWvbvjVEiBlA3OUtPY3-zrichl-JaMerl0d_1FHzyRnyxBYWuKEEG-3S6FjaQOh-0Ks4lekJZiYW6NhD2QX3OVDFMNlpGs-88j-_3KT4AnUqzoC6KjUnE4GCY2-BdTGPW6hmNCXq2XIYtpsQ3xquT7iJb_C5N1lOSZebR-DLbwrDS7zkw_yDgapqr-yoeqVK0Jt9tBEeHGups2fnaovL1CEkEhDfhtVHsmK1rSaqt9sHrELRGhToqlUePY-ABMZgIprHyJtxaKTFNg
const basicSearchHelperRecursion = (
  response,
  excludedPlaces,
  excludedTypes,
  params,
  category
) => ({
  results: mapSearchResultsToEntities(
    response,
    20,
    category,
    excludedTypes
  ).filter(result => !excludedPlaces.map(entity => entity.id).includes(result)),
  moreDataFunction: async () =>
    basicSearchHelperRecursion(
      await doRequest('textsearch', {
        ...params,
        pagetoken: response.next_page_token
      }),
      excludedPlaces,
      excludedTypes,
      params,
      category
    )
});

const basicSearch = async (
  query,
  location,
  types,
  excludedTypes,
  excludedPlaces,
  category
) =>
  basicSearchHelperRecursion(
    await doRequest('textsearch', {
      location,
      query,
      type: types.join('|')
    }),
    excludedPlaces,
    excludedTypes,
    {
      query,
      location
    },
    category
  );

// Response example:
// https://maps.googleapis.com/maps/api/place/textsearch/json?key=API_KEY_HERE&location=32.0853%2C34.7818&query=mac&type=restaurant
exports.searchPlace = async ({ query, types, excludedTypes, category }) =>
  (await basicSearch(
    query,
    getLocationParam(),
    types,
    excludedTypes,
    [],
    category
  )).results;

// Response example:
// https://maps.googleapis.com/maps/api/place/textsearch/json?key=API_KEY&location=32.0853%2C34.7818&type=restaurant
exports.searchWithoutQuery = async ({
  excludedPlaces,
  types,
  excludedTypes,
  category
}) => {
  const ret = await basicSearch(
    '',
    getLocationParam(),
    types,
    excludedTypes,
    excludedPlaces,
    category
  );
  ret.results = ret.results.map(result => ({
    ...result,
    subtitle: 'Near you'
  }));
  return ret;
};
