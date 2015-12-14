#!/usr/bin/env node

var fileExists = require('file-exists');
var AWS = require('aws-sdk');
var EC2 = AWS.EC2;
var _ = require('lodash');
var util = require('util');
var config = {};
var path = require('path');
var file = path.resolve(__dirname, 'lib/i2cssh.js');
var yaml = require('js-yaml');
var fs = require('fs');
var parseTags = require('./lib/parse-tags.js')

var argv = require('yargs')
  .alias('C', 'config')
  .alias('c', 'clusters')
  .alias('t', 'tag')
  .alias('b', 'broadcast')
  .argv;

var I2CSSH_CONFIG_FILE = process.env.HOME + '/.i2csshrc';
var hosts = argv._
var promises = []

function action(cmd, runConfig) {
  cmd.unshift('osascript', '-l', 'JavaScript', file)
  cmd.push("'" + JSON.stringify(runConfig) + "'")
  require('child_process').exec(cmd.join(" "))
}

function checkOptionalParameters(config, runConfig) {
  if (config.broadcast === true) {
    runConfig.broadcast = true
  }
  if (config.direction !== undefined) {
    runConfig.direction = config.direction
  }
}

function initConfig() {
  var result = {}
  if (config.aws) {
    AWS.config.update(config.aws)
  } else {
    AWS.config.update({
      region: 'us-west-1'
    })
  }
  if (config.broadcast === true) {
    result.broadcast = true
  }
  return result
}

function parseClusters(clusters, runConfig) {
  var result = []
  if (typeof clusters === 'string') {
    clusters = [clusters]
  }
  var configuredClusters = config.clusters || {}
  checkOptionalParameters(configuredClusters, runConfig)
  return new Promise(function(resolve, reject) {
    _.each(clusters, function(cluster) {
      var fromConf = configuredClusters[cluster]
      if (!fromConf) {
        console.error(cluster + " is not configured and is being ignored")
      } else if (!fromConf.hosts) {
        console.error(cluster + " has no hosts configured.")
      } else {
        checkOptionalParameters(fromConf, runConfig)
        result = result.concat(fromConf.hosts)
      }
      resolve(result)
    })
  });
}

function run() {
  var configFileLocation
  if (argv.C) {
    configFileLocation = argv.C
  } else if (fileExists(I2CSSH_CONFIG_FILE)) {
    configFileLocation = I2CSSH_CONFIG_FILE
  }

  if (configFileLocation) {
    config = yaml.safeLoad(fs.readFileSync(configFileLocation, 'utf8'));
  }

  initConfig()

  if (argv.b) {
    config.broadcast = true
  }

  if (argv.t) {
    promises.push(parseTags(argv.t, config))
  }

  if (argv.c) {
    promises.push(parseClusters(argv.c, config))
  }

  Promise.all(promises).then(function(results) {
    hosts = _.uniq(hosts.concat(_.flatten(results)))
    action(hosts, config)
  }, function(errors) {
    console.error(errors)
  })
}

run()