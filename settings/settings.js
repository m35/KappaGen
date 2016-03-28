var app = angular.module("app",["ngMaterial","firebase","ngSanitize","ngclipboard"]);


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

app.controller("AppCtrl",function($scope, $mdDialog, $firebaseObject, $sce){
	var self = this;
	var defaults = {
		v: 2,
		ffz: true,
		bttv: true,
		gif: true,
		mods: false,
		size: 112,
		
		subonly: false,
		chatemotes: true,
		once: false,
		duration: 2,
		animation: "zoom",
		spawnzone: "0,0,100,100",
		limit: 0,
		
		emotesplosions: true,
		emotesplosion: 400,
		emotesplosionduration: 10,
		emotesplosiontype: "explosion",
		emotesplosiontriggers: "subscriber",
		
		cloud: true
	};
	
	jQuery.extend($scope.settings, defaults);
	$scope.cloudsync = true;
	$scope.loaded = false;
	if(!localStorage.kappagen_cuid) {
		localStorage.kappagen_cuid = guid();
	}
	var cluster = localStorage.kappagen_cuid.substring(0,1);
	console.log("https://kappagen-"+cluster+".firebaseio.com/"+localStorage.kappagen_cuid);
	var ref = new Firebase("https://kappagen-"+cluster+".firebaseio.com/"+localStorage.kappagen_cuid);
	var syncObject = $firebaseObject(ref);
	syncObject.$bindTo($scope, "settings");
	
	syncObject.$loaded().then(function(data) {
		if(data.v === undefined) {
			$scope.settings = jQuery.extend({},defaults);
		}
		$scope.loaded = true;
		//jQuery.extend($scope.settings, defaults);
	});
	
	$scope.resulturl = "";
	
	$scope.resetSettings = function() {
		$scope.settings = jQuery.extend({}, defaults);
	}
	
	$scope.getRateLimit = function() {
		if(!$scope.settings) return 0;
		var val = $scope.settings.limit;
		if(val == 0 || val == undefined) {
			return "unlimited emotes per user";
		} else if(val <= 1) {
			var k = Math.round(1/val);
			return k+" emote"+(k==1?"":"s")+" per user per second";
		}
		else if(val > 0) {
			return "1 emote every "+Math.round(val)+" seconds per user";
		}
	}
	
	function roundIfNecessary(num) {
		if(typeof(num) === "number") return +(Math.round(num + "e+2")  + "e-2");
		else return num;
	}
	
	function buildParam(settings, defaults) {
		if(!settings) return "";
		var res = "";
		if($scope.cloudsync) {
			return '&cuid=<span class="blurry-text">'+localStorage.kappagen_cuid+'</span>'
		}
		var keys = Object.keys(settings);
		for(var i=0;i<keys.length;++i) {
			var key = keys[i];
			if(defaults[key] != undefined) {
				var val = settings[key];
				if(val !== defaults[key]) res += "&"+key+(val===true?"":"="+roundIfNecessary(val));
			}
		}
		return res;
	}
	
	$scope.buildUrl = function buildUrl() {
		if($scope.settings && $scope.channel)
		{
			var base = /(.*)\/settings/.exec(window.location.href);
			var res = base[1]+"?channel="+$scope.channel+""+buildParam($scope.settings, defaults);
		} else {
			var res = '<span class="error">please set a channel</span>';
		}
		return res;
	};
	
	$scope.showToS = function(ev) {
		$mdDialog.show({
			controller: DialogController,
			templateUrl: 'tos.html',
			parent: angular.element(document.body),
			targetEvent: ev,
			clickOutsideToClose: true
		});
	}
});

function DialogController($scope, $mdDialog) {
	$scope.hide = function() {
		$mdDialog.hide();
	};
	$scope.cancel = function() {
		$mdDialog.cancel();
	};
	$scope.answer = function(answer) {
		$mdDialog.hide(answer);
	};
}


app.directive('rectangleInput', function($document) {
  return {
    require: "?ngModel",
    scope: {
      model: '=ngModel',
      height: '=height',
      width: '=width',
	  stroke: '=stroke'
    },
    restrict: 'E',
    template: '<canvas width=100 height=100></canvas>',
    link: function(scope, element, attrs, ngModel) {
      if (!ngModel) return;
      element.css({
        display: "block",
        width: scope.width,
        height: scope.height
      });
      var canvas = element.children()[0];
      var context = canvas.getContext('2d');

      scope.$watch("height", function() {
        scope.height = scope.height || 100;
        element.css({
          height: scope.height
        });
        canvas.height = scope.height;
        redraw();
      });
      scope.$watch("width", function() {
        scope.width = scope.width || 100;
        element.css({
          width: scope.width
        });
        canvas.width = scope.width;
        redraw();
      });
      scope.$watch("stroke", redraw);

      // Are we drawing?
      var drawing = false;

      scope.rect = {
        x1: 0,
        y1: 0,
        x2: 100,
        y2: 100
      }
	  
	function clamp(val, min, max) {
		return Math.min(Math.max(val, min), max);
	};

      element.on('mousedown', function(event) {
        // Prevent default dragging of selected content
        console.log("mousedown");
        scope.rect.x1 = clamp(event.offsetX, 0, scope.width);
        scope.rect.y1 = clamp(event.offsetY, 0, scope.height);
        scope.rect.x2 = clamp(event.offsetX, 0, scope.width);
        scope.rect.y2 = clamp(event.offsetY, 0, scope.height);
        scope.onChange();
        event.preventDefault();
        drawing = true;
        $document.on('mousemove', mousemove);
        $document.on('mouseup', mouseup);
      });

      element.on("dblclick", function() {
        drawing = false;
        scope.rect.x1 = 0;
        scope.rect.x2 = scope.width;
        scope.rect.y1 = 0;
        scope.rect.y2 = scope.height;
        scope.onChange();
      });

      function mousemove(event) {
        if (drawing) {
          var offset = element.offset();
          scope.rect.y2 = clamp(Math.round(event.pageY - offset.top), 0, scope.height);
          scope.rect.x2 = clamp(Math.round(event.pageX - offset.left), 0, scope.width);
          scope.onChange();
        }
      }

      function mouseup() {
        drawing = false;
        $document.off('mousemove', mousemove);
        $document.off('mouseup', mouseup);
      }

      scope.onChange = function() {
        scope.$evalAsync(function() {
          var modelType = typeof(scope.model);
          if (modelType == "object") {
            redraw();
          } else {
            scope.model = `${scope.rect.x1},${scope.rect.y1},${scope.rect.x2},${scope.rect.y2}`;
          }
        });
      };

      function redraw() {
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.beginPath();
        var lx = Math.min(scope.rect.x1, scope.rect.x2);
        var ty = Math.min(scope.rect.y1, scope.rect.y2);
        var rx = Math.max(scope.rect.x1, scope.rect.x2);
        var by = Math.max(scope.rect.y1, scope.rect.y2);
        var rh = Math.max(by - ty, 1);
        var rw = Math.max(rx - lx, 1);
        context.rect(lx, ty, rw, rh);
        context.lineWidth = 1;
        context.strokeStyle = '#fff';
		if(scope.stroke) {
			var strokekeys = Object.keys(scope.stroke);
			for(var i=0;i<strokekeys.length;++i) {
				var key = strokekeys[i];
				context[key] = scope.stroke[key];
			}
		}
        context.stroke();
        context.closePath();
      }

      ngModel.$render = function() {
        if (!drawing && scope.model) {
          var modelType = typeof(scope.model);
          if (modelType == "object") {
            scope.rect = scope.model;
          } else {
            var m = scope.model.match(/\d+/g);
            if (m && m.length == 4) {
              var split = scope.model.split(",");
              scope.rect.x1 = clamp(parseInt(m[0]), 0, scope.width || 100);
              scope.rect.y1 = clamp(parseInt(m[1]), 0, scope.height || 100);
              scope.rect.x2 = clamp(parseInt(m[2]), 0, scope.width || 100);
              scope.rect.y2 = clamp(parseInt(m[3]), 0, scope.height || 100);
              scope.onChange();
            }
          }
        }
        redraw();
      }

      scope.$watch("model.x1", redraw);
      scope.$watch("model.y1", redraw);
      scope.$watch("model.x2", redraw);
      scope.$watch("model.y2", redraw);
    }
  }
});

app.directive('ratelimit', function () {
	return {
		restrict: 'A',
		require: 'ngModel',
		priority: 5,
		link: function (scope, element, attrs, ngModel) {
			//format text going to user (model to view)
			console.log("formatters:",ngModel.$formatters);
			ngModel.$formatters.push(function(val) {
				console.log("format",val);
				console.log("formatters:",ngModel.$formatters);
				if(val >= 1) {
					return Math.round(61-val);
				} else if(val != 0) {
					return Math.round(1/val+59);
				} else return 120;
			});

			//format text from the user (view to model)
			ngModel.$parsers.push(function(val) {
				console.log("parse",val);
				if(val < 60) {
					return (61 - val);
				} else if(val < 120) {
					return 1/(val - 59);
				} else return 0;
			});
		}
	}
});