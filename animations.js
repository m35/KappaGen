/*
Returns a random position within a spawnzone. 
Takes one param:
spawnzone - the spawnzone as a string, comma seperated integers, like "x1,y1,x2,y2"
*/
function getSpawn(spawnzone) {
	let m = spawnzone.match(/\d+/g);
	let rect = {x1:0, y1: 0, x2: 100, y2: 100};
	if (m && m.length == 4) {
		rect = {};
		let split = settings.spawnzone.split(",");
		rect.x1 = parseFloat(m[0])/100.0;
		rect.y1 = parseFloat(m[1])/100.0;
		rect.x2 = parseFloat(m[2])/100.0;
		rect.y2 = parseFloat(m[3])/100.0;
	}
	rect.h = rect.y2 - rect.y1;
	rect.w = rect.x2 - rect.x1;
	return rect;
}

function basicAnimationParams(settings, type) {
	var pos = getSpawn(settings.spawnzone[type]);
	return {"type": type, x: pos[0], y: pos[1], duration: settings.duration}
}

/*
these functions return an emote object.
they take one param:
settings - the whole settings object
*/
initializers = {
	"zoom": function(settings){
		return basicAnimationParams(settings, "zoom");
	},
	"blur": function(settings){
		return basicAnimationParams(settings, "blur");
	},
	"bubble": function(settings){
		let ap = basicAnimationParams(settings, "bubble");
		ap.vy = 0.5*$(document).height()*(1+Math.random());
		ap.amp = settings.size*(1+Math.random())*0.75;
		ap.freq = 2*Math.PI*(1+Math.random());
		ap.phase = Math.random()*Math.PI*2;
		return ap;
	},
	"bounce": function(settings){
		let ap = basicAnimationParams(settings, "bubble");
		ap.vy = Math.random()*settings.size;
		let dx1 = ap.x;
		let dx2 = $(document).width()-ap.x;
		ap.vx = (dx1<dx2?-dx1:dx2);
		return ap;
	},
	"random": function(settings) {
		let animations = ["bubble","blur","zoom","bounce"];
		return initializers[animations[Math.floor(Math.random()*animations.length)]](settings);
	}
}

/*
these functions draw an animated emote.
they take 4 params:
settings - the whole settings object
frameTime - time since the last frame, as a fraction of the total duration
age - time since animation start, as a fraction of the total duration
emote - the emote object that was used to create the emote
*/
animations = {
	"bubble": function(ctx, settings, frameTime, age, emote) {
		let ap = emote.animation;
		let x = ap.x + Math.sin(ap.phase + age * ap.freq) * ap.amp;
		let y = ap.y + ap.vy * age;
		let w = emote.w * settings.size/emote.h;
		ctx.drawImage(ap.img, x-w/2, y-settings.size/2, w, settings.size);
	},
	"blur": function(ctx, settings, frameTime, age, emote) {
		let ap = emote.animation;
		let w = emote.w * settings.size/emote.h;
		ctx.globalAlpha = sawTooth(age);
		ctx.drawImage(ap.img, ap.x-w/2, ap.y-settings.size/2, w, settings.size);
		ctx.globalAlpha = 1;
	},
	"zoom": function(ctx, settings, frameTime, age, emote) {
		let ap = emote.animation;
		let zoom = sawTooth(age);
		let w = emote.w * settings.size/emote.h*zoom;
		ctx.drawImage(ap.img, ap.x-w/2, ap.y-settings.size/2*zoom, w, settings.size*zoom);
	},
	"bounce": function(ctx, settings, frameTime, age, emote) {
		let ap = emote.animation;
		let sh = $(document).height();
		let gravity = 4*sh;
		ap.vy += gravity*frameTime;
		ap.y += ap.vy*frameTime;
		ap.x += ap.vx*frameTime;
		if((ap.y+settings.size/2) >= sh) {
			ap.vy = -Math.abs(ap.vy);
			ap.y = sh-settings.size/2;
		}
		let w = emote.w * settings.size/emote.h;
		ctx.drawImage(ap.img, ap.x-w/2, ap.y-settings.size/2, w, settings.size);
	},
	"fireworkrocket": function(ctx, settings, frametime, age, emote) {
		let ap = emote.animation;
		let t = age;
		let x = t*ap.targetx+(1-t)*ap.x;
		let y = t*ap.targety+(1-t)*ap.y;
		let w = emote.w * settings.size/emote.h;
		ctx.drawImage(ap.img, x-w/2, y-settings.size/2, w, settings.size);
	},
	"fireworkspark": function(ctx, settings, frametime, age, emote) {
		let ap = emote.animation;
		let t = age;
		let x = ap.x+age*ap.vx;
		let y = ap.y+age*ap.vy;
		let agesq = age * age;
		let intensity = 1-agesq*agesq;
		let w = emote.w * settings.size/emote.h*intensity;
		ctx.globalAlpha = intensity;
		ctx.drawImage(ap.img, x-w/2, y-settings.size/2, w, settings.size * intensity);
		ctx.globalAlpha = 1;
	},
	"fountain": function(ctx, settings, frametime, age, emote) {
		let ap = emote.animation;
		let sh = $(document).height();
		ap.vy += emote.gravity*frameTime;
		ap.y += ap.vy*frameTime;
		ap.x += ap.vx*frameTime;
		let w = emote.w * settings.size/emote.h;
		ctx.drawImage(ap.img, ap.x-w/2, ap.y-settings.size/2, w, settings.size);
	},
	"explosion": function(ctx, settings, frametime, age, emote) {
		let ap = emote.animation;
		let sh = $(document).height();
		ap.y += ap.vy*frameTime;
		ap.x += ap.vx*frameTime;
		let w = emote.w * settings.size/emote.h;
		ctx.drawImage(ap.img, ap.x-w/2, ap.y-settings.size/2, w, settings.size);
	}
}


		
emotesplosions = {
	random: function(allowedEmotes) {
		var esk = Object.keys(emotesplosiontypes);
		emotesplosiontypes[esk[Math.floor(Math.random()*esk.length)]](allowedEmotes);
	},
	explosion: function (settings, allowedEmotes, animatedemotes) {
		let pos = getSpawn(settings.emotesplosionzone["firework"]);
		let fdx = Math.max(pos[0], $(document).width()-pos[0]);
		let fdy = Math.max(pos[1], $(document).height()-pos[1]);
		let furthestdistance = Math.sqrt(fdx*fdx+fdy*fdy);
		let initialspeed = furthestdistance/settings.emotesplosionduration;
		for(let i=1;i<settings.emotesplosion;++i) {
			emote = allowedEmotes[Math.floor(Math.random()*allowedEmotes.length)];
			let velocity = initialspeed * (1+Math.random())/2; // randomize initial velocity
			// choose some initial direction
			let vx = Math.random()-0.5; 
			let vy = Math.random()-0.5;
			// normalize it and bring it to the velocity
			let nf = velocity/Math.sqrt(vx*vx+vy*vy);
			vx *= nf;
			vy *= nf;
			let ap = {"type": "explosion", x: pos[0], y: pos[1], vx: vx, vy: vy, duration: settings.duration}
			let img = new Image();
			img.onload = function() {
				sparks.push({url: this.src, animation: ap, img: this, w: this.width, h: this.height});
			}
			img.src = emote.url;
		}
	},

	firework: function (settings, allowedEmotes, animatedemotes) {
		let pos = getSpawn(settings.emotesplosionzone["firework"]);
		let sparks = [];
		let emote;
		for(let i=1;i<settings.emotesplosion;++i) {
			emote = allowedEmotes[Math.floor(Math.random()*allowedEmotes.length)];
			
			let ap = {"type": "fireworkspark", x: pos[0], y: pos[1], duration: settings.duration}
			
			let img = new Image();
			img.onload = function() {
				sparks.push({url: this.src, animation: ap, img: this, w: this.width, h: this.height});
			}
			img.src = emote.url;
		}
		
		
		emote = allowedEmotes[Math.floor(Math.random()*allowedEmotes.length)];
		let projap = {
			type: "fireworkrocket",
			x: $(document).width()/2, 
			y: $(document).height()+settings.size,
			targetx: pos[0],
			targety: pos[1],
			duration: settings.duration,
			sparks: sparks
		};
		let img = new Image();
		img.onload = function() {
			animatedemotes.push({
				url: emote.url, 
				animation: projap, 
				start: performance.now(), 
				img: this, 
				w: this.width, h: this.height,
				oncomplete: function() {
					for(let i=0;i<this.animation.sparks;++i) {
						this.animation.sparks[i].start = performance.now();
						animatedemotes.push(this.animation.sparks[i]);
					}
				}
			});
		}
		img.src = emote.url;
	},
	
	fountain: function (settings, allowedEmotes, animatedemotes) {
		let pos = getSpawn(settings.emotesplosionzone["fountain"]);
		let y0 = pos[1]; // start y value
		let y1 = 0; // peak y value (yes, it is zero, since its the highest an emote can apex at)
		let y2 = $(document).height()+settings.size; // final y value (below the lower edge of the screen)
		let gravity = 4*y0-8*y1+4*y2;
		let v0 = -3*y0+4*y1-y2; // initial maximum velocity
		for(let i=0;i<settings.emotesplosion;++i) {
			let velocity = v0 * (1+Math.random())/2; // randomize initial velocity
			// choose some initial direction (4 times as much vertical component)
			let vx = Math.random()-0.5; 
			let vy = Math.random()*2;
			// normalize it and bring it to the velocity
			let nf = velocity/Math.sqrt(vx*vx+vy*vy);
			vx *= nf;
			vy *= nf;
			let ap = {
				"type": type, 
				x: pos[0], y: pos[1], 
				vx: vx, vy: vy, 
				gravity: gravity,
				duration: settings.duration,
				start: performance.now()+i*settings.emotesplosionduration*1000/settings.emotesplosion
			}
			let img = new Image();
			img.onload = function() {
				animatedemotes.push({
					url: emote.url, 
					animation: projap, 
					start: performance.now(), 
					img: this, 
					w: this.width, h: this.height
				});
			}
			img.src = emote.url;
		}
	},
	
	bubbles: function (settings, allowedEmotes, animatedemotes) {
		for(var i=0;i<settings.emotesplosion;++i) {
			var pos = getSpawn(settings.emotesplosionzone["bubbles"]);
			let ap = {
				type: type, 
				x: pos[0], y: pos[1], 
				duration: settings.duration,
				vy: 0.5*$(document).height()*(1+Math.random()),
				amp: settings.size*(1+Math.random())*0.75,
				freq: 2*Math.PI*(1+Math.random()),
				phase: Math.random()*Math.PI*2
			}
			let emote = allowedEmotes[Math.floor(Math.random()*allowedEmotes.length)];
			let img = new Image();
			img.onload = function() {
				animatedemotes.push({
					url: emote.url, 
					animation: ap, 
					start: performance.now()+i*settings.emotesplosionduration*1000/settings.emotesplosion, 
					img: this, 
					w: this.width, h: this.height
				});
			}
			img.src = emote.url;
		}
	}
}
