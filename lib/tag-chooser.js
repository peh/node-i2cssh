const AWS = require('aws-sdk');
AWS.config.setPromisesDependency(null);
const inquirer = require("inquirer");
const fuzzy = require('fuzzy');
const ec2 = new AWS.EC2();


const TAG_FILTERS = {
  Filters: [{
    Name: 'resource-type',
    Values: [
      'instance',
      'reserved-instances',
    ]
  }],
  MaxResults: 5000
};

inquirer.registerPrompt('autocomplete', require('inquirer-autocomplete-prompt'));

module.exports = class TagChooser {
  constructor(config) {
    if (!config.aws) {
      throw "AWS is not configured. check your config. see https://github.com/peh/node-i2cssh/blob/master/README.md#ec2-integration for help"
    }

    this.config = config;
  }

  async start() {
    let tags = this.parseTagResults(await ec2.describeTags(TAG_FILTERS).promise(), this.config);

    let answers = await this.ask(tags);

    return answers.map((a) => {
      return {Name: `tag:${a.tagKey}`, Values: [a.tagValue]}
    });
  }

  async ask(tags, soFar = []) {
    let keys = tags.map(t => t.key).filter((v, i, s) => s.indexOf(v) === i);
    let answer = await inquirer.prompt([
      { // choose key
        type: 'autocomplete',
        pageSize: 10,
        name: 'tagKey',
        message: 'please choose a Tag key',
        source: (answersSoFar, input) => {
          return new Promise((resolve) => {
            let fuzzyResult = fuzzy.filter(input, keys);
            resolve(fuzzyResult.map((el) => {
              if (typeof el === "string") {
                return el
              }
              return el.original
            }));
          })
        }
      },
      { // choose value
        type: 'autocomplete',
        pageSize: 10,
        name: 'tagValue',
        message: 'please choose a Tag value',
        source: (answers, input) => {
          return new Promise((res) => {
            let vals = tags.filter(t => t.key === answers.tagKey).sort((a, b) => a.value.localeCompare(b.value));
            let i = input ? input.split(" ").join("") : "";

            let fuzzyResult = fuzzy.filter(i, vals, {extract: (e) => e.value});

            res(fuzzyResult.map((el) => {
              if (el.value) {
                return el.value
              }
              return el.original
            }));
          })
        }
      }
    ]);
    soFar.push(answer);

    if (this.config.skipConfirm) {
      return soFar;
    }
    let check = await inquirer.prompt([{ // choose key
      type: 'confirm',
      name: 'c',
      message: 'Connect now?'
    }]);
    if (check.c) {
      return soFar
    } else {
      return await this.ask(tags, soFar)
    }
  }

  parseTagResults(data, config) {
    let only = null;
    if (config.aws.only && config.aws.only.length > 0) {
      only = config.aws.only
    }
    let ignore = null;
    if (config.aws.ignoreTagValue) {
      ignore = new RegExp(config.aws.ignoreTagValue, ["i"]);
    }

    let results = [];
    // filter and bring into a proper format
    data.Tags
      .forEach((o) => {
        if (ignore && ignore.exec(o.Value) != null) {
          return null
        }
        if (only === null || ~only.indexOf(o.Key)) {
          let n = new AwsTag(o.Key, o.Value);
          let possibleMatch = results.find(r => r.equalsTo(n));
          if (!possibleMatch) {
            results.push(n)
          }
        }
      });

    return results.sort((a, b) => a.key.localeCompare(b.key))
  }
};


/**
 * Just a helper class to handle Tags a bit nicer
 */
class AwsTag {

  constructor(key, value) {
    this.key = key;
    this.value = value
  }

  equalsTo(o) {
    return this.key === o.key && this.value === o.value
  }
}
