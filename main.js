function log(msg) {
	$(".debug").prepend(msg+"<br>");
}
setInterval(function(){$(".debug").empty()},100000);
$(function(){
	log("Main starting, settings: "+JSON.stringify(settings));
	$(window).bind('storage', function (e) {
		if(e.originalEvent.key === "kappagen_settings") {
			console.log("Storage changed!");
			var newsettings = JSON.parse(localStorage.kappagen_settings);
			var settingkeys = Object.keys(newsettings);
			for(var i=0;i<settingkeys.length;++i) {
				var key = settingkeys[i];
				if(key == "ch") continue;
				var newval = newsettings[key];
				var oldval = settings[key];
				settings[key] = newval;
				if(newval != oldval && newval !== undefined) {
					toastr.info("Set "+key+" to "+newval);
				}
			}
		}
	});
	toastr.options = {
		"closeButton": false,
		"debug": false,
		"newestOnTop": true,
		"progressBar": false,
		"positionClass": "toast-top-right",
		"preventDuplicates": false,
		"onclick": null,
		"showDuration": "300",
		"hideDuration": "1000",
		"timeOut": "5000",
		"extendedTimeOut": "1000",
		"showEasing": "swing",
		"hideEasing": "linear",
		"showMethod": "fadeIn",
		"hideMethod": "fadeOut"
	}

	var parseQueryParams = function(url) {
		var res = {};
		url.replace(/([^?=&]+)(?:=([^&]*))?/g,function(m, k, v){res[decodeURIComponent(k)] = v?decodeURIComponent(v):true; });
		return res;
	}

	var getRateLimit = function(val) {
		if(val < 60) {
			return 1000.0*(61 - val);
		} else if(val < 120) {
			return 1000.0/(val - 59);
		} else return 0;
	}

	log("Building settings.");
	var params = parseQueryParams(window.location.search);
	var channel = params.ch.toLowerCase();
	$.getJSON("https://api.frankerfacez.com/v1/room/"+channel, loadFFZChannel);
	if(channel !== "cbenni") $.getJSON("https://api.frankerfacez.com/v1/room/cbenni", loadFFZ);
	$.getJSON("https://api.frankerfacez.com/v1/set/global", loadFFZ);
	$.getJSON("https://api.betterttv.net/2/channels/"+channel, loadBTTVChannel);
	$.getJSON("https://api.betterttv.net/2/emotes", loadBTTV);
	
	var subemotes = {"sub":[], "ffz":[], "bttv":[], "gif": []};
	$.ajax({
		url: "http://api.twitch.tv/api/channels/"+channel+"/product",
		jsonp: "callback",
		dataType: "jsonp",
		success: function( response ) {
			var emotes = response.emoticons;
			for(var i=0;i<emotes.length;++i) {
				var emote = emotes[i];
				if(emote.state === "active") {
					subemotes.sub.push({type:"sub",url:"http://static-cdn.jtvnw.net/emoticons/v1/"+emote.id+"/3.0"});
				}
			}
		}
	});
	
	
	log("Emotes loaded.");

	var defaults = {
		v: 1,
		ffz: true,
		bttv: true,
		gif: true,
		once: false,
		mods: false,
		subonly: false,
		emotesplosion: 400,
		emotesplosiontype: "explosion",
		emotesplosiontriggers: "s",
		size: 112,
		max: 120,
		duration: 2
	}
	var settings = jQuery.extend({}, defaults);
	
	var getEmotesplosionTriggers = function(type) {
		var triggers = settings.emotesplosiontriggers.split("+");
		for(var i=0;i<triggers.length;++i){
			if(triggers[i][0] === type) return true;
		}
		return false;
	}

	var paramkeys = Object.keys(params);
	if(localStorage.kappagen_lastURL !== window.location.href || !localStorage.kappagen_settings) {
		localStorage.kappagen_lastURL = window.location.href;
		for(var i=0;i<paramkeys.length;++i) {
			var key = paramkeys[i];
			var val = params[key];
			if(typeof val === "string") val = val.toLowerCase();
			setSetting(key, val);
		}
	} else {
		settings = jQuery.extend(settings, JSON.parse(localStorage.kappagen_settings));
	}

	// updating "anim" to "gif"
	if(settings.anim !== undefined) {
		if(settings.gif === undefined) settings.gif = settings.anim;
		delete settings.anim;
		localStorage.kappagen_settings = JSON.stringify(settings);
	}
	
	log("Settings built:" + JSON.stringify(settings));

	function setSetting(key, val) {
		if(key === "ch") return;
		if(settings[key] === undefined) {
			toastr.error("Invalid setting "+key);
			return;
		}
		if(key === "size" || key === "max" || key === "v" || key === "emotesplosion") {
			val = parseInt(val);
			if(isNaN(val)) {
				toastr.error("Invalid value '"+val+"' for integer setting "+key);
				return;
			}
		}
		else if(key === "duration") {
			val = parseFloat(val);
			if(isNaN(val)) {
				toastr.error("Invalid value '"+val+"' for floating point setting "+key);
				return;
			}
		}
		else if(key === "emotesplosiontriggers" || key === "emotesplosiontype") { /* nothing to change */ }
		else if(val === "true" || val === "on" || val === true) val = true;
		else if(val === "false" || val === "off" || val === false) val = false;
		else {
			toastr.error("Invalid value '"+val+"' for boolean setting "+key);
			return;
		}
		
		settings[key] = val;
		localStorage.kappagen_settings = JSON.stringify(settings);
		return val;
	}

	$.ajax({
		url: "http://api.twitch.tv/api/channels/"+channel+"/chat_properties",
		jsonp: "callback",
		dataType: "jsonp",
		success: function( response ) {
			var wss = response.web_socket_servers;
			var serverip = wss[Math.floor(Math.random() * wss.length)];
			var w=new WebSocket('ws://'+serverip);
			w.onmessage=function(e){
				var lines = e.data.split("\r\n");
				$.each(lines, function() {
					if(this.length) handleMessage(w,this);
				});
			}
		
			w.onopen=function(e) {
				w.send('CAP REQ :twitch.tv/tags twitch.tv/commands');
				w.send('NICK justinfan1');
				w.send('JOIN #'+channel);
			}
		}
	});
	var userAccounts = {};
	var lastSent = {}
	function addUserAccount(user, time) {
		var d = Date.now();
		userAccounts[user] = Math.max(0,(lastSent[user]-d+userAccounts[user]) || 0)+time;
		lastSent[user] = d;
	}
	function getUserAccount(user) {
		return Math.max(0,(lastSent[user]-Date.now()+userAccounts[user]) || 0);
	}

	function drawEmote(user, imgPath) {
		log("drawing emote "+imgPath);
		if(getUserAccount(user)<1000) {
			var ratelimit = getRateLimit(settings.max);
			if(ratelimit != 0)addUserAccount(user, ratelimit+1); // +1 to account for execution time, preventing limit violations.
			$('<img src="'+ imgPath +'" class="emote" style="height: '+settings.size+'px">')
				.css({top:(Math.random()*100)+"%",left:(Math.random()*100)+"%"})
				.load(function() {
					$(this)
						.show()
						.velocity({translateX: "-50%", translateY: "-50%", scale:0},{duration: 0})
						.velocity({translateX: "-50%", translateY: "-50%", scale: 1},{duration: 250*Math.max(1,settings.duration)})
						.velocity({translateX: "-50%", translateY: "-50%", scale:0},{delay:1000*settings.duration,duration: 250*Math.max(1,settings.duration),complete:function(e){$(e).remove();}});
				})
				.appendTo("body");
		}
	}
	
	function emotesplosion(allowedEmotes) {
		if(allowedEmotes === undefined) {
			allowedEmotes = [];
			for(var i=0;i<subemotes.sub.length;++i) allowedEmotes.push(subemotes.sub[i]);
			if(settings.bttv) for(var i=0;i<subemotes.bttv.length;++i) allowedEmotes.push(subemotes.bttv[i]);
			if(settings.bttv && settings.gif) for(var i=0;i<subemotes.gif.length;++i) allowedEmotes.push(subemotes.gif[i]);
			if(settings.ffz) for(var i=0;i<subemotes.ffz.length;++i) allowedEmotes.push(subemotes.ffz[i]);
		}
		emotesplosiontypes[settings.emotesplosiontype](allowedEmotes);
	}
	
	
	var fountainEmotes = [];
	var bubbleEmotes = [];
	
	var emotesplosiontypes = {
		random: function(allowedEmotes) {
			var esk = Object.keys(emotesplosiontypes);
			emotesplosiontypes[esk[Math.floor(Math.random()*esk.length)]](allowedEmotes);
		},
		explosion: function (allowedEmotes) {
			var seed = Math.floor(Math.random()*allowedEmotes.length);
			var startx = Math.random()*100;
			var starty = Math.random()*100;
			for(var i=0;i<settings.emotesplosion;++i) {
				setTimeout(function(k) {
					var emote = allowedEmotes[(k+seed)%allowedEmotes.length];
					var imgPath = emote.url;
					$('<img src="'+ imgPath +'" class="emote">')
						.css({top:starty+"%",left:startx+"%",height: "0px"})
						.load(function() {
							var vx = Math.random()-0.5;
							var vy = Math.random()-0.5;
							var v = 1/Math.sqrt(vx*vx+vy*vy);
							vx *= v;
							vy *= v;
							$(this)
								.show()
								.velocity({top: (50+100*vy)+"%", left: (50+100*vx)+"%", height: settings.size*1.5},
									{duration: 2000*(settings.duration+1),complete:function(e){$(e).remove()}, easing:[0.215, 0.61, 0.355, 1]});
						})
						.appendTo("body");
				}, 5*settings.duration*i, i);
			}
		},
	
		firework: function (allowedEmotes) {
			var seed = Math.floor(Math.random()*allowedEmotes.length);
			var startx = Math.random()*50+25;
			var starty = Math.random()*50+10;
			
			
			var sparks = [];
			
			for(var i=1;i<settings.emotesplosion;++i) {
				var emote = allowedEmotes[(i+seed)%allowedEmotes.length];
				var imgPath = emote.url;
				sparks.push($('<img src="'+ imgPath +'" class="emote">')
					.css({top:starty+"%",left:startx+"%","height":settings.size})
					.appendTo("body"));
			}
			
			var startemote = allowedEmotes[seed];
			var startemoteImgPath = startemote.url;
			$('<img src="'+ startemoteImgPath +'" class="emote">')
				.css({top:"100%",left:"50%","height":0})
				.load(function() {
					$(this)
						.show()
						.velocity({top: starty+"%", left: startx+"%", height: settings.size},
							{duration: 200*(settings.duration+1), easing: "linear", complete:function(e){
								$(e).remove();
								for(var i=0;i<sparks.length;++i) {
									setTimeout(function(k) {
										var v = Math.random();
										var vx = Math.random()-0.5;
										var vy = Math.random()-0.5;
										var nv = v/Math.sqrt(vx*vx+vy*vy);
										vx *= nv;
										vy *= nv;
										sparks[k]
											.show()
											.velocity({top: (starty+100*vy)+"%", left: (startx+100*vx)+"%", opacity: 0, height: 0},
												{duration: 800*(settings.duration+1), easing: [0.215, 0.61, 0.355, 1],complete:function(f){$(f).remove()}})
									}, 1, i);
								}
							}});
				})
				.appendTo("body");
		},
		
		fountain: function (allowedEmotes) {
			var seed = Math.floor(Math.random()*allowedEmotes.length);
			var startx = 50;
			var starty = 100;
			for(var i=0;i<settings.emotesplosion;++i) {
				setTimeout(function(k) {
					var emote = allowedEmotes[(k+seed)%allowedEmotes.length];
					var imgPath = emote.url;
					$('<img src="'+ imgPath +'" class="emote">')
						.css({top:starty+"%",left:startx+"%",height: "0px"})
						.load(function() {
							$(this).show().velocity({height: settings.size},{duration: 1000*settings.duration, easing:[0.215, 0.61, 0.355, 1]});
							var vx = (Math.random()-0.5)*2;
							var vy = (Math.random()+1.5);
							var nv = (Math.random()+1)/(2*Math.sqrt(vx*vx+vy*vy)*(settings.duration+1));
							vx *= nv*100;
							vy *= nv*300;
							fountainEmotes.push({elem:$(this), x: startx, y: starty, vx: vx, vy: vy, v0: vy});
						})
						.appendTo("body");
				}, 10*settings.duration*i*settings.size/112, i);
			}
		},
		
		bubbles: function (allowedEmotes) {
			var seed = Math.floor(Math.random()*allowedEmotes.length);
			for(var i=0;i<settings.emotesplosion;++i) {
				setTimeout(function(k) {
					var emote = allowedEmotes[(k+seed)%allowedEmotes.length];
					var imgPath = emote.url;
					var centerx = Math.random()*100;
					var starty = 50*(2-settings.size/$(window).height());
					var phase = Math.random()*Math.PI*2;
					var amp = 1+50*settings.size/$(window).height();
					var startx = centerx+bubbleSway(amp,4/(settings.duration+1), 0, phase);
					$('<img src="'+ imgPath +'" class="emote">')
						.css({top:starty+"%",left:startx+"%", height: 0, opacity: 1})
						.load(function() {
							$(this).show().velocity({height: (1.5*settings.size)+"px"},{duration: 300, easing:"ease-in", complete: function(f){
								var vy = 75*(0.1*Math.random()+1)/(settings.duration+1);
								bubbleEmotes.push({elem:$(f), x: centerx, y: starty, vy: vy, t: performance.now(), phase: phase, amp: amp});
								$(f).velocity({height: settings.size+"px"},{duration: 100, easing:"ease-out", complete: function(g){
									$(g).velocity({opacity: 0},{duration: 1000*(settings.duration+1), easing:[0.65, 0, 0.69, 0.35]});
								}});
							}});
						})
						.appendTo("body");
				}, 50*settings.duration*i*settings.size/112, i);
			}
		}
	}
	
	function bubbleSway(amp, freq, age, phaseoffset) {
		return amp*Math.sin(freq*age+phaseoffset);
	}
	
	var rafStart = Date.now();
	function animStep(t){
		var f = (t - rafStart)/1000.0;
		var speedmodifier = 1/(settings.duration+1);
		var speedmodifiersq = speedmodifier*speedmodifier;
		for(var i=fountainEmotes.length-1;i>=0;--i) {
			var fe = fountainEmotes[i];
			fe.x += fe.vx*f;
			fe.vy -= 600*speedmodifiersq*f;
			fe.y -= fe.vy*f;
			if(fe.y > 120) {
				fe.elem.remove();
				fountainEmotes.splice(i,1);
			}
			else fe.elem.css({left:fe.x+"%",top:fe.y+"%"});
		}
		for(var i=bubbleEmotes.length-1;i>=0;--i) {
			var be = bubbleEmotes[i];
			var age = (t-be.t)*0.001;
			var x = be.x+bubbleSway(be.amp,4*speedmodifier, age, be.phase);
			var y = be.y-age*be.vy;
			if(age > (settings.duration+2)) {
				be.elem.remove();
				bubbleEmotes.splice(i,1);
			}
			else be.elem.css({left:x+"%",top:y+"%"});
		}
		
		rafStart = t;
		window.requestAnimationFrame(animStep);
	}
	window.requestAnimationFrame(animStep);

	function handleCommand(w,data) {
		split = data.text.toLowerCase().split(" ");
		if(split.length >= 2 && (data.nick === channel || data.nick === "cbenni" || data.nick === "onslaught" || settings.mods && data.tags.mod === "1")) {
			if(split[1] == "emotesplosiontest") {
				emotesplosion();
			} else if(split[1] == "customsplosion") {
				var allowedEmotes = [];
				for(var i=0;i<data.emotes.length;i++) {
					var emote = data.emotes[i];
					var imgPath = "http://static-cdn.jtvnw.net/emoticons/v1/"+emote.id+"/3.0";
					allowedEmotes.push({"url":imgPath});
				}
				var usplit = data.text.split(" ");
				for(var i=2;i<usplit.length;++i) {
					var emote = ExtraEmotes[usplit[i]];
					if(emote !== undefined && settings[emote.type] && (emote.type != "gif" || settings.bttv)) {
						allowedEmotes.push(emote);
					}
				}
				emotesplosion(allowedEmotes);
			} else if(split.length == 3) {
				var oldval = settings[split[1]];
				var res = setSetting(split[1],split[2]);
				if(res !== undefined && oldval !== res) toastr.info(data.nick+" set setting "+split[1]+" from "+oldval+" to "+res);
			}
		}
	}
	// startsWith polyfill
	if (!String.prototype.startsWith) {
		String.prototype.startsWith = function(searchString, position){
		  position = position || 0;
		  return this.substr(position, searchString.length) === searchString;
	  };
	}

	function handleMessage(w,data) {
		var parsedmessage = parseIRCMessage(data);
		log(data);
		console.log(data);
		if(parsedmessage[STATE_COMMAND] == "PING") w.send('PONG');
		else if (parsedmessage[STATE_COMMAND]=="PRIVMSG") {
			var extmsg = getPrivmsgInfo(parsedmessage);
			if(extmsg.text.toLowerCase().startsWith("!kappagen")) {
				handleCommand(w,extmsg);
				return;
			}
			else if(extmsg.nick === "twitchnotify") {
				if(getEmotesplosionTriggers("s"))emotesplosion();
				return;
			} 
			else if(settings.subonly && extmsg.tags.subscriber !== "1" && extmsg.tags.mod !== "1") return; // do nothing for plebs when sub only mode is active.
			else if(settings.once) {
				for(var i=0;i<extmsg.emoteids.length;i++) {
					var emoteid = extmsg.emoteids[i];
					var imgPath = "http://static-cdn.jtvnw.net/emoticons/v1/"+emoteid+"/3.0";
					drawEmote(extmsg.nick, imgPath);
				}
			} else {
				for(var i=0;i<extmsg.emotes.length;i++) {
					var emote = extmsg.emotes[i];
					log("drawing emote with id "+emote.id);
					var imgPath = "http://static-cdn.jtvnw.net/emoticons/v1/"+emote.id+"/3.0";
					drawEmote(extmsg.nick, imgPath);
				}
			}
			var foundemotes = {};
			$.each(parsedmessage[STATE_TRAILING].trim().split(" "), function(key,val) {
				var emote = ExtraEmotes[this];
				if(emote !== undefined && settings[emote.type] && (emote.type != "gif" || settings.bttv)) {
					if(!settings.once || !foundemotes[emote]) {
						drawEmote(extmsg.nick, emote.url);
						foundemotes[emote] = true;
					}
				}
			});
		}
	}


	ExtraEmotes = {};
	function loadFFZ(data, xhr) {
		$.each(data.sets, function(){
			$.each(this.emoticons, function(){
				var x = this.urls;
				ExtraEmotes[this.name] = {"url":"https://"+ (x[4] || x[2] || x[1]), "type": "ffz"};
			});
		});
	}
	function loadFFZChannel(data, xhr) {
		$.each(data.sets, function(){
			$.each(this.emoticons, function(){
				var x = this.urls;
				var emote = {"url":"https://"+ (x[4] || x[2] || x[1]), "type": "ffz"};
				ExtraEmotes[this.name] = emote;
				subemotes["ffz"].push(emote);
			});
		});
	}
	function loadBTTV(data, xhr) {
		$.each(data.emotes, function(){
			ExtraEmotes[this.code] = {"url":data.urlTemplate.replace("{{id}}",this.id).replace("{{image}}","3x"), type: this.imageType == "gif"?"gif":"bttv"};
		});
	}
	function loadBTTVChannel(data, xhr) {
		$.each(data.emotes, function(){
			var emote = {"url":data.urlTemplate.replace("{{id}}",this.id).replace("{{image}}","3x"), type: this.imageType == "gif"?"gif":"bttv"};
			ExtraEmotes[this.code] = emote;
			subemotes[emote.type].push(emote);
		});
	}
		
	var rx = /^(?:@([^ ]+) )?(?:[:](\S+) )?(\S+)(?: (?!:)(.+?))?(?: [:](.+))?$/;
	var rx2 = /([^=;]+)=([^;]*)/g;
	var rx3 = /\r\n|\r|\n/;
	var STATE_V3 = 1;
	var STATE_PREFIX = 2;
	var STATE_COMMAND = 3;
	var STATE_PARAM = 4;
	var STATE_TRAILING = 5;
	function parseIRCMessage(message) {
		var data = rx.exec(message);
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
	
	// follows
	var lastfollowers = undefined;
	function updateFollows()
	{
		if(getEmotesplosionTriggers("f")) {
			$.ajax({
				url: "https://api.twitch.tv/kraken/channels/"+channel+"/follows",
				type: 'GET',
				crossDomain: true,
				dataType: 'jsonp',
				jsonp: 'callback',
				data: { 
					limit: "1"
				}, 
				success:function (data) {
					if(data.follows.length>0)
					{
						var newestfollower = data.follows[0].user.name;
						if(lastfollowers === undefined) lastfollowers=[newestfollower];
						if(lastfollowers.indexOf(newestfollower)<0)
						{
							emotesplosion();
							lastfollowers.push(newestfollower)
						}
					}
					else if(lastfollowers === undefined) lastfollowers = [];
				}
			});
		}
	}
	updateFollows(channel);
	setInterval(updateFollows,10000);

});