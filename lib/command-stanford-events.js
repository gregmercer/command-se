var _           = require('lodash');
var util        = require('util');
var request     = require('request');
var parseString = require('xml2js').parseString;
var dateFormat  = require('dateformat');

module.exports = commandStanfordEvents;

function commandStanfordEvents (tokenSlack, tokenSlackDWS, options) {
  this.tokenSlack = tokenSlack;
  this.tokenSlackDWS = tokenSlackDWS;
  this.options = options;
};

commandStanfordEvents.prototype.compare = function (a,b) {
  if (a.eventRepeatRuleID < b.eventRepeatRuleID)
    return -1;
  if (a.eventRepeatRuleID > b.eventRepeatRuleID)
    return 1;
  return 0;
};

commandStanfordEvents.prototype.formatEventDate = function (event) {
  var eventFormattedDate = '';

  var eventRepeatRuleID = event.repeatRuleID[0];
  var eventBeginDay = event.beginDay;
  var eventBeginDate = event.beginDate;

  var eventTime = '';
  if (event.beginTime) {
    var eventTime = event.beginTime;
  }
  if (event.endTime) {
    eventTime += ' - ' + event.endTime;
  }
  if (eventTime != '') {
    eventTime += '.';
  }

  if (eventRepeatRuleID == -1) {
    // Sunday, June 19, 2016. 2:30 PM.
    eventFormattedDate = eventBeginDay + ', ' + eventBeginDate + '. ' + eventTime;
  }
  else if (eventRepeatRuleID == 0) {
    // Sunday, June 19, 2016. 2:30 PM.
    eventFormattedDate = eventBeginDay + ', ' + eventBeginDate + '. ' + eventTime;
  }
  else if (eventRepeatRuleID == 1) {
    // Ongoing every day from May 9, 2016 through August 31, 2016.  8:00 AM.
    eventFormattedDate = 'Ongoing ' + event.repeatRuleText + ' from ' + eventBeginDate + ' through ' + event.repeatUntilDate + '. ' + eventTime;
  }
  else if (eventRepeatRuleID == 2) {
    // Ongoing every weekday (M-F) from June 27, 2016 through July 1, 2016. 9:00 AM.
    eventFormattedDate = 'Ongoing ' + event.repeatRuleText + ' from ' + eventBeginDate + ' through ' + event.repeatUntilDate + '. ' + eventTime;
  }
  else if (eventRepeatRuleID == 3) {
    // Ongoing every weekday (M-F) from June 27, 2016 through July 1, 2016. 9:00 AM.
    eventFormattedDate = 'Ongoing ' + event.repeatRuleText + ' from ' + eventBeginDate + ' through ' + event.repeatUntilDate + '. ' + eventTime;
  }
  else if (eventRepeatRuleID == 4) {
    // Ongoing every week from January 20, 2016 through September 7, 2016.
    eventFormattedDate = 'Ongoing ' + event.repeatRuleText + ' from ' + eventBeginDate + ' through ' + event.repeatUntilDate + '.';
  }
  else if (eventRepeatRuleID == 99) {
    // Ongoing from June 23, 2016 through June 24, 2016. See details for exact dates and times.
    eventFormattedDate = 'Ongoing from ' + eventBeginDate + ' through ' + event.repeatUntilDate + ' See details for exact dates and times.';
  }

  return eventFormattedDate;
}

commandStanfordEvents.prototype.helpResponse = function (cb, output) {
  var output = {
    response_type: "ephemeral",
    text: output +
      'You can get a list of featured events by entering either: /se featured or just /se' + '\n' +
      'You can get a list of today\'s events by entering: /se today'
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
  var handleObject = this;

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

      var eventFormattedDate = handleObject.formatEventDate(event);

      var eventLocation = event.locationText[0];
      var eventUrl = event.url ? event.url[0] : '';

      var eventDescription = event.description_textonly[0];
      eventDescription = eventDescription.replace(/[^\x00-\x7F]/g, ' ');

      var eventMapUrl = '';
      if (event.mapUrl) {
        eventMapUrl = '<' + event.mapUrl + '|' + '(map)' + '>';
      }

      var eventImageUrl = '';
      if (event.Media && event.Media[0].imageUrl) {
        eventImageUrl = event.Media[0].imageUrl[0];
      }

      var eventRepeatRuleID = event.repeatRuleID[0];

      var eventObject = {
        eventTitle : eventTitle,
        eventDescription : eventDescription,
        eventFormattedDate : eventFormattedDate,
        eventLocation : eventLocation,
        eventUrl : eventUrl,
        eventMapUrl : eventMapUrl,
        eventImageUrl : eventImageUrl,
        eventRepeatRuleID : eventRepeatRuleID
      };

      events[events.length] = eventObject;
    }

    cb(events);
  });

};

commandStanfordEvents.prototype.findEvents = function(get_url, replyMessageHeader, response_url) {
  var handleObject = this;

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

      events.sort(handleObject.compare);

      var attachments = [];

      for (var index = 0; index < events.length; index++) {

        var text = '*' + events[index].eventFormattedDate + '*' + '\n' +
          events[index].eventLocation + ' ' +
          events[index].eventMapUrl + '\n' +
          events[index].eventDescription;

        attachments[attachments.length] = {
          title: events[index].eventTitle,
          title_link: events[index].eventUrl,
          text: text,
          image_url: events[index].eventImageUrl,
          mrkdwn_in: [ "text" ],
          color: '#0080ff'
        };

      }

      var output = {
        response_type: "ephemeral",
        text: replyMessageHeader + ' (' + events.length + ' results found)',
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
    command = 'featured';
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

  var get_url = '';
  if (parts[0].trim() == 'today') {
    get_url = 'http://events.stanford.edu/xml/today/eventlist.xml';
    handleObject.findEvents(get_url, 'Today\'s Events: ', response_url);
    return;
  }

  if (parts[0].trim() == 'featured') {
    get_url = 'http://events.stanford.edu/xml/eventlist.xml';
    handleObject.findEvents(get_url, 'Featured Events: ', response_url);
    return;
  }

  if (parts[0].trim() == 'cat') {
    get_url = 'http://events.stanford.edu/xml/byCategory/' + parts[1].trim() + '/eventlist.xml';
    handleObject.findEvents(get_url, 'Category ' + parts[1].trim() + ' Events: ', response_url);
    return;
  }

  return;
};

