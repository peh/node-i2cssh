#!/usr/bin/env node
var argv = require('yargs').argv;
var fileExists = require('file-exists');
var AWS = require('aws-sdk');
var EC2 = AWS.EC2;
var _ = require('lodash');
var util = require('util');
var config = {};
var path = require('path');
var file = path.resolve(__dirname, 'lib/i2cssh.js');

var I2CSSH_CONFIG_FILE = process.env.HOME+'/.i2csshrc';

if(fileExists(I2CSSH_CONFIG_FILE)) {
	config = require(I2CSSH_CONFIG_FILE);
	initConfig();
}

var hosts = argv._

if(argv.t) {
	var fromTags = parseTags(argv.t, hosts);
} else {
	action(hosts)
}

function action(hostnames){
	hostnames.unshift('osascript', '-l', 'JavaScript', file)	
	require('child_process').exec(hostnames.join(" "))
}

function initConfig(){
	if(config.aws) {
		AWS.config.update(config.aws)
	} else {
		AWS.config.update({region: 'us-west-1'})
	}
}

function parseTags(tags, hostnames){
	var filters = []
	if(typeof tags == "string"){
		filters.push(getFilter(tags))
	} else {
		_.each(tags, function(tag){
			filters.push(getFilter(tag))
		})
	}
	new EC2().describeInstances({Filters: filters}, function(error, data) {
		if(!error){
			_.each(data.Reservations, function(res){
				_.each(res.Instances, function(instance){
					if(config.aws.usePrivateDns) {
						hostnames.push(instance.PrivateDnsName)
					} else {
						hostnames.push(instance.PublicDnsName)
					}
				})
			});
			if(hostnames.length > 0) {
				action(hostnames);
			} else {
				console.log("no hostnames found for the given tag")
			}
		} else {
			console.log(error)
		}
	});
}

function getFilter(tagString){
	var splitted = tagString.split('_')
	var tagKey = splitted[0]
	var tagValue = splitted[1]
	var values = {}
	return {
      Name: "tag:"+tagKey,
      Values: [tagValue],
      //"resource-type": 'instance'
    }
}
