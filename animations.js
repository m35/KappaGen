/*
Returns a random position within a spawnzone. 
Takes one param:
spawnzone - the spawnzone as a string, comma seperated integers, like "x1,y1,x2,y2"
*/
function getSpawn(ctx, spawnzone) {
	var m = spawnzone.match(/\d+/g);
	var x1,x2,y1,y2;
	var w = ctx.canvas.width;
	var h = ctx.canvas.height;
	if (m && m.length == 4) {
		var split = spawnzone.split(",");
		x1 = parseFloat(m[0])/100.0;
		y1 = parseFloat(m[1])/100.0;
		x2 = parseFloat(m[2])/100.0;
		y2 = parseFloat(m[3])/100.0;
	}
	return [Math.round(w*(x1+Math.random()*(x2-x1))), Math.round(h*(y1+Math.random()*(y2-y1)))];
}

function zigZag(x){return 1-Math.abs(2*x-1)}

function clamp(val, min, max) {
	return Math.min(Math.max(val, min), max);
};

function basicAnimationParams(ctx, settings, type) {
	var pos = getSpawn(ctx, settings.spawnzone[type]);
	return {"type": type, x: pos[0], y: pos[1], duration: settings.duration}
}

/*
these functions return an emote object.
they take one param:
settings - the whole settings object
*/
initializers = {
	"zoom": function(ctx, settings){
		return basicAnimationParams(ctx, settings, "zoom");
	},
	"blur": function(ctx, settings){
		return basicAnimationParams(ctx, settings, "blur");
	},
	"bubble": function(ctx, settings){
		var ap = basicAnimationParams(ctx, settings, "bubble");
		ap.vy = -0.5*ctx.canvas.height*(1+Math.random());
		ap.amp = settings.size*(1+Math.random())*0.5;
		ap.freq = Math.PI*(1+Math.random());
		ap.phase = Math.random()*Math.PI*2;
		return ap;
	},
	"bounce": function(ctx, settings){
		var ap = basicAnimationParams(ctx, settings, "bounce");
		ap.vy = Math.random()*settings.size-2*ap.y;
		ap.goleft = Math.random()>0.5;
		ap.canbounce = true;
		return ap;
	},
	"random": function(ctx, settings) {
		var animations = ["bubble","blur","zoom","bounce"];
		return initializers[animations[Math.floor(Math.random()*animations.length)]](ctx, settings);
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
		var ap = emote.animation;
		var x = ap.x + Math.sin(ap.phase + age * ap.freq) * ap.amp;
		var y = ap.y + ap.vy * age;
		var h = settings.size;
		if(age < 0.10) {
			h *= age*12;
		} else if(age < 0.125) {
			h *= 1.2-(age-0.1)*8;
		}
		var w = emote.w * h/emote.h;
		if(age > 0.75) ctx.globalAlpha = clamp(4-4*age,0,1);
		ctx.drawImage(emote.img, x-w/2, y-h/2, w, h);
		ctx.globalAlpha = 1;
	},
	"blur": function(ctx, settings, frameTime, age, emote) {
		var ap = emote.animation;
		var w = emote.w * settings.size/emote.h;
		if(age < 0.25) {
			ctx.globalAlpha = clamp(age*4,0,1);
		} else if(age > 0.75) {
			ctx.globalAlpha = clamp(4-age*4,0,1);
		}
		ctx.drawImage(emote.img, ap.x-w/2, ap.y-settings.size/2, w, settings.size);
		ctx.globalAlpha = 1;
	},
	"zoom": function(ctx, settings, frameTime, age, emote) {
		var ap = emote.animation;
		var zoom = 1;
		if(age < 0.25) {
			zoom = age*4;
		} else if(age > 0.75) {
			zoom = 4-age*4;
		}
		var w = emote.w * settings.size/emote.h*zoom;
		ctx.drawImage(emote.img, ap.x-w/2, ap.y-settings.size/2*zoom, w, settings.size*zoom);
	},
	"bounce": function(ctx, settings, frameTime, age, emote) {
		var ap = emote.animation;
		var sh = ctx.canvas.height;
		var gravity = 20*sh;
		var w = emote.w * settings.size/emote.h;
		var dx1 = ap.x+w;
		var dx2 = ctx.canvas.width-ap.x+w;
		var vx = (ap.goleft?-dx1:dx2);
		ap.vy += gravity*frameTime;
		ap.y += ap.vy*frameTime;
		var x = ap.x+vx*age;
		if((ap.y+settings.size/2) >= sh && ap.canbounce) {
			if(Math.abs(ap.vy) < (gravity*frameTime+100)) ap.canbounce = false;
			else {
				ap.vy = -Math.abs(ap.vy)*0.75;
				ap.y = sh-settings.size/2;
			}
		}
		ctx.drawImage(emote.img, x-w/2, ap.y-settings.size/2, w, settings.size);
	},
	"fireworkrocket": function(ctx, settings, frameTime, age, emote) {
		var ap = emote.animation;
		var t = age;
		var x = t*ap.targetx+(1-t)*ap.x;
		var y = t*ap.targety+(1-t)*ap.y;
		var w = emote.w * settings.size/emote.h;
		ctx.drawImage(emote.img, x-w/2, y-settings.size/2, w, settings.size);
	},
	"fireworkspark": function(ctx, settings, frameTime, age, emote) {
		var ap = emote.animation;
		var t = age;
		var x = ap.x+age*ap.vx;
		var y = ap.y+age*ap.vy;
		var agesq = age * age;
		var intensity = 1-agesq*agesq;
		var w = emote.w * settings.size/emote.h*intensity;
		ctx.globalAlpha = intensity;
		ctx.drawImage(emote.img, x-w/2, y-settings.size*intensity/2, w, settings.size * intensity);
		ctx.globalAlpha = 1;
	},
	"fountain": function(ctx, settings, frameTime, age, emote) {
		var ap = emote.animation;
		var sh = ctx.canvas.height;
		ap.vy += ap.gravity*frameTime;
		ap.y += ap.vy*frameTime;
		ap.x += ap.vx*frameTime;
		var w = emote.w * settings.size/emote.h;
		ctx.drawImage(emote.img, ap.x-w/2, ap.y-settings.size/2, w, settings.size);
	},
	"explosion": function(ctx, settings, frameTime, age, emote) {
		var ap = emote.animation;
		var sh = ctx.canvas.height;
		var y = ap.y + ap.vy*age;
		var x = ap.x + ap.vx*age;
		var w = emote.w * settings.size/emote.h;
		if(age > 0.75) ctx.globalAlpha = clamp(4-4*age,0,1);
		ctx.drawImage(emote.img, x-w/2, y-settings.size/2, w, settings.size);
		ctx.globalAlpha = 1;
	}
}


		
emotesplosions = {
	random: function(ctx, settings, allowedEmotes, animatedemotes) {
		var est = ["explosion","fountain","firework","bubbles"];
		emotesplosions[est[Math.floor(Math.random()*est.length)]](ctx, settings, allowedEmotes, animatedemotes);
	},
	explosion: function (ctx, settings, allowedEmotes, animatedemotes) {
		var pos = getSpawn(ctx, settings.emotesplosionzone["firework"]);
		var fdx = Math.max(pos[0], ctx.canvas.width-pos[0]);
		var fdy = Math.max(pos[1], ctx.canvas.height-pos[1]);
		var initialspeed = Math.max(fdx, fdy);
		for(var i=1;i<settings.emotesplosion;++i) {
			emote = allowedEmotes[Math.floor(Math.random()*allowedEmotes.length)];
			var velocity = initialspeed * (2+Math.random())/2; // randomize initial velocity
			// choose some initial direction
			var vx = Math.random()-0.5; 
			var vy = Math.random()-0.5;
			// normalize it and bring it to the velocity
			var nf = velocity/Math.sqrt(vx*vx+vy*vy);
			vx *= nf;
			vy *= nf;
			var ap = {"type": "explosion", x: pos[0], y: pos[1], vx: vx, vy: vy, duration: settings.duration, id: i}
			var img = new ImageEx(emote.url, emote.type == "gif");
			img.onload = function(that) { 
				return function() {
					animatedemotes.push({
						animation: that, 
						img: this,
						type: emote.type,
						w: this.width, h: this.height,
						start: performance.now()+that.id*settings.emotesplosionduration*1000/settings.emotesplosion
					});
				}
			}(ap);
		}
	},

	firework: function (ctx, settings, allowedEmotes, animatedemotes) {
		var sparks = [];
		var emote;
		var pos = getSpawn(ctx, settings.emotesplosionzone["firework"]);
		var fdx = Math.max(pos[0], ctx.canvas.width-pos[0]);
		var fdy = Math.max(pos[1], ctx.canvas.height-pos[1]);
		var initialspeed = Math.max(fdx, fdy);
		for(var i=1;i<settings.emotesplosion;++i) {
			emote = allowedEmotes[Math.floor(Math.random()*allowedEmotes.length)];
			
			var velocity = initialspeed * Math.random(); // randomize initial velocity
			// choose some direction
			var vx = Math.random()-0.5; 
			var vy = Math.random()-0.5;
			// normalize it and bring it to the velocity
			var nf = velocity/Math.sqrt(vx*vx+vy*vy);
			vx *= nf;
			vy *= nf;
			
			var ap = {"type": "fireworkspark", x: pos[0], y: pos[1], vx: vx, vy: vy, duration: 0.8*settings.emotesplosionduration, id: i}
			
			var img = new ImageEx(emote.url, emote.type == "gif");
			img.onload = function(that) { 
				return function() {
					sparks.push({url: this.src, animation: that, img: this, w: this.width, h: this.height, type: emote.type});
				}
			}(ap);
		}
		
		
		emote = allowedEmotes[Math.floor(Math.random()*allowedEmotes.length)];
		var projap = {
			type: "fireworkrocket",
			x: ctx.canvas.width/2, 
			y: ctx.canvas.height+settings.size,
			targetx: pos[0],
			targety: pos[1],
			duration: 0.2*settings.emotesplosionduration,
			sparks: sparks,
			id: -1
		};
		var img = new ImageEx(emote.url, emote.type == "gif");
		img.onload = function() {
			animatedemotes.push({
				animation: projap, 
				start: performance.now(), 
				img: this,
				type: emote.type,
				w: this.width, h: this.height,
				oncomplete: function() {
					for(var i=0;i<this.animation.sparks.length;++i) {
						this.animation.sparks[i].start = performance.now();
						animatedemotes.push(this.animation.sparks[i]);
					}
				}
			});
		}
	},
	
	fountain: function (ctx, settings, allowedEmotes, animatedemotes) {
		var pos = getSpawn(ctx, settings.emotesplosionzone["fountain"]);
		var y0 = pos[1]; // start y value
		var y1 = 0; // peak y value (yes, it is zero, since its the highest an emote can apex at)
		var y2 = ctx.canvas.height+settings.size; // final y value (below the lower edge of the screen)
		var v0 = -2*(y0+Math.sqrt(y2*y0)); // initial maximum velocity
		var gravity = 2*(y2-v0-y0);//2*y2 - 2*v0;
		for(var i=0;i<settings.emotesplosion;++i) {
			// choose some initial direction (4 times as much vertical component)
			var vx = Math.random()-0.5; 
			var vy = 1+Math.random();
			// normalize it and bring it to the velocity
			var nf = 1/Math.sqrt(vx*vx+vy*vy);
			vy *= v0 * 0.5 * (1+Math.random()) * nf;
			vx *= ctx.canvas.width * nf * (1+Math.random());
			var ap = {
				type: "fountain", 
				x: pos[0], y: pos[1], 
				vx: vx, vy: vy, 
				gravity: gravity,
				duration: settings.duration,
				id: i
			}
			var emote = allowedEmotes[Math.floor(Math.random()*allowedEmotes.length)];
			var img = new ImageEx(emote.url, emote.type == "gif");
			img.onload = function(that) { 
				return function() {
					animatedemotes.push({
						animation: that, 
						start: performance.now()+that.id*settings.emotesplosionduration*1000/settings.emotesplosion,
						img: this,
						type: emote.type,
						w: this.width, h: this.height
					});
				}
			}(ap);
		}
	},
	
	bubbles: function (ctx, settings, allowedEmotes, animatedemotes) {
		for(var i=0;i<settings.emotesplosion;++i) {
			var pos = getSpawn(ctx, settings.emotesplosionzone["bubbles"]);
			var ap = {
				type: "bubble", 
				x: pos[0], y: pos[1], 
				duration: settings.duration,
				vy: -0.5*ctx.canvas.height*(1+Math.random()),
				amp: settings.size*(1+Math.random())*0.5,
				freq: Math.PI*(1+Math.random()),
				phase: Math.random()*Math.PI*2,
				id: i
			}
			var emote = allowedEmotes[Math.floor(Math.random()*allowedEmotes.length)];
			var img = new ImageEx(emote.url, emote.type == "gif");
			img.onload = function(that) { 
				return function() {
					animatedemotes.push({
						animation: that, 
						start: performance.now()+that.id*settings.emotesplosionduration*1000/settings.emotesplosion, 
						img: this,
						type: emote.type,
						w: this.width, h: this.height
					});
				}
			}(ap);
		}
	}
}
