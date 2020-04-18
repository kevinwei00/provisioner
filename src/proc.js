'use strict';

const { VM } = require('vm2');
const { fgPublic, fgInternal } = require('./fg');
const { transform } = require('./transform');

// having a listener means child process won't die at end of execution
process.on('message', async (msg) => {
  const { script, error } = msg;

  if (error) {
    fgInternal.sendError({ error });
    killProcess();
  } else if (script) {
    try {
      const _code = await transform(script.code);
      const _timeOut = parseInt(script.timeOut);
      runCode(script.uuid, _code, script.context, _timeOut);
    } catch (err) {
      fgInternal.sendError({ error: err.message, uuid });
    }
  }
});

const runCode = (uuid, code, context, timeOut) => {
  try {
    console.log(`
------------------------------------------------------------------------------------------------------------
Running script '${uuid}'
------------------------------------------------------------------------------------------------------------
${code}
============================================================================================================`);

    const vm = new VM({
      sandbox: { ...context, uuid }
      // timeout: timeOut
    });
    vm.freeze(fgInternal, 'fgInternal');
    vm.freeze(fgPublic, 'fgPublic');
    vm.run(code);
  } catch (error) {
    fgInternal.sendError({ error: `VM Runtime Error: ${error}`, uuid });
  }
};

const killProcess = () => {
  process.exit();
};
