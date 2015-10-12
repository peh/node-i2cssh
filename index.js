#!/usr/bin/env node

var exec = require('child_process').exec;

var args = process.argv.slice(2)

args.unshift('osascript', '-l', 'JavaScript', 'lib/i2cssh.js')
console.log(args);
exec(args.join(" "))