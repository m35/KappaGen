var CORSProvider = "//cbenni.com/cors-proxy/]https:";

function log(msg) {
	console.log(msg);
}

function parseQueryParams(url) {
	var res = {};
	url.replace(/([^?=&]+)(?:=([^&]*))?/g,function(m, k, v){res[decodeURIComponent(k)] = v?decodeURIComponent(v):true; });
	return res;
}

function guid() {
  function s4() { // generates 4 random lowercase alphanumeric characters
    return Math.floor((1 + Math.random()) * 1679616) // 1679616 = 36^4 = 1000 in base 36
      .toString(36)
      .substring(1);
  }
  var res = Math.floor(10 * Math.random())+""; // first character is a digit and denotes the cluster we connect to.
  for(var i=0;i<6;++i) res += s4();
  return res;
}

// startsWith polyfill
if (!String.prototype.startsWith) {
	String.prototype.startsWith = function(searchString, position){
	  position = position || 0;
	  return this.substr(position, searchString.length) === searchString;
  };
}

alertify.logPosition("top right");

var app = angular.module("app",["firebase"]);

app.controller("AppCtrl",function($scope, $firebaseObject, $sce, $window, $http){
	$scope.loaded = false;
	var params = parseQueryParams(window.location.search);
	var channel = params.channel
	if(!channel) {
		window.location.href = window.location.origin+window.location.pathname+"settings";
		return;
	}
	channel = channel.toLowerCase();
	var userAccounts = {};
	var lastSent = {};
	
	var animatedemotes = [];
	
	function addUserAccount(user, time) {
		var d = Date.now();
		userAccounts[user] = Math.max(0,(lastSent[user]-d+userAccounts[user]) || 0)+time;
		lastSent[user] = d;
	}
	function getUserAccount(user) {
		return Math.max(0,(lastSent[user]-Date.now()+userAccounts[user]) || 0);
	}

	var animationkeys = [];
	function drawEmote(user, emote) {
		// check rate limit and if we are allowed to use this emote
		if($scope.settings.chatemotes && getUserAccount(user)<1000 && (!$scope.settings.channelonly || emote.channel)) {
			console.log("User account for "+user+": "+getUserAccount(user))
			var ratelimit = 1000*$scope.settings.limit;
			if(ratelimit != 0)addUserAccount(user, ratelimit+10); // +10 to account for execution time, preventing limit violations.
			
			var animationparams = initializers[$scope.settings.animation](ctx, $scope.settings);
			var img = new ImageEx(emote.url, emote.type == "gif");
			img.onload = function() {
				animatedemotes.push({url: emote.url, animation: animationparams, start: performance.now(), img: this, w: this.width, h: this.height, type: emote.type});
			}
		}
	}
	
	var canvas = document.getElementById("emoteScreen");
	var ctx = canvas.getContext('2d');
	
	
	
	function setSetting(key, val) {
		if(defaults[key] === undefined) {
			alertify.error("Invalid setting "+key);
			return;
		} else {
			var type = typeof(defaults[key]);
			if(type === "number") {
				val = parseFloat(val);
				if(isNaN(val)) {
					alertify.error("Invalid value '"+val+"' for integer setting "+key);
					return;
				}
			} else if(type === "boolean") {
				if(val === "true" || val === "on" || val === true) val = true;
				else if(val === "false" || val === "off" || val === false) val = false;
				else {
					alertify.error("Invalid value '"+val+"' for boolean setting "+key);
					return;
				}
			} else if(type === "object") {
				val = JSON.parse(val);
			}
		}
		$scope.$apply(function(){$scope.settings[key] = val});
		
		return val;
	}
	
	var rafStart = performance.now();
	function animStep(t){
        ctx.clearRect(0, 0, canvas.width, canvas.height);
		var f = t - rafStart;
		for(var i=animatedemotes.length-1;i>=0;--i) {
			var emote = animatedemotes[i];
			var speedmult = 1/(1000.0*emote.animation.duration);
			var age = (t-emote.start)*speedmult;
			if(age >= 0) {
				animations[emote.animation.type](ctx, $scope.settings, f*speedmult, age, emote);
				if(age > 1) {
					animatedemotes.splice(i,1);
					if(emote.oncomplete) emote.oncomplete.call(emote);
				}
			}
		}
		
		rafStart = t;
		window.requestAnimationFrame(animStep);
	}
	
	function emotesplosion(allowedEmotes) {
		// allowedEmotes can be a list of emotes (in which case we dont change it)
		// of a string, for example "ffz, bttv"
		if(typeof(allowedEmotes) === "string") {
			var types = allowedEmotes.toLowerCase().match(/\w+/g);
			allowedEmotes = [];
			for(var j=0;j<types.length;++j) {
				if("subscribers".startsWith(types[j])) for(var i=0;i<subEmotes.sub.length;++i) allowedEmotes.push(subEmotes.sub[i]);
				if("bttv" == types[j]) for(var i=0;i<subEmotes.bttv.length;++i) allowedEmotes.push(subEmotes.bttv[i]);
				if("bttv" == types[j] && $scope.settings.gif || "gif" == types[j]) for(var i=0;i<subEmotes.gif.length;++i) allowedEmotes.push(subEmotes.gif[i]);
				if("ffz" == types[j]) for(var i=0;i<subEmotes.ffz.length;++i) allowedEmotes.push(subEmotes.ffz[i]);
			}
		// or undefined
		} else {
			if(allowedEmotes === undefined) {
				allowedEmotes = [];
			}
		}
		
		// if no emotes have been added so far, we try sub emotes
		if(allowedEmotes.length == 0) {
			for(var i=0;i<subEmotes.sub.length;++i) allowedEmotes.push(subEmotes.sub[i]);
		}
		// still none (not partnered)? FFZ+BTTV emotes if allowed by the settings
		if(allowedEmotes.length == 0) {
			if($scope.settings.bttv) for(var i=0;i<subEmotes.bttv.length;++i) allowedEmotes.push(subEmotes.bttv[i]);
			if($scope.settings.bttv && $scope.settings.gif) for(var i=0;i<subEmotes.gif.length;++i) allowedEmotes.push(subEmotes.gif[i]);
			if($scope.settings.ffz) for(var i=0;i<subEmotes.ffz.length;++i) allowedEmotes.push(subEmotes.ffz[i]);
		}
		// still none (not partnered, no FFZ or BTTV emotes), add global emotes (Those exist)
		if(allowedEmotes.length == 0) {
			allowedEmotes = globalEmotes;
		}
		emotesplosions[$scope.settings.emotesplosiontype](ctx, $scope.settings, allowedEmotes, animatedemotes);
	}
	
	function handleCommand(w,data) {
		split = data.text.trim().toLowerCase().split(" ");
		if(split.length >= 2 && (data.nick === channel || data.nick === "cbenni" || data.nick === "onslaught" || $scope.settings.mods && data.tags.mod === "1")) {
			if(split[1] == "emotesplosiontest") {
				if(split.length >= 3) {
					emotesplosion(split.slice(2).join(" "));
				} else {
					handleMessage(null, ":twitchnotify!twitchnotify@twitchnotify.tmi.twitch.tv PRIVMSG #"+channel+" :test_user just subscribed!");
				}
			} else if(split[1] == "customsplosion") {
				var allowedEmotes = [];
				for(var i=0;i<data.emotes.length;i++) {
					var emote = data.emotes[i];
					var imgPath = "//static-cdn.jtvnw.net/emoticons/v1/"+emote.id+"/3.0";
					allowedEmotes.push({"url":imgPath});
				}
				var usplit = data.text.split(" ");
				for(var i=2;i<usplit.length;++i) {
					var emote = extraEmotes[usplit[i]];
					if(emote !== undefined && $scope.settings[emote.type] && (emote.type != "gif" || $scope.settings.bttv)) {
						allowedEmotes.push(emote);
					}
				}
				emotesplosion(allowedEmotes);
			} else if(split.length == 3) {
				var oldval = $scope.settings[split[1]];
				var res = setSetting(split[1],split[2]);
				if(res !== undefined && oldval !== res) alertify.success(data.nick+" set setting "+split[1]+" from "+oldval+" to "+res);
			}
		}
	}
	
	


	function handleMessage(w,data) {
		var parsedmessage = parseIRCMessage(data);
		log(data);
		console.log(""+data);
		if(parsedmessage[STATE_COMMAND] == "PING") w.send('PONG');
		else if (parsedmessage[STATE_COMMAND]=="PRIVMSG") {
			var extmsg = getPrivmsgInfo(parsedmessage);
			if(extmsg.text.toLowerCase().startsWith("!kappagen")) {
				handleCommand(w,extmsg);
				return;
			}
			else if($scope.settings.subonly && extmsg.tags && !gw_subs[extmsg.nick] && extmsg.tags.subscriber !== "1" && extmsg.tags.mod !== "1" && extmsg.nick != channel) return; // do nothing for plebs when sub only mode is active.
			else if(extmsg.nick === "twitchnotify") {
				if(getEmotesplosionTriggers("s"))emotesplosion();
				return;
			} else if($scope.settings.once) {
				for(var i=0;i<extmsg.emoteids.length;i++) {
					var emoteid = extmsg.emoteids[i];
					var imgPath = "//static-cdn.jtvnw.net/emoticons/v1/"+emoteid+"/3.0";
					// use the saved sub emotes if present.
					drawEmote(extmsg.nick, id2SubEmote[emoteid] || {url: imgPath, type: "twitch", channel: false});
				}
			} else {
				for(var i=0;i<extmsg.emotes.length;i++) {
					var emote = extmsg.emotes[i];
					log("drawing emote with id "+emote.id);
					var imgPath = "//static-cdn.jtvnw.net/emoticons/v1/"+emote.id+"/3.0";
					// use the saved sub emotes if present.
					drawEmote(extmsg.nick, id2SubEmote[emote.id] || {url: imgPath, type: "twitch", channel: false});
				}
			}
			var foundemotes = {};
			var words = parsedmessage[STATE_TRAILING].trim().split(" ")
			for(var i=0;i<words.length;++i) {
				var emote = extraEmotes[words[i]];
				if(emote !== undefined && $scope.settings[emote.type] && (emote.type != "gif" || $scope.settings.bttv)) {
					if(!$scope.settings.once || !foundemotes[emote]) {
						drawEmote(extmsg.nick, emote);
						foundemotes[emote] = true;
					}
				}
			}
		}
		else if (parsedmessage[STATE_COMMAND] == "USERNOTICE") {
			if(parsedmessage[STATE_V3]
				&& parsedmessage[STATE_V3]["msg-id"] == "resub"
				&& getEmotesplosionTriggers("s")) {
					emotesplosion();
			}
		}
	}


	extraEmotes = {};
	function loadFFZ(response) {
		var sets = Object.keys(response.data.sets);
		for(var i=0;i<sets.length;++i){
			var set = response.data.sets[sets[i]];
			for(var j=0;j<set.emoticons.length;++j) {
				var x = set.emoticons[j].urls;
				var emote = {"url": (x[4] || x[2] || x[1]), "type": "ffz", "channel": false};
				// non-channel emotes have a lower precedence
				if(!extraEmotes[set.emoticons[j].name]) extraEmotes[set.emoticons[j].name] = emote;
			}
		}
	}
	function loadFFZChannel(response) {
		var sets = Object.keys(response.data.sets);
		for(var i=0;i<sets.length;++i){
			var set = response.data.sets[sets[i]];
			for(var j=0;j<set.emoticons.length;++j) {
				var x = set.emoticons[j].urls;
				var emote = {"url": (x[4] || x[2] || x[1]), "type": "ffz", "channel": true};
				extraEmotes[set.emoticons[j].name] = emote;
				subEmotes["ffz"].push(emote);
			}
		}
	}
	function loadBTTV(response) {
		for(var i=0;i<response.data.emotes.length;++i){
			var emote = response.data.emotes[i];
			if(emote.imageType == "gif") {
				var emote = {"url": CORSProvider + response.data.urlTemplate.replace("{{id}}",emote.id).replace("{{image}}","3x"), type: "gif", code: emote.code, "channel": false};
			} else {
				var emote = {"url": response.data.urlTemplate.replace("{{id}}",emote.id).replace("{{image}}","3x"), type: "bttv", code: emote.code, "channel": false};
			}
			// non-channel emotes have a lower precedence
			if(!extraEmotes[emote.code]) extraEmotes[emote.code] = emote;
		}
	}
	function loadBTTVChannel(response) {
		for(var i=0;i<response.data.emotes.length;++i){
			var emote = response.data.emotes[i];
			if(emote.imageType == "gif") {
				var emote = {"url": CORSProvider + response.data.urlTemplate.replace("{{id}}",emote.id).replace("{{image}}","3x"), type: "gif", code: emote.code, "channel": true};
			} else {
				var emote = {"url": response.data.urlTemplate.replace("{{id}}",emote.id).replace("{{image}}","3x"), type: "bttv", code: emote.code, "channel": true};
			}
			extraEmotes[emote.code] = emote;
			subEmotes[emote.type].push(emote);
		}
	}
	var globalEmotes = [];
	function loadGlobalEmotes(response) {
		var set = response.data.emoticon_sets[0];
		for(var i=0;i<set.length;++i) {
			var emote = set[i];
			globalEmotes.push({"url":"//static-cdn.jtvnw.net/emoticons/v1/"+emote.id+"/3.0", type: emote.imageType == "global", "channel": false});
		}
	}
	
	
	var getEmotesplosionTriggers = function(type) {
		if(!$scope.settings.emotesplosions) return false;
		var triggers = $scope.settings.emotesplosiontriggers.split("+");
		for(var i=0;i<triggers.length;++i){
			if(triggers[i][0] === type) return true;
		}
		return false;
	}
	// follows
	var lastfollowers = undefined;
	function updateFollows()
	{
		if(getEmotesplosionTriggers("f")) {
			$http.jsonp("//api.twitch.tv/kraken/channels/"+channel+"/follows?limit=1&callback=JSON_CALLBACK&client_id="+twitchAuth.clientId).then(function (response) {
				if(response.data.follows.length>0)
				{
					var newestfollower = response.data.follows[0].user.name;
					if(lastfollowers === undefined) lastfollowers=[newestfollower];
					if(lastfollowers.indexOf(newestfollower)<0)
					{
						emotesplosion();
						lastfollowers.push(newestfollower)
					}
				}
				else if(lastfollowers === undefined) lastfollowers = [];
			});
		}
	}
		
	var settingsLoaded = function() {
		updateFollows(channel);
		setInterval(updateFollows,10000);
		// do gamewisp stuff (load list of subs, connect singularity)
		gamewispConnect();
		$http.get("//api.betterttv.net/2/channels/"+channel).then(loadBTTVChannel);
		$http.get("//api.betterttv.net/2/emotes").then(loadBTTV);
	}
	
	// load API data
	$http.get("//api.frankerfacez.com/v1/room/"+channel).then(loadFFZChannel);
	if(channel !== "cbenni") {
		$http.get("//api.frankerfacez.com/v1/room/cbenni").then(loadFFZ);
	}
	$http.get("//api.frankerfacez.com/v1/set/global").then(loadFFZ);
	$http.jsonp("//api.twitch.tv/kraken/chat/emoticon_images?emotesets=0&client_id="+twitchAuth.clientId+"&callback=JSON_CALLBACK").then(loadGlobalEmotes);
	
	var id2SubEmote = {};
	var subEmotes = {"sub":[], "ffz":[], "bttv":[], "gif": []};
	$http.jsonp("//api.twitch.tv/api/channels/"+channel+"/product?callback=JSON_CALLBACK&client_id="+twitchAuth.clientId).then(function( response ) {
		var emotes = response.data.emoticons;
		for(var i=0;i<emotes.length;++i) {
			var emote = emotes[i];
			if(emote.state === "active") {
				var emoteObj = {type:"sub",url:"//static-cdn.jtvnw.net/emoticons/v1/"+emote.id+"/3.0", "channel": true};
				id2SubEmote[emote.id] = emoteObj;
				subEmotes.sub.push(emoteObj);
			}
		}
	});
	
	var w=new WebSocket('wss://irc-ws.chat.twitch.tv');
	w.onmessage=function(e){
		var lines = e.data.split("\r\n");
		for(var i=0;i<lines.length;++i){
			var line = lines[i];
			if(line.length) handleMessage(w,line);
		}
	}

	w.onopen=function(e) {
		w.send('CAP REQ :twitch.tv/tags twitch.tv/commands');
		w.send('NICK justinfan1');
		w.send('JOIN #'+channel);
	}
	
	// initialize rendering
	window.requestAnimationFrame(animStep);
	
	window.addEventListener('resize', resizeCanvas, false);
    function resizeCanvas() {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
    }
    resizeCanvas();
	
	
	var singularity = null;
	var lastGWToken = null;
	var gw_subs = {};
	
	// singularity: socket.io connection to gamewisp
	
	var gamewispConnect = function() {
		if(!$scope.settings) return;
		var gw = $scope.settings.gamewisp;
		if(gw) {
			if(gw.token != lastGWToken) {
				if(singularity) {
					singularity.disconnect();
					singularity = null;
				}
				// get gamewisp subs
				$http.jsonp(gamewispAuth.subsUrl+"?token="+gw.token+"&callback=JSON_CALLBACK").then(function(subs) {
					gw_subs = {};
					for(var i=0;i<subs.data.length;++i) {
						var sub = subs.data[i];
						var status = sub.status;
						var nick = sub.user.data.username.toLowerCase();
						if(status == "active" || status == "trial") {
							gw_subs[nick] = true;
						}
					}
				}, function(error) {
					console.error(error);
				});
				
				lastGWToken = gw.token;
				console.log("Connecting to gamewisp channel");
			}
			if(!singularity) {
				singularity = io("https://singularity.gamewisp.com");
				_sing = singularity;
				singularity.on("connect", function(){
					console.log("Singularity connected!");
					setTimeout(function() {
						singularity.emit("authentication", { key: gamewispAuth.clientId, access_token: gw.token });
					}, 10);
				});
				var session = null;
				singularity.on("authenticated", function(data){
					session = data.result.session;
					console.log("Singularity authenticated!");
					singularity.emit("channel-connect", { access_token: $scope.settings.gamewisp.token });
					//singularity.emit("channel-subscribers", { status: "all", benefits: true, session: session, access_token: gw.token });
				});
				
				singularity.on("app-channel-connected", function(data){
					console.log("Connected to gamewisp channel!");
				});
				
				singularity.on("subscriber-new", function(data) {
					if(getEmotesplosionTriggers("s")) emotesplosion();
					var nick = JSON.parse(data).data.usernames.twitch;
					if(nick) {
						gw_subs[nick] = true;
					}
				});
				
				singularity.on("subscriber-anniversary", function(data) {
					if(getEmotesplosionTriggers("s")) emotesplosion();
				});
				
				singularity.on("app-channel-subscribers", function(data) {
					console.log(data);
				});
			}
		} else {
			lastGWToken = null;
			if(singularity) {
				singularity.disconnect();
				singularity = null;
			}
		}
	}
	$scope.$watch("settings.gamewisp.token", gamewispConnect);
	
	
	// load settings
	if(params.cuid) {
		var cluster = params.cuid.substring(0,1);
		console.log("//kappagen-"+cluster+".firebaseio.com/"+params.cuid);
		var ref = new Firebase("//kappagen-"+cluster+".firebaseio.com/"+params.cuid);
		var syncObject = $firebaseObject(ref);
		syncObject.$bindTo($scope, "settings");
		
		syncObject.$loaded().then(function(data) {
			if(data.v === undefined) {
				$scope.settings = angular.copy(defaults);
			}
			$scope.loaded = true;
			var defaultkeys = Object.keys(defaults);
			for(var i=0;i<defaultkeys.length;++i) {
				var key = defaultkeys[i];
				if($scope.settings[key] === undefined) $scope.settings[key] = defaults[key];
			}
			settingsLoaded();
		});
	} else {
		$scope.settings = angular.copy(defaults);
		var paramkeys = Object.keys(params);
		for(var i=0;i<paramkeys.length;++i) {
			var key = paramkeys[i];
			var val = params[key];
			if(key === "channel") continue;
			if(val[0] == "{") $scope.settings[key] = JSON.parse(val);
			else $scope.settings[key] = val;
		}
		settingsLoaded();
	}
	
});