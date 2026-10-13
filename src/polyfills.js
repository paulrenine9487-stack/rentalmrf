// Polyfill Object.hasOwn for browsers and environments lacking ES2022 support
if (typeof Object.hasOwn !== 'function') {
  Object.hasOwn = function (object, property) {
    if (object == null) {
      throw new TypeError('Cannot convert undefined or null to object');
    }
    return Object.prototype.hasOwnProperty.call(Object(object), property);
  };
}
