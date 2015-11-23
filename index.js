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

var argv = require('yargs')
  .alias('C', 'config')
  .alias('c', 'clusters')
  .alias('t', 'tag')
  .alias('h', 'help')
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

function parseTags(tags, hostnames) {
  var filters = []
  if (typeof tags == "string") {
    filters.push(getFilter(tags))
  } else {
    _.each(tags, function(tag) {
      filters.push(getFilter(tag))
    })
  }
  return new Promise(function(resolve, reject) {
    var hostnames = []
    var checkField = "PublicDnsName"
    if (config.aws.usePrivateDns) {
      checkField = "PrivateDnsName"
    }
    new EC2().describeInstances({
      Filters: filters
    }, function(error, data) {
      if (!error) {
        _.each(data.Reservations, function(res) {
          _.each(res.Instances, function(instance) {
            hostnames.push(instance[checkField])
          })
        });
        if (hostnames.length > 0) {
          resolve(hostnames);

        } else {
          reject(Error("no hostnames found for the given tag"));
        }
      } else {
        reject(error);
      }
    });
  });
}

function getFilter(tagString) {
  var splitted = tagString.split('_')
  var tagKey = splitted[0]
  var tagValue = splitted[1]
  var values = {}
  return {
    Name: "tag:" + tagKey,
    Values: [tagValue],
    //"resource-type": 'instance'
  }
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
    promises.push(parseTags(argv.t))
  }

  if (argv.c) {
    promises.push(parseClusters(argv.c))
  }
  
  if (argv.h) {
     console.log("-C  --  YAML config file to use\n" + "-c name  --  pass in a cluster name defined in your config file\n" + "-t name  --  ec2 tag to connect to")
  }
  
  if (argv = null ) {
     console.log("-C  --  YAML config file to use\n" + "-c name  --  pass in a cluster name defined in your config file\n" + "-t name  --  ec2 tag to connect to")
  }

  Promise.all(promises).then(function(results) {
    hosts = _.uniq(hosts.concat(_.flatten(results)))
    action(hosts)
  }, function(errors) {
    console.log(errors)
  })
}

run()
