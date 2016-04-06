var rx = /^(?:@([^ ]+) )?(?:[:](\S+) )?(\S+)(?: (?!:)(.+?))?(?: [:](.+))?$/;
var rx2 = /([^=;]+)=([^;]*)/g;
var rx3 = /\r\n|\r|\n/;
var STATE_V3 = 1;
var STATE_PREFIX = 2;
var STATE_COMMAND = 3;
var STATE_PARAM = 4;
var STATE_TRAILING = 5;
function parseIRCMessage(message) {
	let data = rx.exec(message);
	let tagdata = data[STATE_V3];
	if (tagdata) {
		let tags = {};
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
	let parts = str.split(delim);
	let tail = parts.slice(count).join(delim);
	let result = parts.slice(0,count);
	result.push(tail);
	return result;
}

function getPrivmsgInfo(parsedmessage) {
	let tags = parsedmessage[STATE_V3];
	
	let nick = parsedmessage[STATE_PREFIX].match(/(\w+)/)[1]
	let channel = parsedmessage[STATE_PARAM][0]
	let badges = []
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
	
	let text = parsedmessage[STATE_TRAILING];
	let isaction = false;
	let actionmatch = /^\u0001ACTION (.*)\u0001$/.exec(text);
	if(actionmatch != null) {
		isaction = true;
		text = actionmatch[1];
	}
	
	let emotes = [];
	let emoteids = [];
	if(tags && tags["emotes"] != "") {
		let emotelists = tags["emotes"].split("/");
		for(let i=0;i<emotelists.length;i++) {
			let emoteidpositions = emotelists[i].split(":")
			let emoteid = emoteidpositions[0];
			emoteids.push(emoteid);
			let positions = emoteidpositions[1].split(",");
			for(let j=0;j<positions.length;j++) {
				let startend = positions[j].split("-");
				let start = parseInt(startend[0]);
				let end = parseInt(startend[1]);
				
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