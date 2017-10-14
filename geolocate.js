// Override this to give the library a geographical context.
exports.get = function() {
  return { coords: null };
};
