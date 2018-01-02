const AWS = require('aws-sdk');
const EC2 = AWS.EC2;
const TagChooser = require('./tag-chooser.js');

module.exports = async function (tags, config) {
  const filters = [];

  if (tags === true) {
    let choosen = await new TagChooser(config).start();
    choosen.forEach((t) => {
      filters.push(t)
    });
  } else if (typeof tags === "string") {
    filters.push(getFilter(tags, config))
  } else {
    tags.forEach(t => {
      filters.push(getFilter(t, config))
    });
  }

  if (filters.length <= 0) {
    console.errors("no filters defined, aborting for your own good!")
  }

  const hostnames = [];
  const checkField = config.aws.usePrivateDns ? "PrivateDnsName" : "PublicDnsName";

  const params = {
    Filters: filters
  };

  let data = await new EC2().describeInstances(params).promise();
  data.Reservations.forEach(reservation => {
    reservation.Instances.forEach(instance => {
      hostnames.push(instance[checkField])
    })
  });
  return hostnames;
};

function getFilter(tagString, config) {
  const sep = config.aws.nameValSeparator ? config.aws.nameValSeparator : "=";
  const [tagKey, tagValue] = tagString.split(sep);
  return {
    Name: "tag:" + tagKey,
    Values: [tagValue],
  }
}
