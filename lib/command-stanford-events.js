var _           = require('lodash');
var util        = require('util');
var request     = require('request');
var parseString = require('xml2js').parseString;

module.exports = commandStanfordEvents;

function commandStanfordEvents (tokenSlack, options) {
  this.tokenSlack = tokenSlack;
  this.options = options;
};

commandStanfordEvents.prototype.helpResponse = function (cb, output) {
  var output = {
    response_type: "ephemeral",
    text: output + 'You can get a list of today\'s events by entering: /se today'
  };
  cb(null, JSON.stringify(output));
};

commandStanfordEvents.prototype.postResponse = function (response_url, output) {
  request({
    url: response_url,
    method: "POST",
    json: true,
    body: output
  }, function (error, response, body){
    //console.log(response);
  });
};

commandStanfordEvents.prototype.getEvents = function (xml, cb) {

  console.log('xml from getEvents');
  //console.log(xml);

  parseString(xml, function (err, result) {
    //console.log(result);
    console.log('result from parseString');

    var events = [];
    for (var index = 0; index < result.EventList.Event.length; index++) {
      var event = result.EventList.Event[index];

      var eventTitle = event.title[0];
      eventTitle = eventTitle.replace(/[^\x00-\x7F]/g, ' ');

      var eventDate = event.beginDay + ', ' + event.beginDate;
      var eventLocation = event.locationText[0];
      var eventUrl = event.url ? event.url[0] : '';

      var eventDescription = event.description_textonly[0];
      eventDescription = eventDescription.replace(/[^\x00-\x7F]/g, ' ');

      var eventTime = '';
      if (event.beginTime) {
        var eventTime = event.beginTime;
      }
      if (event.endTime) {
        eventTime += ' - ' + event.endTime;
      }

      var eventMapUrl = event.mapUrl;

      var eventObject = {
        eventTitle : eventTitle,
        eventDescription : eventDescription,
        eventDate : eventDate,
        eventTime : eventTime,
        eventLocation : eventLocation,
        eventUrl : eventUrl,
        eventMapUrl : eventMapUrl
      };

      events[events.length] = eventObject;
    }

    cb(events);
  });

};

commandStanfordEvents.prototype.findToday = function(response_url) {
  var handleObject = this;

  var get_url = 'http://events.stanford.edu/xml/today/eventlist.xml';

  request({
    url: get_url,
    method: "GET",
  }, function (error, response, body){

    console.log(response.statusCode);

    if (response.statusCode != 200) {
      res.send({
        'statusCode': response.statusCode,
        'message': 'No data found'
      });
      return;
    }

    var xml = body;

    handleObject.getEvents(xml, function(events) {
      console.log('in getEvents cb number events found: ' + events.length);

      var attachments = [];

      for (var index = 0; index < events.length; index++) {
        var mapUrl = '<' + events[index].eventMapUrl + '|' + 'map' + '>';
        var text = events[index].eventDate + ', ' +
          events[index].eventTime + '\n' +
          events[index].eventLocation + ' ' + mapUrl + '\n' +
          events[index].eventDescription;
        attachments[attachments.length] = {
          title: events[index].eventTitle,
          title_link: events[index].eventUrl,
          text: text,
          mrkdwn_in: [ "text" ],
          color: '#0080ff'
        };
      }

      var output = {
        response_type: "ephemeral",
        text: 'Events for: today ' + ' (' + events.length + ' results found)',
        attachments: attachments
      };

      // post back the results found
      handleObject.postResponse(response_url, output);

    });

  });

};

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

