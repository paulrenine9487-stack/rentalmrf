// Production Cross-Browser Polyfills (Safari, iOS Mobile, Chrome, Edge, Firefox)

// 1. Object.hasOwn (ES2022)
if (typeof Object.hasOwn !== 'function') {
  Object.hasOwn = function (object, property) {
    if (object == null) {
      throw new TypeError('Cannot convert undefined or null to object');
    }
    return Object.prototype.hasOwnProperty.call(Object(object), property);
  };
}

// 2. Array.prototype.at (ES2022)
if (!Array.prototype.at) {
  Array.prototype.at = function (n) {
    n = Math.trunc(n) || 0;
    if (n < 0) n += this.length;
    if (n < 0 || n >= this.length) return undefined;
    return this[n];
  };
}

// 3. String.prototype.replaceAll (ES2021)
if (!String.prototype.replaceAll) {
  String.prototype.replaceAll = function (search, replacement) {
    if (search instanceof RegExp) {
      return this.replace(search, replacement);
    }
    return this.split(search).join(replacement);
  };
}

// 4. Promise.allSettled (ES2020)
if (!Promise.allSettled) {
  Promise.allSettled = function (promises) {
    return Promise.all(
      promises.map((p) =>
        Promise.resolve(p).then(
          (value) => ({ status: 'fulfilled', value }),
          (reason) => ({ status: 'rejected', reason })
        )
      )
    );
  };
}

// 5. structuredClone fallback
if (typeof window !== 'undefined' && typeof window.structuredClone !== 'function') {
  window.structuredClone = function (obj) {
    return JSON.parse(JSON.stringify(obj));
  };
}
