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
	clientId: "1b22119ee42a4f68f9b7c58cad961ec1b0ec0e2",
	authUrl: "https://cbenni.com/kappagen_server/auth",
	refreshUrl: "https://cbenni.com/kappagen_server/refresh",
	subsUrl: "https://cbenni.com/kappagen_server/subs"
}
