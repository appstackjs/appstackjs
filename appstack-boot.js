#!/usr/bin/env node

// man -l docs/appstack.1  # Learn about appstack-boot.js

const BOOT_VERSION = "0.1.0";

const STDERR_COLORS = process.stderr.getColorDepth();

if (process.argv.length <= 2) {
  switch (STDERR_COLORS) {
  case 4:
    console.error("Usage: appstack <app-main> [OPTIONS...]\n\x1b[31merror:\x1b[0m no main file passed.");
    break;
  case 8:
  case 24:
    console.error("Usage: appstack <app-main> [OPTIONS...]\n\x1b[38;5;161merror:\x1b[0m no main file passed.");
    break;
  default:
    console.error("Usage: appstack <app-main> [OPTIONS...]\nerror: no main file passed.");
  }
  
  process.exit(126);
}

// REQUIRE DEPENDENCIES
const child_process = require("child_process");
const path = require("path");
const SysCall = require("./parallel/lib/syscall.js");
const package = require(path.resolve(__dirname, "package.json"));
const Parser = require("./internals/clarg-parser.js");

let p = new Parser("appstack", {
    explain: "Perform various actions on appstack applications",
    help_command: true,
    tail_txt: "If you find a bug, please open an issue on GitHub. Thanks!"
  }).
  option("--version", {
    option: false,
    attr: "version",
    help: "Display the AppStack Engine and Bootloader versions and exit",
  }).
  subparser(new Parser("run", {
    explain: "Run AppStack Node.js production applications",
    tail_txt: "If you find a bug, please open an issue on GitHub. Thanks!"
  }).
    option("-c", "--config", {
      option: true,
      attr: "config",
      default_: "appstack.json",
      help: "Set the JSON configuration file to use for the application",
    }).
    option("--brief", {
      option: false,
      attr: "verbose",
      value: false,
      default_: false,
      help: "Print brief output"
    }).
    option("-v", "--verbose", {
      option: false,
      attr: "verbose",
      value: true,
      default_: false,
      help: "Print verbose output.  Must be specified explicitly"
    }));

let args = p.run(["appstack", ...process.argv.slice(2)]);
//console.log(args);
//process.exit(0);

if (args.errors.length) {
  for (let i = 0; i < args.errors.length; ++i) {
    console.error("error: " + args.errors[i]);
  }

  process.exit(1);
}

switch (args.options.__subparse) {
case "run":
  let config, absolute_path = path.resolve(process.env.PWD, args.options.__subopt.config);
  
  try {
    config = require(absolute_path);
  } catch(e) {
    console.error("error: no such config file: " + args.options.__subopt.config);
    process.exit(1);
  }

  // COMPILE INFORMATION FOR RUNTIME
  const APP_ARGS = process.argv.slice(args.leftover + 1);

  console.error("AppStack Engine v" + package.version + ", AppStack Bootloader v" + BOOT_VERSION);

  const AppManager = require("./internals/app-manager.js");

  // Start up
  let manager = new AppManager(path.resolve(__dirname, "parallel/lib/app-main-launcher.js"), APP_ARGS, config, absolute_path.split("/").slice(0, -1).join("/"));

  manager.app.on("message", (msg)=>{
    if (msg.call === SysCall.STAT) {
      manager.statistic(msg.realm, msg.message, msg.time);
    }
  });

  process.on("SIGINT", ()=>{
    manager.close(130, "caught SIGINT");
  });
  break;
}

