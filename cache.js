exports.AsyncStorage = null;

exports.ttl = 1000 * 60 * 60 * 24; // One day.

const promises = {};

exports.makeCachedFunction = (callback, name, importantParamsIndexes) => async (
  ...params
) => {
  const importantParams = importantParamsIndexes
    ? params.filter((param, i) => importantParamsIndexes.includes(i))
    : params;
  const paramsString = JSON.stringify(importantParams);
  const keyString = `cache-${name}-${paramsString}`;

  if (promises[keyString]) {
    console.log('cache-hit-promise', name);
    return promises[keyString];
  }

  const record = await exports.AsyncStorage.getItem(keyString);

  const now = Date.now();

  if (!record || (exports.ttl && now > exports.ttl + record.time)) {
    // Not in cache / invalidated.
    console.log('cache-miss', name);

    // Make sure only one call is issued.
    const promise = callback(...params);
    promises[keyString] = promise;

    try {
      const response = await promise;
      await exports.AsyncStorage.setItem(
        keyString,
        JSON.stringify({ response, time: now })
      );
      return response;
    } finally {
      promises[keyString] = null;
    }
  }

  // In cache.
  console.log('cache-hit', name);
  return record.response;
};
