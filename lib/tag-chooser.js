var AWS = require('aws-sdk');
var EC2 = AWS.EC2;
var _ = require('lodash');
var inquirer = require("inquirer");

var TAG_FILTERS = {
  Filters: [{
    Name: 'resource-type',
    Values: [
      'instance',
      'reserved-instances',
    ]
  }],
  MaxResults: 5000
};

module.exports = function (config) {
  var ec2 = new EC2();
  return new Promise(function (resolve, reject) {
    ec2.describeTags(TAG_FILTERS, function (err, data) {
      if (err) {
        reject(err)
      } else {
        var tags = parseTagResults(data, config);
        inquirer.prompt([{ // choose key
          type: 'list',
          pageSize: 10,
          name: 'tagKey',
          message: 'please choose a Tag key',
          choices: _.uniq(_.map(tags, 'key')).sort()
        }, { // choose value
          type: 'list',
          pageSize: 10,
          name: 'tagValue',
          message: 'please choose a Tag value',
          choices: function (answer) {
            return getValueForKeyAnswer(answer, tags);
          }
        }], function (answer) {
          var tagKey = answer.tagKey;
          var tagValue = answer.tagValue;
          var hostnames = [];
          var checkField = "PublicDnsName";
          if (config.aws.usePrivateDns) {
            checkField = "PrivateDnsName"
          }
          ec2.describeInstances({
            Filters: [{
              Name: "tag:" + tagKey,
              Values: [tagValue],
            }]
          }, function (error, data) {
            if (!error) {
              _.each(data.Reservations, function (res) {
                _.each(res.Instances, function (instance) {
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
    });
  });
}

function getValueForKeyAnswer(answer, tags) {
  return _.sortBy(_.filter(tags, function (t) {
    return t.key === answer.tagKey
  }), 'value');
}

function parseTagResults(data, config) {
  var only = [];
  if (config.aws.only) {
    only = config.aws.only
  }
  var ignore = null;
  if (config.aws.ignoreTagValue) {
    ignore = new RegExp(config.aws.ignoreTagValue, ["i"]);
  }

  var map = _.map(data.Tags, function (o) {
    if (ignore && ignore.exec(o.Value) != null) {
      return null
    }
    if (only && only.length > 0 && only.indexOf(o.Key) >= 0) {
      return {
        key: o.Key,
        value: o.Value,
      }
    }
  });
  return _.uniqBy(_.pullAll(map, [undefined, null]), function (o) {
    return o.key + o.value
  })
}
