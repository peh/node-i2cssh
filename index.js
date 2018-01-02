#!/usr/bin/env node

const AWS = require("aws-sdk");
const _ = require("lodash");
const path = require("path");
const file = path.resolve(__dirname, "lib/i2cssh.js");
const yaml = require("js-yaml");
const fs = require("fs");
const parseTags = require("./lib/parse-tags.js");

const argv = require("yargs")
  .alias("C", "config")
  .alias("c", "clusters")
  .alias("t", "tag")
  .alias("b", "broadcast")
  .alias("u", "user").argv;

const I2CSSH_CONFIG_FILE = path.join(process.env.HOME, "/.i2csshrc");
const promises = [];

let config = {};
let hosts = argv._;

function action(cmd, runConfig) {
  cmd.unshift("osascript", "-l", "JavaScript", file);
  cmd.push("'" + JSON.stringify(runConfig) + "'");
  require("child_process").exec(cmd.join(" "));
}

function checkOptionalParameters(config, runConfig) {
  if (config.broadcast === true) {
    runConfig.broadcast = true;
  }
  if (config.direction !== undefined) {
    runConfig.direction = config.direction;
  }
}

function initConfig() {
  var result = {};
  if (config.aws) {
    AWS.config.update(config.aws);
  } else {
    AWS.config.update({
      region: "us-west-1"
    });
  }
  if (config.broadcast === true) {
    result.broadcast = true;
  }

  return result;
}

function parseClusters(clusters, runConfig) {
  let result = [];
  if (typeof clusters === "string") {
    clusters = [clusters];
  }
  const configuredClusters = config.clusters || {};
  checkOptionalParameters(configuredClusters, runConfig);
  return new Promise(function (resolve) {
    clusters.forEach((cluster) => {
      const fromConf = configuredClusters[cluster];
      if (!fromConf) {
        console.error(cluster + " is not configured and is being ignored");
      } else if (!fromConf.hosts) {
        console.error(cluster + " has no hosts configured.");
      } else {
        checkOptionalParameters(fromConf, runConfig);
        result = result.push(fromConf.hosts);
      }
    });
    resolve(result);
  });
}

function run() {
  let configFileLocation;
  if (argv.C) {
    configFileLocation = argv.C;
  } else if (fs.existsSync(I2CSSH_CONFIG_FILE)) {
    configFileLocation = I2CSSH_CONFIG_FILE;
  }

  if (configFileLocation) {
    config = yaml.safeLoad(fs.readFileSync(configFileLocation, "utf8"));
  }

  initConfig();

  if (argv.b) {
    config.broadcast = true;
  }

  if (argv.t) {
    promises.push(parseTags(argv.t, config));
  }

  if (argv.c) {
    promises.push(parseClusters(argv.c, config));
  }

  if (argv.u) {
    config.user = argv.u;
  }

  Promise.all(promises).then(
    function (results) {
      hosts = _.uniq(hosts.concat(_.flatten(results)));
      if (hosts && hosts.length > 0) {
        action(hosts, config);
      } else {
        console.error("No hosts defined or found for the given filters")
      }
    },
    function (errors) {
      console.error(errors);
    }
  );
}

run();
