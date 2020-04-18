'use strict';

const { fork } = require('child_process');
const { EventEmitter } = require('events');
const pidusage = require('pidusage');

class Provisioner extends EventEmitter {
  constructor(options = {}) {
    super();

    this.options = options;
    this.options.numProcesses = options.numProcesses ? options.numProcesses : 4;
    this.options.maxCPUTime = options.maxCPUTime ? options.maxCPUTime : 20; // ms
    this.options.CPUCheckInterval = options.CPUCheckInterval ? options.CPUCheckInterval : 100; // ms
    this.options.timeOut = options.timeOut ? options.timeOut : 500; // ms

    this.processes = {};

    this.forkProcesses(this.options.numProcesses);
  }

  forkProcesses = (num) => {
    num = num > 4 ? 4 : num;
    for (let i = 0; i < num; i++) {
      const proc = fork(__dirname + '/../src/proc.js', {
        env: {},
        execArgv: ['--max-old-space-size=1024']
      });
      this.processes[proc.pid] = { proc, scripts: [], cpuTime: 0 };

      proc.on('message', this.handleMessage); // handle messages from child process
      proc.on('exit', this.handleExit); // handle child process exiting
    }
    this.startCPUCheck();
    console.log(`Forked ${num} processes. Total ${Object.keys(this.processes).length} processes.`);
  };

  run = ({ uuid, code, context = {}, pid = 0 }) => {
    // if no pid supplied, use least worked process
    if (!pid) {
      let minCpuTime = Infinity;
      for (let p in this.processes) {
        if (this.processes[p].cpuTime < minCpuTime) {
          minCpuTime = this.processes[p];
          pid = p;
        }
      }
    }

    const fork = this.processes[pid];

    if (fork.cpuTime > this.options.maxCPUTime) {
      this.emit('error', 'ERROR: CPU has reached capacity');
      return;
    }

    if (!code) {
      this.emit('error', 'ERROR: No code to run', uuid);
      return;
    }

    const script = {
      uuid,
      code,
      context,
      timeOut: this.options.timeOut
    };

    fork.scripts.push(script);
    fork.proc.send({ script });
  };

  kill = (pid) => {
    process.kill(pid);
    delete this.processes[pid];
  };

  handleMessage = (msg) => {
    const { error, uuid } = msg;

    if (error) {
      this.emit('error', error, uuid);
    }
  };

  handleExit = () => {
    this.stopCPUCheck();

    // if process exited because it ran out of memory or
    // exceeded cpu time, find and remove it from the list
    for (let pid in this.processes) {
      const fork = this.processes[pid];
      if (!fork.proc.connected) {
        delete this.processes[pid];
        break;
      }
    }

    // start a replacement process
    this.forkProcesses(1);
  };

  startCPUCheck = () => {
    this.cpuCheckTimer = setInterval(this.checkCPU, this.options.CPUCheckInterval);
  };

  stopCPUCheck = () => {
    if (this.cpuCheckTimer) {
      clearInterval(this.cpuCheckTimer);
      this.cpuCheckTimer = null;
    }
  };

  checkCPU = async () => {
    for (let pid in this.processes) {
      const fork = this.processes[pid];
      const stat = await pidusage(pid);
      pidusage.clear();
      fork.cpuTime = stat.ctime * 0.001;

      // console.log(`Process ${pid}: ${fork.cpuTime}ms`);
      // console.log(`Process ${pid}: ${stat.memory / 1024 / 1024}mb`);

      if (fork.cpuTime > this.options.maxCPUTime) {
        fork.proc.send({ error: 'ERROR: CPU has reached capacity' });
      }
    }
  };
}

module.exports = {
  Provisioner
};
