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
	}]
}
module.exports = function(config) {
	var ec2 = new EC2()
	return new Promise(function(resolve, reject) {
		ec2.describeTags(TAG_FILTERS, function(err, data) {
			if (err) console.log(err, err.stack);
			var tags = parseTagResults(data);
			inquirer.prompt([{ // choose key
				type: 'list',
				name: 'tagKey',
				message: 'please choose a Tag key',
				choices: _.uniq(_.map(tags, 'key'))
			}, { // choose value
				type: 'list',
				name: 'tagValue',
				message: 'please choose a Tag key',
				choices: function(answer) {
					return getValueForKeyAnswer(answer, tags)
				}
			}], function(answer) {
				var tagKey = answer.tagKey
				var tagValue = answer.tagValue
				var hostnames = []
				var checkField = "PublicDnsName"
				if (config.aws.usePrivateDns) {
					checkField = "PrivateDnsName"
				}
				ec2.describeInstances({
					Filters: [{
						Name: "tag:" + tagKey,
						Values: [tagValue],
					}]
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
		});
	});
}

function getValueForKeyAnswer(answer, tags) {
	var tagKey = answer.tagKey
	var values = []
	_.each(tags, function(t) {
		if (t.key === tagKey)
			values.push(t.value)
	})
	return values;
}

function parseTagResults(data) {
	var map = _.map(data.Tags, function(o) {
		return {
			key: o.Key,
			value: o.Value,
		}
	});
	return _.uniq(map, function(o) {
		return o.name + o.value
	})
}