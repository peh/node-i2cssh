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
  .argv;

var I2CSSH_CONFIG_FILE = process.env.HOME + '/.i2csshrc';
var hosts = argv._
var promises = []

function action(hostnames) {
  hostnames.unshift('osascript', '-l', 'JavaScript', file)
  require('child_process').exec(hostnames.join(" "))
}

function initConfig() {
  if (config.aws) {
    AWS.config.update(config.aws)
  } else {
    AWS.config.update({
      region: 'us-west-1'
    })
  }
}

function parseClusters(clusters) {
  var result = []
  if (typeof clusters === 'string') {
    clusters = [clusters]
  }
  var configuredClusters = config.clusters || {}
  return new Promise(function(resolve, reject) {
    _.each(clusters, function(cluster) {
      var fromConf = configuredClusters[cluster]
      if (!fromConf) {
        console.log(cluster + " is not configured and is being ignored")
      } else if (!fromConf.hosts) {
        console.log(cluster + " has no hosts configured.")
      } else {
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

  if (argv.t) {
    promises.push(parseTags(argv.t, config))
  }

  if (argv.c) {
    promises.push(parseClusters(argv.c))
  }

  Promise.all(promises).then(function(results) {
    hosts = _.uniq(hosts.concat(_.flatten(results)))
      action(hosts)
  }, function(errors) {
    console.log(errors)
  })
}

run()