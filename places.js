const { makeCachedFunction } = require('./cache');
const geolib = require('geolib');
const geolocate = require('./geolocate');
let TOKEN;

exports.init = function() {
  TOKEN = require('./tokens').tokens.gmaps;
};

const makeUrlWithParams = function(action, params, parseJson) {
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

const doRequest = function(action, params, parseJson = true) {
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

// Response example:
// https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=CnRtAAAATLZNl354RwP_9UKbQ_5Psy40texXePv4oAlgP4qNEkdIrkyse7rPXYGd9D_Uj1rVsQdWT4oRz4QrYAJNpFX7rzqqMlZw2h2E2y5IKMUZ7ouD_SlcHxYq1yL4KbKUv3qtWgTK0A6QbGh87GB3sscrHRIQiG2RrmU_jF4tENr9wGS_YxoUSSDrYjWmrNfeEHSGSc3FyhNLlBU&key=maxwidth=400
const getPictureSource = (result, maxwidth = 500) =>
  result.photos && result.photos.length
    ? makeUrlWithParams(
        'photo',
        { photoreference: result.photos[0].photo_reference, maxwidth },
        false
      )
    : undefined;

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

const cachedPlaceInfo = makeCachedFunction(doRequest, 'placeInfoDetails');

// Response example:
// https://maps.googleapis.com/maps/api/place/details/json?key=AIzaSyCCQr7iOj-Iy4szW84s0f1jo1MBknJ1_Ws&placeid=ChIJEScAUn9MHRURzG4ggK8ID4Y
exports.placeInfo = async placeid => {
  const currentLocation = geolocate.get();
  const placeInfoResponse = await cachedPlaceInfo('details', { placeid });
  if (!placeInfoResponse.result) {
    return Promise.reject();
  }
  placeInfo = placeInfoResponse.result;
  return {
    id: placeid,
    title: placeInfo.name,
    category: 'restaurants',
    link: placeInfo.url,
    description: createDescription(placeInfo, currentLocation),
    locationComplete: currentLocation.coords,
    bigPictureSource: getPictureSource(placeInfo),
    smallPictureSource: getPictureSource(placeInfo, 100)
  };
};

const mapSearchResultsToEntities = (response, limit) =>
  !response.results
    ? []
    : response.results.slice(0, limit || 5).map(result => ({
        id: result.place_id,
        title: result.name,
        category: 'restaurants',
        description: createDescription(result, geolocate.get()),
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

const innerSearchPlace = async (query, location) => {
  return await doRequest('textsearch', {
    location,
    query,
    type: 'restaurant'
  });

  return response;
};

// Response example:
// https://maps.googleapis.com/maps/api/place/textsearch/json?key=API_KEY_HERE&location=32.0853%2C34.7818&query=mac&type=restaurant
exports.searchPlace = async query =>
  mapSearchResultsToEntities(await innerSearchPlace(query, getLocationParam()));

const getResultsWithNextPageFunction = (
  response,
  existingEntities,
  params
) => ({
  results: mapSearchResultsToEntities(response, 20).filter(
    result => !existingEntities.map(entity => entity.id).includes(result)
  ),
  moreDataFunction: () =>
    searchWithParams(existingEntities, {
      ...params,
      pagetoken: response.next_page_token
    })
});

// Response example:
// https://maps.googleapis.com/maps/api/place/textsearch/json?key=API_KEY_HERE&location=32.0853%2C34.7818&type=restaurant&pagetoken=CpQCBwEAAGjYNql6iKPC2kOaCtS4Lc4tyj42ak9WZy2h6isCJWEUY9TQUpAh1Vwf35M0MC2qf9l1zJVgrnEqIt5GPYaM3dw2EiwgM1EEr--upS0FoKvv94jN3ACJVYTmrgA0SzguL-Np4AkJ704ngw1wKfdMaWvbvjVEiBlA3OUtPY3-zrichl-JaMerl0d_1FHzyRnyxBYWuKEEG-3S6FjaQOh-0Ks4lekJZiYW6NhD2QX3OVDFMNlpGs-88j-_3KT4AnUqzoC6KjUnE4GCY2-BdTGPW6hmNCXq2XIYtpsQ3xquT7iJb_C5N1lOSZebR-DLbwrDS7zkw_yDgapqr-yoeqVK0Jt9tBEeHGups2fnaovL1CEkEhDfhtVHsmK1rSaqt9sHrELRGhToqlUePY-ABMZgIprHyJtxaKTFNg
const searchWithParams = async (existingEntities, params) =>
  getResultsWithNextPageFunction(
    await doRequest('textsearch', params),
    existingEntities,
    params
  );

// Response example:
// https://maps.googleapis.com/maps/api/place/textsearch/json?key=API_KEY&location=32.0853%2C34.7818&type=restaurant
exports.searchWithoutQuery = async existingEntities => {
  const location = getLocationParam();
  const ret = getResultsWithNextPageFunction(
    await innerSearchPlace(null, location),
    existingEntities,
    { type: 'restaurant', location }
  );
  ret.results = ret.results.map(result =>
    Object.assign(result, { subtitle: 'Near you' })
  );
  return ret;
};
