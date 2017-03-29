var AWS = require('aws-sdk');
var EC2 = AWS.EC2;
var _ = require('lodash');
var tagChooser = require('./tag-chooser.js')

module.exports = function(tags, config) {
  if (tags === true) {
    return tagChooser(config)
  }
  var filters = []
  if (typeof tags == "string") {
    filters.push(getFilter(tags, config))
  } else {
    _.each(tags, function(tag) {
      filters.push(getFilter(tag, config))
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

function getFilter(tagString, config) {
  var sep = config.aws.nameValSeparator ? config.aws.nameValSeparator : "="
  var splitted = tagString.split(sep)
  var tagKey = splitted[0]
  var tagValue = splitted[1]
  var values = {}
  return {
    Name: "tag:" + tagKey,
    Values: [tagValue],
    //"resource-type": 'instance'
  }
}
