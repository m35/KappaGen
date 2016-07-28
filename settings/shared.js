// basic animation types: "bubble","blur","zoom","bounce","random"
// emotesplosion types: "explosion","fountain","firework","bubbles"

defaults = {
	v: 2,
	ffz: true,
	bttv: true,
	gif: true,
	mods: false,
	size: 112,
	channelonly: false,
	
	subonly: false,
	chatemotes: true,
	once: false,
	duration: 2,
	animation: "zoom",
	spawnzone: {
		"bubble": "0,100,100,100",
		"blur": "0,0,100,100",
		"zoom": "0,0,100,100",
		"bounce": "10,10,90,20"
	},
	direction: "0,-1",
	limit: 0,
	
	emotesplosions: true,
	emotesplosion: 400,
	emotesplosionduration: 10,
	emotesplosiontype: "explosion",
	emotesplosiontriggers: "subscriber",
	emotesplosionzone: {
		"explosion": "0,0,100,100",
		"fountain": "50,100,50,100",
		"firework": "10,10,90,50",
		"bubbles": "0,100,100,100"
	},
	emotesplosiondir: "1,0"
};

gamewispAuth = {
	clientId: "dbc5b8c486e4d64b730dfde2103661c9e710645",
	authUrl: "http://127.0.0.1:8081/auth",
	refreshUrl: "http://127.0.0.1:8081/refresh",
	subsUrl: "http://127.0.0.1:8081/subs"
}