exports.AsyncStorage = null;

let cache = null;

const makeSureCacheIsLoaded = async function() {
  if (cache) {
    return;
  }
  cache = {};
  if (!exports.AsyncStorage) {
    console.warn('no AsyncStorage provided, cache will not outlive runtime');
    return;
  }
  const res = await exports.AsyncStorage.getItem('cache');
  cache = JSON.parse(res) || {};
};

exports.makeCachedFunction = (
  callback,
  name,
  importantParamsIndexes,
  ttl = 1000 * 60 * 60 * 24 /* one day */
) => async (...params) => {
  await makeSureCacheIsLoaded();
  if (!cache[name]) {
    cache[name] = {};
  }

  const importantParams = importantParamsIndexes
    ? params.filter((param, i) => importantParamsIndexes.includes(i))
    : params;

  const paramsString = JSON.stringify(importantParams);

  if (
    !cache[name][paramsString] ||
    Date.now() > ttl + cache[name][paramsString].time
  ) {
    // Not in cache / invalidated.
    console.log('cache-miss', name);

    // Make sure only one call is issued.
    const promise = callback(...params);
    cache[name][paramsString] = {
      time: Date.now(),
      promise
    };

    try {
      const res = await promise;
      Object.assign(cache[name][paramsString], { res, ttl });
      if (exports.AsyncStorage) {
        exports.AsyncStorage.setItem('cache', JSON.stringify(cache));
      }
      return res;
    } catch (err) {
      cache[name][paramsString] = null;
      throw err;
    }
  }

  // In cache.
  console.log('cache-hit', name);
  return cache[name][paramsString].res || cache[name][paramsString].promise;
};
