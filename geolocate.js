// Override this to give the library a geographical context.
exports.get = function() {
  return { coords: null };
};

exports.setGeolocate = function(func) {
  exports.get = func;
};
