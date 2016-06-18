var _    = require('lodash');
var util = require('util');
var request = require('request');

module.exports = commandStanfordEvents;

function commandStanfordEvents (tokenSlack, options) {
  this.tokenSlack = tokenSlack;
  this.options = options;
}

commandStanfordEvents.prototype.helpResponse = function (cb, output) {
  var output = {
    response_type: "ephemeral",
    text: output + 'You can get a list of today\'s events by entering: /se today'
  };
  cb(null, JSON.stringify(output));
}

commandStanfordEvents.prototype.postResponse = function (response_url, output) {
  request({
    url: response_url,
    method: "POST",
    json: true,
    body: output
  }, function (error, response, body){
    //console.log(response);
  });
}

commandStanfordEvents.prototype.findToday = function(response_url) {
  var handleObject = this;

  var attachments = [];

  var output = {
    response_type: "ephemeral",
    text: 'Events for: today ' + ' (' + '4' + ' results found)',
    attachments: attachments
  };

  // post back the results found
  handleObject.postResponse(response_url, output);
}

commandStanfordEvents.prototype.handle = function (req, res, cb) {
  var handleObject = this;

  console.log('in commandStanfordEvents handle');

  res.setHeader('content-type', 'application/json');

  var response_url = req.body.response_url;
  var command = req.body.text;

  console.log('incoming command = ');
  console.log(command);

  if (command.trim() == '') {
    handleObject.helpResponse(cb, 'No search string entered.\n');
    return;
  }

  var parts = command.split(" ");

  if (parts[0].trim() == 'help') {
    handleObject.helpResponse(cb,'');
    return;
  }

  var output = {
    response_type: "ephemeral",
    text: 'Searching... '
  };
  cb(null, JSON.stringify(output));

  if (parts[0].trim() == 'today') {
    handleObject.findToday(response_url);
    return;
  }

  return;
};

