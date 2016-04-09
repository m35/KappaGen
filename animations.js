/*
Returns a random position within a spawnzone. 
Takes one param:
spawnzone - the spawnzone as a string, comma seperated integers, like "x1,y1,x2,y2"
*/
function getSpawn(ctx, spawnzone) {
	let m = spawnzone.match(/\d+/g);
	let x1,x2,y1,y2;
	let w = ctx.canvas.width;
	let h = ctx.canvas.height;
	if (m && m.length == 4) {
		let split = spawnzone.split(",");
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
		let ap = basicAnimationParams(ctx, settings, "bubble");
		ap.vy = -0.5*ctx.canvas.height*(1+Math.random());
		ap.amp = settings.size*(1+Math.random())*0.5;
		ap.freq = Math.PI*(1+Math.random());
		ap.phase = Math.random()*Math.PI*2;
		return ap;
	},
	"bounce": function(ctx, settings){
		let ap = basicAnimationParams(ctx, settings, "bubble");
		ap.vy = Math.random()*settings.size;
		let dx1 = ap.x;
		let dx2 = ctx.canvas.width-ap.x;
		ap.vx = (dx1<dx2?-dx1:dx2);
		return ap;
	},
	"random": function(ctx, settings) {
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
		if(age > 0.75) ctx.globalAlpha = clamp(4-4*age,0,1);
		ctx.drawImage(emote.img, x-w/2, y-settings.size/2, w, settings.size);
		ctx.globalAlpha = 1;
	},
	"blur": function(ctx, settings, frameTime, age, emote) {
		let ap = emote.animation;
		let w = emote.w * settings.size/emote.h;
		if(age < 0.25) {
			ctx.globalAlpha = age*4;
		} else if(age > 0.75) {
			ctx.globalAlpha = 4-age*4;
		}
		ctx.drawImage(emote.img, ap.x-w/2, ap.y-settings.size/2, w, settings.size);
		ctx.globalAlpha = 1;
	},
	"zoom": function(ctx, settings, frameTime, age, emote) {
		let ap = emote.animation;
		let zoom = 1;
		if(age < 0.25) {
			zoom = age*4;
		} else if(age > 0.75) {
			zoom = 4-age*4;
		}
		let w = emote.w * settings.size/emote.h*zoom;
		ctx.drawImage(emote.img, ap.x-w/2, ap.y-settings.size/2*zoom, w, settings.size*zoom);
	},
	"bounce": function(ctx, settings, frameTime, age, emote) {
		let ap = emote.animation;
		let sh = ctx.canvas.height;
		let gravity = 4*sh;
		ap.vy += gravity*frameTime;
		ap.y += ap.vy*frameTime;
		ap.x += ap.vx*frameTime;
		if((ap.y+settings.size/2) >= sh) {
			ap.vy = -Math.abs(ap.vy);
			ap.y = sh-settings.size/2;
		}
		let w = emote.w * settings.size/emote.h;
		ctx.drawImage(emote.img, ap.x-w/2, ap.y-settings.size/2, w, settings.size);
	},
	"fireworkrocket": function(ctx, settings, frameTime, age, emote) {
		let ap = emote.animation;
		let t = age;
		let x = t*ap.targetx+(1-t)*ap.x;
		let y = t*ap.targety+(1-t)*ap.y;
		let w = emote.w * settings.size/emote.h;
		ctx.drawImage(emote.img, x-w/2, y-settings.size/2, w, settings.size);
	},
	"fireworkspark": function(ctx, settings, frameTime, age, emote) {
		let ap = emote.animation;
		let t = age;
		let x = ap.x+age*ap.vx;
		let y = ap.y+age*ap.vy;
		let agesq = age * age;
		let intensity = 1-agesq*agesq;
		let w = emote.w * settings.size/emote.h*intensity;
		ctx.globalAlpha = intensity;
		ctx.drawImage(emote.img, x-w/2, y-settings.size*intensity/2, w, settings.size * intensity);
		ctx.globalAlpha = 1;
	},
	"fountain": function(ctx, settings, frameTime, age, emote) {
		let ap = emote.animation;
		let sh = ctx.canvas.height;
		ap.vy += ap.gravity*frameTime;
		ap.y += ap.vy*frameTime;
		ap.x += ap.vx*frameTime;
		let w = emote.w * settings.size/emote.h;
		ctx.drawImage(emote.img, ap.x-w/2, ap.y-settings.size/2, w, settings.size);
	},
	"explosion": function(ctx, settings, frameTime, age, emote) {
		let ap = emote.animation;
		let sh = ctx.canvas.height;
		let y = ap.y + ap.vy*age;
		let x = ap.x + ap.vx*age;
		let w = emote.w * settings.size/emote.h;
		if(age > 0.75) ctx.globalAlpha = clamp(4-4*age,0,1);
		ctx.drawImage(emote.img, x-w/2, y-settings.size/2, w, settings.size);
		ctx.globalAlpha = 1;
	}
}


		
emotesplosions = {
	random: function(ctx, settings, allowedEmotes, animatedemotes) {
		let est = ["explosion","fountain","firework","bubbles"];
		emotesplosions[est[Math.floor(Math.random()*est.length)]](ctx, settings, allowedEmotes, animatedemotes);
	},
	explosion: function (ctx, settings, allowedEmotes, animatedemotes) {
		let pos = getSpawn(ctx, settings.emotesplosionzone["firework"]);
		let fdx = Math.max(pos[0], ctx.canvas.width-pos[0]);
		let fdy = Math.max(pos[1], ctx.canvas.height-pos[1]);
		let initialspeed = Math.max(fdx, fdy);
		for(let i=1;i<settings.emotesplosion;++i) {
			emote = allowedEmotes[Math.floor(Math.random()*allowedEmotes.length)];
			let velocity = initialspeed * (2+Math.random())/2; // randomize initial velocity
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
				animatedemotes.push({
					url: this.src, 
					animation: ap, 
					img: this, 
					w: this.width, h: this.height, 
					start: performance.now()+i*settings.emotesplosionduration*1000/settings.emotesplosion
				});
			}
			img.src = emote.url;
		}
	},

	firework: function (ctx, settings, allowedEmotes, animatedemotes) {
		let sparks = [];
		let emote;
		let pos = getSpawn(ctx, settings.emotesplosionzone["firework"]);
		let fdx = Math.max(pos[0], ctx.canvas.width-pos[0]);
		let fdy = Math.max(pos[1], ctx.canvas.height-pos[1]);
		let initialspeed = Math.max(fdx, fdy);
		for(let i=1;i<settings.emotesplosion;++i) {
			emote = allowedEmotes[Math.floor(Math.random()*allowedEmotes.length)];
			
			let velocity = initialspeed * Math.random(); // randomize initial velocity
			// choose some direction
			let vx = Math.random()-0.5; 
			let vy = Math.random()-0.5;
			// normalize it and bring it to the velocity
			let nf = velocity/Math.sqrt(vx*vx+vy*vy);
			vx *= nf;
			vy *= nf;
			
			let ap = {"type": "fireworkspark", x: pos[0], y: pos[1], vx: vx, vy: vy, duration: 0.8*settings.emotesplosionduration}
			
			let img = new Image();
			img.onload = function() {
				sparks.push({url: this.src, animation: ap, img: this, w: this.width, h: this.height});
			}
			img.src = emote.url;
		}
		
		
		emote = allowedEmotes[Math.floor(Math.random()*allowedEmotes.length)];
		let projap = {
			type: "fireworkrocket",
			x: ctx.canvas.width/2, 
			y: ctx.canvas.height+settings.size,
			targetx: pos[0],
			targety: pos[1],
			duration: 0.2*settings.emotesplosionduration,
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
					for(let i=0;i<this.animation.sparks.length;++i) {
						this.animation.sparks[i].start = performance.now();
						animatedemotes.push(this.animation.sparks[i]);
					}
				}
			});
		}
		img.src = emote.url;
	},
	
	fountain: function (ctx, settings, allowedEmotes, animatedemotes) {
		let pos = getSpawn(ctx, settings.emotesplosionzone["fountain"]);
		let y0 = pos[1]; // start y value
		let y1 = 0; // peak y value (yes, it is zero, since its the highest an emote can apex at)
		let y2 = ctx.canvas.height+settings.size; // final y value (below the lower edge of the screen)
		let v0 = -2*(y0+Math.sqrt(y2*y0)); // initial maximum velocity
		let gravity = 2*(y2-v0-y0);//2*y2 - 2*v0;
		for(let i=0;i<settings.emotesplosion;++i) {
			// choose some initial direction (4 times as much vertical component)
			let vx = Math.random()-0.5; 
			let vy = 1+Math.random();
			// normalize it and bring it to the velocity
			let nf = 1/Math.sqrt(vx*vx+vy*vy);
			vy *= v0 * 0.5 * (1+Math.random()) * nf;
			vx *= ctx.canvas.width * nf * (1+Math.random());
			let ap = {
				type: "fountain", 
				x: pos[0], y: pos[1], 
				vx: vx, vy: vy, 
				gravity: gravity,
				duration: settings.duration
			}
			let img = new Image();
			let emote = allowedEmotes[Math.floor(Math.random()*allowedEmotes.length)];
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
	},
	
	bubbles: function (ctx, settings, allowedEmotes, animatedemotes) {
		for(let i=0;i<settings.emotesplosion;++i) {
			let pos = getSpawn(ctx, settings.emotesplosionzone["bubbles"]);
			let ap = {
				type: "bubble", 
				x: pos[0], y: pos[1], 
				duration: settings.duration,
				vy: -0.5*ctx.canvas.height*(1+Math.random()),
				amp: settings.size*(1+Math.random())*0.5,
				freq: Math.PI*(1+Math.random()),
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
