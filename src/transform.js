'use strict';

const { transformAsync, template, types } = require('@babel/core');
const t = types;

exports.transform = (code) => {
  return transformAsync(code, {
    plugins: [wrapCode, injectLoops]
  }).then((res) => res.code);
};

const wrapCode = () => {
  const run = [];
  return {
    visitor: {
      Program(path) {
        if (!run.includes(this)) {
          run.push(this);
          const wrapped = buildWrapper({ body: path.node.body });
          path.replaceWith(t.program(wrapped));
        }
      }
    }
  };
};

const injectLoops = () => {
  return {
    visitor: {
      Loop(path) {
        injection(path);
      }
    }
  };
};

/*****************************************************************************
  Wrapper around %%body%% of input code
*****************************************************************************/

const buildWrapper = template(`
  'use strict';
  const { fgLog, fgTimer } = fgPublic;
  const { setImmediatePromise, sendError } = fgInternal;
  fgPublic = undefined;
  fgInternal = undefined;
  (async () => {
    try {
      %%body%%
    } catch (err) {
      sendError({ error: err.message ? err.message : err, uuid });
    }
  })();
`);

/*****************************************************************************
  INPUT: 
    while(true) {}

  OUTPUT:
    var _timer;
    _timer = Date.now();
    while (true) {
      if (Date.now() > _timer + 3000) throw "ERROR: Infinite loop detected";
      await setImmediatePromise();
    }
*****************************************************************************/

const injection = (path) => {
  const timerName = path.scope.generateUidIdentifier('timer');
  const timerDeclaration = t.declareVariable(timerName);
  path.scope.parent.push(timerDeclaration);

  const timerInit = t.assignmentExpression('=', timerName, dateNow());
  path.insertBefore(t.expressionStatement(timerInit));

  const setImmediatePromise = t.callExpression(t.identifier('setImmediatePromise'), []);
  const doAwait = t.awaitExpression(setImmediatePromise);
  path.get('body').unshiftContainer('body', t.expressionStatement(doAwait));

  const elapsedTime = t.binaryExpression('+', timerName, t.numericLiteral(3000));
  const condition = t.binaryExpression('>', dateNow(), elapsedTime);
  const resultError = t.throwStatement(t.stringLiteral('ERROR: Infinite loop detected'));
  const doTimeout = t.ifStatement(condition, resultError);
  path.get('body').unshiftContainer('body', doTimeout);
};

const dateNow = () => {
  const expression = t.memberExpression(t.identifier('Date'), t.identifier('now'));
  return t.callExpression(expression, []);
};
