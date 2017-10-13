export default (makeRetryableFunction = (
  callback,
  name,
  retries = 5,
  wait = 1000 * 10
) => async (...params) => {
  const recursiveFunc = async retries => {
    try {
      const res = await callback(...params);
      return res;
    } catch (err) {
      if (retries == 0) {
        throw err;
      }
      console.log('retry occurred', name, retries);
      return await new Promise((resolve, reject) => {
        setTimeout(async () => {
          try {
            resolve(await recursiveFunc(retries - 1));
          } catch (err) {
            reject(err);
          }
        }, wait);
      });
    }
  };
  return await recursiveFunc(retries);
});
