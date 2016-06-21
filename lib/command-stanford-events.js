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
  this.allEvents = [];
};

commandStanfordEvents.prototype.helpResponse = function (responseUrl, output) {
  var handleObject = this;

  var attachments = [];

  var text =
    'You can get a list of featured events for today by entering either:'  + '\n' +
    '    */sevents featured*' + '\n' +
    '    */sevents*' + '\n' +
    'You can get a list of featured events for a specific month by entering (ex. for August):' + '\n' +
    '    */sevents month 8*' + '\n' +
    '    */sevents month August*' + '\n' +
    '    */sevents month aug*' + '\n' +
    'You can get a list of today\'s events by entering:' + '\n' +
    '    */sevents today*';

  attachments[attachments.length] = {
    text: text,
    mrkdwn_in: [ "text" ],
    color: '#0080ff'
  };

  var output = {
    response_type: "ephemeral",
    text: '',
    attachments: attachments
  };

  // post back the results found
  handleObject.postResponse(responseUrl, output);
};

commandStanfordEvents.prototype.monthLookupByAbrev = function (input_monthName) {
  var months = {
    'jan' : 'January',
    'feb' : 'February',
    'mar' : 'March',
    'apr' : 'April',
    'may' : 'May',
    'jun' : 'June',
    'jul' : 'July',
    'aug' : 'August',
    'sep' : 'September',
    'oct' : 'October',
    'nov' : 'November',
    'dec' : 'December',
  }

  // Try to match the first 3 letters of ser's input
  var input_monthName = input_monthName.substring(0, 3);
  input_monthName = input_monthName.toLowerCase();
  for (var prop in months) {
    if (prop == input_monthName) {
      monthName = months[prop];
      return monthName;
    }
  }
  // Fallback to the current month, is not match was found
  var dateToday = new Date();
  var currentMonthNumber = dateToday.getMonth() + 1;
  for (var prop in months) {
    if (prop == currentMonthNumber) {
      monthName = months[prop];
      break;
    }
  }
  return monthName;
};

commandStanfordEvents.prototype.monthLookupByNumber = function (monthNumber) {
  var months = {
    '1' : 'January',
    '2' : 'February',
    '3' : 'March',
    '4' : 'April',
    '5' : 'May',
    '6' : 'June',
    '7' : 'July',
    '8' : 'August',
    '9' : 'September',
    '10' : 'October',
    '11' : 'November',
    '12' : 'December',
  }
  var dateToday = new Date();
  var currentMonth = dateToday.getMonth() + 1;
  if (isNaN(monthNumber)) {
    monthNumber = currentMonth;
  }
  if (monthNumber < 1 || monthNumber > 12) {
    monthNumber = currentMonth;
  }
  var monthName = '';
  for (var prop in months) {
    if (prop == monthNumber) {
      monthName = months[prop];
      break;
    }
  }
  return monthName;
};

commandStanfordEvents.prototype.compare = function (a,b) {
  var aRepeatRuleID = a.eventRepeatRuleID;
  if (aRepeatRuleID == 0) {
    aRepeatRuleID = -1;
  }
  else if (aRepeatRuleID > 0) {
    aRepeatRuleID = 1;
  }
  var bRepeatRuleID = b.eventRepeatRuleID;
  if (bRepeatRuleID == 0) {
    bRepeatRuleID = -1;
  }
  else if (bRepeatRuleID > 0) {
    bRepeatRuleID = 1;
  }
  var aTime = new Date(a.eventBeginDate);
  aTime = aTime.getTime();
  var bTime = new Date(b.eventBeginDate);
  bTime = bTime.getTime();
  if (aRepeatRuleID < bRepeatRuleID) {
    return -1;
  }
  if (aRepeatRuleID > bRepeatRuleID) {
    return 1;
  }
  if (aRepeatRuleID == bRepeatRuleID) {
    if (aTime < bTime) {
      return -1;
    }
    if (aTime > bTime) {
      return 1;
    }
  }
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

commandStanfordEvents.prototype.postResponse = function (responseUrl, output) {
  request({
    url: responseUrl,
    method: "POST",
    json: true,
    body: output
  }, function (error, response, body){
    //console.log(response);
  });
};

commandStanfordEvents.prototype.postEventsResponse = function (events, replyMessageHeader, responseUrl) {
  var handleObject = this;

  events.sort(handleObject.compare);

  var attachments = [];

  for (var index = 0; index < events.length; index++) {

    var text = '*' + events[index].eventFormattedDate + '*' + '\n' +
      '*' + events[index].eventLocation + '*' + ' ' +
      events[index].eventMapUrl + '\n' +
      events[index].eventDescription;

    attachments[attachments.length] = {
      title: events[index].eventTitle,
      title_link: events[index].eventUrl,
      text: text,
      //image_url: events[index].eventImageUrl,
      thumb_url: events[index].eventImageUrl,
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
  handleObject.postResponse(responseUrl, output);
}

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

      var eventBeginDate = event.beginDate;

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
        eventBeginDate : eventBeginDate,
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

commandStanfordEvents.prototype.findEvents = function(getUrl, replyMessageHeader, responseUrl) {
  var handleObject = this;

  console.log('getUrl = ' + getUrl);

  request({
    url: getUrl,
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
      handleObject.postEventsResponse(events, replyMessageHeader, responseUrl);
    });

  });

};

commandStanfordEvents.prototype.loopEventsByUrl = function (getUrls, index) {
  var handleObject = this;

  if (index < getUrls.length) {
    handleObject.getEventsByUrl(getUrls[index], function(err) {
      if (err) {
        console.log('error: ' + err);
      }
      else {
        handleObject.loopEventsByUrl(getUrls, index+1);
      }
    })
  }
  else {
    // found all the events for all the getUrls
    return;
  }
}

commandStanfordEvents.prototype.getEventsByUrl = function (getUrl, cb) {
  var handleObject = this;

  console.log('in getEventsByUrl url: ' + getUrl);

  request({
    url: getUrl,
    method: "GET",
  }, function (error, response, body){

    console.log(response.statusCode);

    if (response.statusCode != 200) {
      return;
    }

    var xml = body;
    handleObject.getEvents(xml, function(events) {
      //console.log('in getEventsByUrl url: ' + getUrl +  ' number events found: ' + events.length);
      //console.log(events);
      for (var index = 0; index < events.length; index++) {
        handleObject.allEvents[allEvents.length] = events[index];
      }
      cb(null);
    });

  });

}

commandStanfordEvents.prototype.handle = function (req, res, cb) {
  var handleObject = this;

  console.log('in commandStanfordEvents handle');

  res.setHeader('content-type', 'application/json');

  var responseUrl = req.body.response_url;
  var command = req.body.text;

  console.log('incoming command = ');
  console.log(command);

  if (command.trim() == '') {
    command = 'featured';
  }

  var parts = command.split(" ");

  if (parts[0].trim() == 'help') {
    var output = {
      response_type: "ephemeral",
      text: 'Help for Stanford Events slash command: /sevents'
    };
    cb(null, JSON.stringify(output));
    handleObject.helpResponse(responseUrl, '');
    return;
  }

  var output = {
    response_type: "ephemeral",
    text: 'Searching for /sevents ' + command + ' ... '
  };
  cb(null, JSON.stringify(output));

  var getUrl = '';
  if (parts[0].trim() == 'today') {
    getUrl = 'http://events.stanford.edu/xml/today/eventlist.xml';
    handleObject.findEvents(getUrl, 'Today\'s Events: ', responseUrl);
    return;
  }

  if (parts[0].trim() == 'featured') {
    getUrl = 'http://events.stanford.edu/xml/eventlist.xml';
    handleObject.findEvents(getUrl, 'Featured Events: ', responseUrl);
    return;
  }

  if (parts[0].trim() == 'month') {
    // user may have entered 1 of 3 valid commands:
    //   /sevents month <monthNumber>
    //   /sevents month <monthName> (just the first 3 characters is used on lookup)
    //   /sevents month (assumes current month)
    var dateToday = new Date();
    var currentYear = dateToday.getFullYear();
    var monthName = '';
    if (parts.length >= 2) {
      var inputMonth = parts[1].trim();
      if (isNaN(inputMonth)) {
        // lookup by inputMonth
        monthName = handleObject.monthLookupByAbrev(inputMonth);
      }
      else {
        // lookup by month number
        var monthNumber = inputMonth;
        monthName = handleObject.monthLookupByNumber(monthNumber);
      }
    }
    else {
      // lookup current month
      var currentMonthNumber = dateToday.getMonth() + 1;
      monthName = handleObject.monthLookupByNumber(currentMonthNumber);
    }
    getUrl = 'http://events.stanford.edu/xml/' + currentYear + '/' + monthName + '/eventlist.xml';
    handleObject.findEvents(getUrl, 'Featured Events for ' + monthName + ': ', responseUrl);
    return;
  }

  if (parts[0].trim() == 'week') {

    // get event urls for the next 7 days
    var getUrls = [];

    // today
    var dateObject = new Date();

    for (var index = 0; index < 7; index++) {

      var yearNumber = dateObject.getFullYear();
      var currentMonthNumber = dateObject.getMonth() + 1;
      var monthName = monthLookupByNumber(currentMonthNumber);
      var dayNumber = dateObject.getDate();

      getUrls[getUrls.length] = 'http://events.stanford.edu/xml/' + yearNumber + '/' + monthName + '/' + dayNumber + '/eventlist.xml';

      dateObject.setTime(dateObject.getTime() + 1 * 86400000);
    }

    console.log('before loopEventsByUrl');
    console.log(getUrls);

    handleObject.allEvents = [];
    handleObject.loopEventsByUrl(getUrls, 0);

    console.log('after loopEventsByUrl');
    console.log(handleObject.allEvents.length);
    console.log(handleObject.allEvents);
    //handleObject.postEventsResponse(handleObject.allEvents, 'Week Events: ', responseUrl);

  }

  if (parts[0].trim() == 'cat') {
    getUrl = 'http://events.stanford.edu/xml/byCategory/' + parts[1].trim() + '/eventlist.xml';
    handleObject.findEvents(getUrl, 'Category ' + parts[1].trim() + ' Events: ', responseUrl);
    return;
  }

  return;
};

