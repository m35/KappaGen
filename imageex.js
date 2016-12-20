var _imageCache = {};
var ImageEx = function(src, isAnim) {
	var self = this;
	self.src = src;
	
	var createdAt = null;
	self.frameInfos = [];
	self.totalLength = null;
	var currentFrame = 0;
	// load the image
	if(isAnim) {
		if(_imageCache[src] !== undefined) {
			if(_imageCache[src] instanceof ImageEx) {
				_imageCache[src].waiting.push(function(cimg){
					createdAt = performance.now();
					self.width = cimg.width;
					self.height = cimg.width;
					self.totalLength = cimg.totalLength;
					self.frameInfos = cimg.frameInfos;
					setTimeout(function(){
						if(self.onload) {
							self.onload.call(self);
						}	
					},1);
				});
			} else {
				var cimg = _imageCache[src];
				createdAt = performance.now();
				self.width = cimg.width;
				self.height = cimg.width;
				self.totalLength = cimg.totalLength;
				self.frameInfos = cimg.frameInfos;
				setTimeout(function(){
					if(self.onload) {
						self.onload.call(self);
					}	
				},1);
			}
		} else {
			_imageCache[src] = self;
			self.waiting = [];
			// load the gif
			var oReq = new XMLHttpRequest();
			oReq.onload = function(oEvent) {
				createdAt = performance.now();
				var buffer = new Uint8Array(oReq.response);
				var decoder = new GIF.Decoder(buffer);
				self.width = decoder.width;
				self.height = decoder.height;
				var len = decoder.numFrames();
				self.frameInfos = [];
				var offset = 0;
				// this is bullshit, but ok.
				var framecanvas = document.createElement("canvas");
				framecanvas.width = decoder.width;
				framecanvas.height = decoder.height;
				var framectx = framecanvas.getContext("2d");
				var framedata = framectx.getImageData(0,0,decoder.width,decoder.height);
				
				var pixels = decoder.width * decoder.height;
				var lastdisposal = 0;
				var mask;
				for(var i=0;i<len;++i) {
					// build the frame info
					var frameinfo = decoder.frameInfo(i);
					
					// if disposal is 3, we backup the framedata
					if(frameinfo.disposal == 3) {
						var framedataCopy = new Uint8ClampedArray(framedata.data.length);
					}
					
					// make a temporary canvas
					var tmpcanvas = document.createElement("canvas");
					tmpcanvas.width = decoder.width;
					tmpcanvas.height = decoder.height;
					var tmpctx = tmpcanvas.getContext("2d");
					// blit the imagedata to the temp canvas
					var tmpdata = tmpctx.getImageData(0,0,decoder.width,decoder.height).data;
					decoder.decodeAndBlitFrameRGBA(i, tmpdata); // Decode frame
					// iterate over all the pixels
					for(var j=0;j<pixels;++j) {
						// apply mask if the disposal method was 2
						if(lastdisposal == 2) {
							// get the alpha value
							var alpha = mask[j*4+3];
							if(alpha > 0) {
								// clear the pixel
								framedata.data[j*4] = 0;
								framedata.data[j*4+1] = 0;
								framedata.data[j*4+2] = 0;
								framedata.data[j*4+3] = 0;
							}
						}
						// draw the new pixel
						// get the alpha value
						var alpha = tmpdata[j*4+3];
						if(alpha > 0) {
							// set the pixel
							framedata.data[j*4] = tmpdata[j*4];
							framedata.data[j*4+1] = tmpdata[j*4+1];
							framedata.data[j*4+2] = tmpdata[j*4+2];
							framedata.data[j*4+3] = tmpdata[j*4+3];
						}
					}
					
					// draw the framedata to the framecanvas and get the data url
					framectx.putImageData(framedata, 0, 0);
					var frameimg = new Image();
					frameimg.src = framecanvas.toDataURL("image/png");
					
					frameinfo.offset = offset;
					if(frameinfo.delay <= 1) frameinfo.delay = 10;
					frameinfo.delay *= 10; // turn the delay into ms (usually cs)
					offset += frameinfo.delay;
					frameinfo.end = offset;
					frameinfo.img = frameimg;
					lastdisposal = frameinfo.disposal;
					if(frameinfo.disposal == 2) {
						// store the mask
						mask = tmpdata;
					} else if(frameinfo.disposal == 3) {
						framedata.data.set(framedataCopy);
					}
					
					self.frameInfos.push(frameinfo);
				}
				
				self.totalLength = offset;
				_imageCache[src] = { width: self.width, height: self.height, totalLength: self.totalLength, frameInfos: self.frameInfos };
				for(var i=0;i<self.waiting.length; ++i) {
					self.waiting[i](_imageCache[src]);
				}
				if(self.onload) {
					self.onload.call(self);
				}
			}
			oReq.open("GET", self.src, true);
			oReq.responseType = "arraybuffer";
			oReq.send();
		}
	} else {
		var tmpimg = new Image();
		tmpimg.onload = function() {
			createdAt = performance.now();
			self.width = tmpimg.width;
			self.height = tmpimg.height;
			self.frameInfos = [{offset: 0, duration: Infinity, end: Infinity, img: tmpimg}];
			self.totalLength = Infinity;
			if(self.onload) {
				self.onload.call(self);
			}
		}
		tmpimg.src = self.src;
	}
	
	self.draw = function(target_context, x_position, y_position, w, h, t) {
		if(createdAt) {
			if(!t) t = (performance.now() - createdAt) % self.totalLength;
			else t = t % self.totalLength;
			var nextFrame = null;
			for(var i=0; i<self.frameInfos.length; ++i) {
				var frame = (currentFrame+i)%self.frameInfos.length;
				if(t >= self.frameInfos[frame].offset && t < self.frameInfos[frame].end) {
					nextFrame = frame;
					break;
				}
			}
			if(nextFrame !== null) {
				currentFrame = nextFrame;
				var frame = self.frameInfos[currentFrame];
				target_context.drawImage(frame.img, x_position, y_position, w, h);
			} else {
				console.log("Frame at "+t+" not found!");
			}
		}
	}
}

var __drawImage = CanvasRenderingContext2D.prototype.drawImage;
CanvasRenderingContext2D.prototype.drawImage = function(image, xpos, ypos, width, height) {
	if(image instanceof ImageEx) {
		image.draw(this, xpos, ypos, width, height);
	} else {
		__drawImage.apply(this, arguments);
	}
}