'use strict';

const { Provisioner } = require('./src/provisioner');

const provisioner = new Provisioner({ numProcesses: 1 });

//*******************************************************************************************/
provisioner.on('error', (...args) => {
  console.error(`${args[1] ? `Script '${args[1]}' failed. ` : ''}${args[0]}`);
});
//*******************************************************************************************/
// let uuid = 'a1a1a';
// let code = `
//   let a = [];
//   for (let i = 0; i < 900000000; i++) {
//     a[i] = i;
//   }
// `;
// provisioner.run({ uuid, code });
//*******************************************************************************************/
// let uuid = 'b2b2b';
// let code = `
//   1 + 1;
// `;
// provisioner.run({ uuid, code });
//*******************************************************************************************/
let uuid = 'c3c3c';
let code = `
  while (true) {};
`;
provisioner.run({ uuid, code });
//*******************************************************************************************/
uuid = 'd4d4d';
code = `
  const start = Date.now();
  fgTimer(() => {
    const millis = Date.now() - start;
    fgLog(\`seconds elapsed = ${'${Math.floor(millis/1000)}'}\`);
  }, 1000);
`;
provisioner.run({ uuid, code });
//*******************************************************************************************/
// let uuid = 'e5e5e';
// let code = `
//   try {
//     fgLog(process);
//   }
//   catch (host_exception) {
//     let host_constructor = host_exception.constructor.constructor;
//     let host_context = host_constructor('return this')();
//     fgLog(Object.keys(host_context))
//     fgLog(host_context.fgInternal)
//     // let child_process = host_process.mainModule.require("child_process");
//     // fgLog(child_process.execSync("cat /etc/passwd").toString());
//   }
// `;
// provisioner.run({ uuid, code });
//*******************************************************************************************/
// for (let i = 0; i < 10000; i++) {
//   provisioner.run({ uuid, code });
// }
//*******************************************************************************************/
