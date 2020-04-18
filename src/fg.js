'use strict';

const fgPublic = {
  fgLog: console.log,
  fgTimer: setInterval
};

const fgInternal = {
  setImmediatePromise: () => {
    return new Promise((resolve) => {
      setImmediate(() => resolve());
    });
  },
  sendError: ({ error, uuid = '' }) => {
    process.send({ error, uuid });
  }
};

module.exports = {
  fgPublic,
  fgInternal
};
