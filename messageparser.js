var rx = /^(?:@([^ ]+) )?(?:[:](\S+) )?(\S+)(?: (?!:)(.+?))?(?: [:](.+))?$/;
var rx2 = /([^=;]+)=([^;]*)/g;
var rx3 = /\r\n|\r|\n/;
var STATE_V3 = 1
var STATE_PREFIX = 2
var STATE_COMMAND = 3
var STATE_PARAM = 4
var STATE_TRAILING = 5
function parseIRCMessage(message) {
	var data = rx.exec(message);
	if(data == null) {
		winston.error("Couldnt parse message '"+message+"'");
		return null;
	}
	var tagdata = data[STATE_V3];
	if (tagdata) {
		var tags = {};
		do {
			m = rx2.exec(tagdata);
			if (m) {
				tags[m[1]] = m[2];
			}
		} while (m);
		data[STATE_V3] = tags;
	}
	return data;
}

function splitWithTail(str,delim,count){
	var parts = str.split(delim);
	var tail = parts.slice(count).join(delim);
	var result = parts.slice(0,count);
	result.push(tail);
	return result;
}

function getPrivmsgInfo(parsedmessage) {
	var tags = parsedmessage[STATE_V3];
	
	var nick = parsedmessage[STATE_PREFIX].match(/(\w+)/)[1]
	var channel = parsedmessage[STATE_PARAM][0]
	var badges = []
	// moderation badge
	if(nick == channel.substring(1)) {
		badges.push("broadcaster");
	}
	else if(tags && tags["user-type"] != "") {
		badges.push(tags["user-type"]);
	}
	if(tags && tags["subscriber"]=="1") {
		badges.push("subscriber")
	}
	if(tags && tags["turbo"]=="1") {
		badges.push("turbo")
	}
	
	var text = parsedmessage[STATE_TRAILING];
	var isaction = false;
	var actionmatch = /^\u0001ACTION (.*)\u0001$/.exec(text);
	if(actionmatch != null) {
		isaction = true;
		text = actionmatch[1];
	}
	
	var emotes = [];
	var emoteids = [];
	if(tags && tags["emotes"] != "") {
		var emotelists = tags["emotes"].split("/");
		for(var i=0;i<emotelists.length;i++) {
			var emoteidpositions = emotelists[i].split(":")
			var emoteid = emoteidpositions[0];
			emoteids.push(emoteid);
			var positions = emoteidpositions[1].split(",");
			for(var j=0;j<positions.length;j++) {
				var startend = positions[j].split("-");
				var start = parseInt(startend[0]);
				var end = parseInt(startend[1]);
				
				emotes.push({"start":start,"end":end,"id":emoteid,"name":text.substring(start,end+1)});
			}
		}
	}
	
	return {
		"tags": tags,
		"nick": nick,
		"badges": badges,
		"channel": channel,
		"text": text,
		"isaction": isaction,
		"emotes": emotes,
		"emoteids": emoteids
	}
}