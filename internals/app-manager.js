const EventEmitter = require("events");
const child_process = require("child_process");
const { performance } = require("perf_hooks");
// Not part of the standard library, but if you have this library, its almost a
// guarantee you have npm, and by consequence, this package.
const semver = require("semver");
const path = require("path");
const v8 = require("v8");
const fs = require("fs");

const MessageType = require("../parallel/lib/message-type.js");
const SysCall = require("../parallel/lib/syscall.js");
const info = require("../package.json");

function now() {
  // 1's place is milliseconds, though this can be accurate to below microseconds.
  return performance.now() + performance.timeOrigin;
}

class AppManager extends EventEmitter {
  #exec;
  #main;
  #args;
  #config;

  #child;

  constructor(exec, args, config, dir) {
    super();

    config = {
      main: "index.js",
      version: "1.0.0",
      "appstack-version": ">=1.0.0",
      fsio: {},
      segments: {},
      ...config
    };

    if (config.name == undefined) throw new Error("configuration does not specify an application name");
    
    if (!semver.satisfies(info.version, config["appstack-version"])) {
      throw new Error("application `" + config.name + "` does not support this appstack version");
    }

    config.fsio = {
      statdump: "/tmp/" + config.name.replace(/[\/\\]/g, "") + "/stats",
      crashdump: "/tmp/" + config.name.replace(/[\/\\]/g, "") + "/crashes",
      ...config.fsio
    };

    if (!fs.existsSync(config.fsio.statdump)) fs.mkdirSync(config.fsio.statdump, { recursive: true });
    if (!fs.existsSync(config.fsio.crashdump)) fs.mkdirSync(config.fsio.crashdump, { recursive: true });
    
    this.#exec = exec;
    this.#main = path.resolve(dir, config.main);
    this.#args = args;
    this.#config = config;

    this.#main = path.resolve(process.env.PWD, this.#main);

    config.segments.file = path.resolve(dir, config.segments.file);

    this.#child = child_process.fork(exec, args, {
      cwd: process.cwd(),
      env: {
        ...process.env,
        __APPSTACK_BOOT_MAIN_SCRIPT: this.#main,
        __APPSTACK_SEGMENT_CONFIG: v8.serialize(config.segments).toString("hex")
      },
      detached: true,
      serialization: "advanced",
      stdio: [0, 1, 2, "ipc"],
    });
  }

  async statistic(realm, data, time) {
    let realm_dir = path.resolve(this.#config.fsio.statdump, realm);
    if (!fs.existsSync(realm_dir)) fs.mkdirSync(realm_dir);
    
    for (let line in data) {
      let serial = Buffer.allocUnsafe(16);
      serial.writeDoubleLE(time, 0);
      serial.writeDoubleLE(data[line], 8);

      fs.appendFileSync(realm_dir + "/" + line + ".stats", serial);
    }
  }

  get app() {
    return this.#child;
  }

  close(code=0, reason="unspecified", cb) {
    this.#child.send({
      type: MessageType.SYSTEM,
      call: SysCall.CLOSE,
      time: now(),
      pid: process.pid,
      code,
      reason,
    }, cb);
  }
}

module.exports = AppManager;

