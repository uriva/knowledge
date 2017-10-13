// Override this to give the library a geographical context.
exports.geolocate = function() {
  return { coords: null };
};
