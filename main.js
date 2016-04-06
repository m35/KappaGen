function log(msg) {
	$(".debug").prepend(msg+"<br>");
}
setInterval(function(){$(".debug").empty()},100000);

function parseQueryParams(url) {
	let res = {};
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

var app = angular.module("app",["firebase"]);

app.controller("AppCtrl",function($scope, $firebaseObject, $sce, $window){
	$scope.loaded = false;
	var params = parseQueryParams(window.location.search);
	var channel = params.channel.toLowerCase();
	
	var settingsLoaded = function() {
		
	}
	
	if(params.cuid) {
		var cluster = params.cuid.substring(0,1);
		console.log("https://kappagen-"+cluster+".firebaseio.com/"+params.cuid);
		var ref = new Firebase("https://kappagen-"+cluster+".firebaseio.com/"+params.cuid);
		var syncObject = $firebaseObject(ref);
		syncObject.$bindTo($scope, "settings");
		
		syncObject.$loaded().then(function(data) {
			if(data.v === undefined) {
				$scope.settings = jQuery.extend({},defaults);
			}
			$scope.loaded = true;
			let defaultkeys = Object.keys(defaults);
			for(let i=0;i<defaultkeys.length;++i) {
				var key = defaultkeys[i];
				if($scope.settings[key] === undefined) $scope.settings[key] = defaults[key];
			}
			settingsLoaded();
		});
	} else {
		$scope.settings = jQuery.extend(jQuery.extend({},defaults),params);
		settingsLoaded();
	}
	
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
			let emotes = response.emoticons;
			for(let i=0;i<emotes.length;++i) {
				let emote = emotes[i];
				if(emote.state === "active") {
					subemotes.sub.push({type:"sub",url:"http://static-cdn.jtvnw.net/emoticons/v1/"+emote.id+"/3.0"});
				}
			}
		}
	});
	
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
	function drawEmote(user, imgPath) {
		log("drawing emote "+imgPath);
		if(getUserAccount(user)<1000) {
			let ratelimit = getRateLimit(settings.max);
			if(ratelimit != 0)addUserAccount(user, ratelimit+1); // +1 to account for execution time, preventing limit violations.
			
			var animationparams = initializers[settings.animation]($scope.settings);
			let img = new Image();
			img.onload = function() {
				animatedemotes.push({url: imgPath, animation: animationparams, start: performance.now(), img: this, w: this.width, h: this.height});
			}
			img.src = imgPath;
		}
	}
	
	function sawTooth(x){return 1-Math.abs(2*x-1)}
	
	var canvas = $("#emoteScreen")[0];
	var ctx = canvas.getContext('2d');
	
	var getEmotesplosionTriggers = function(type) {
		var triggers = settings.emotesplosiontriggers.split("+");
		for(var i=0;i<triggers.length;++i){
			if(triggers[i][0] === type) return true;
		}
		return false;
	}
	
	
	function setSetting(key, val) {
		if(defaults[key] === undefined) {
			toastr.error("Invalid setting "+key);
			return;
		} else {
			var type = typeof(defaults[key]);
			if(type === "number") {
				val = parseFloat(val);
				if(isNaN(val)) {
					toastr.error("Invalid value '"+val+"' for integer setting "+key);
					return;
				}
			} else if(type === "boolean") {
				if(val === "true" || val === "on" || val === true) val = true;
				else if(val === "false" || val === "off" || val === false) val = false;
				else {
					toastr.error("Invalid value '"+val+"' for boolean setting "+key);
					return;
				}
			}
		}
		
		settings[key] = val;
		return val;
	}
	
	var rafStart = performance.now();
	function animStep(t){
        ctx.clearRect(0, 0, canvas.width, canvas.height);
		let f = t - rafStart;
		for(var i=animatedemotes.length-1;i>=0;--i) {
			let emote = animatedemotes[i];
			let speedmult = 1/(1000.0*emote.animation.duration);
			let age = (t-emote.start)*speedmult;
			if(age >= 0) {
				animations[emote.animation.type](ctx, f*speedmult,age,emote);
				if(age > 1) {
					emotes.splice(j,1);
					if(emote.oncomplete) emote.oncomplete.call(emote);
				}
			}
		}
		
		rafStart = t;
		window.requestAnimationFrame(animStep);
	}
	window.requestAnimationFrame(animStep);
	
	window.addEventListener('resize', resizeCanvas, false);
    function resizeCanvas() {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
    }
    resizeCanvas();
	
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
			else if(settings.subonly && extmsg.tags.subscriber !== "1" && extmsg.tags.mod !== "1") return; // do nothing for plebs when sub only mode is active.
			else if(extmsg.nick === "twitchnotify") {
				if(getEmotesplosionTriggers("s"))emotesplosion();
				return;
			} else if(settings.once) {
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
						let newestfollower = data.follows[0].user.name;
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