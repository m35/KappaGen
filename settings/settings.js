var app = angular.module("app",["ngMaterial","firebase","ngSanitize","ngclipboard","specialInputs"]);


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

app.controller("AppCtrl",function($scope, $mdDialog, $firebaseObject, $sce, $window){
	var self = this;
	$scope.defaults = defaults;
	jQuery.extend(true, $scope.settings, defaults);
	
	// firebase stuff
	$scope.cloudsync = localStorage.kappagen_cloudsync !== "false";
	if(localStorage.kappagen_cloudsync === undefined) {
		localStorage.kappagen_cloudsync = "true";
	}
	$scope.loaded = false;
	if(!localStorage.kappagen_cuid) {
		localStorage.kappagen_cuid = guid();
	}
	var cluster = localStorage.kappagen_cuid.substring(0,1);
	var ref = null;
	var syncObject = null;
	
	$scope.typeof = function(x){return typeof(x);};
	
	var handleFirebase = function(){
		if($scope.cloudsync) {
			if(ref === null) {
				ref = new Firebase("https://kappagen-"+cluster+".firebaseio.com/"+localStorage.kappagen_cuid);
				syncObject = $firebaseObject(ref);
				syncObject.$bindTo($scope, "settings");
				
				syncObject.$loaded().then(function(data) {
					if(data.v === undefined) {
						$scope.settings = jQuery.extend(true, {},defaults);
					}
					$scope.loaded = true;
				});
			} else {
				Firebase.goOnline();
			}
		}
		else {
			if($scope.loaded === false) {
				$scope.settings = jQuery.extend(true, {},defaults);
				$scope.loaded = true;
			}
			else {
				Firebase.goOffline();
			}
		}
	}
	
	$scope.importSettings = function(ev){
		$mdDialog.show($mdDialog.prompt({
			title: "Import beta settings",
			textContent: "Insert your old settings url (needs to be cloud sync) or just the cuid",
			ok: "Import",
			cancel: "Cancel",
			parent: angular.element(document.body),
			targetEvent: ev,
			clickOutsideToClose: true
		})).then(function(val){
			if(val) {
				var m = /cuid=([0-9][0-9a-z]{10,})/.exec(val) || /^([0-9][0-9a-z]{10,})$/.exec(val);
				if(m) {
					return doImportSettings(m[1]);
				}
			}
			$mdDialog.show($mdDialog.alert({
				title: "Could not import settings",
				textContent: "Invalid cuid",
				ok: "OK",
				parent: angular.element(document.body),
				clickOutsideToClose: true
			}));
		});
	}
	
	var doImportSettings = function(cuid) {
		localStorage.kappagen_cloudsync = true;
		localStorage.kappagen_cuid = cuid;
		window.location.reload();
	}
	
	
	
	handleFirebase();
	$scope.$watch("cloudsync", function(){
		localStorage.kappagen_cloudsync = $scope.cloudsync;
		handleFirebase();
	});
	
	
	
	
	$scope.resulturl = "";
	
	$scope.resetSettings = function() {
		$scope.settings = jQuery.extend(true, {}, defaults);
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
				var df = defaults[key];
				if(typeof val==="object") {
					val = encodeURIComponent(JSON.stringify(val));
					df = encodeURIComponent(JSON.stringify(df));
				}
				if(val !== df) {
					res += "&"+key+(val===true?"":"="+roundIfNecessary(val));
				}
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




app.directive('ratelimit', function () {
	return {
		restrict: 'A',
		require: 'ngModel',
		priority: 5,
		link: function (scope, element, attrs, ngModel) {
			//format text going to user (model to view)
			ngModel.$formatters.push(function(val) {
				if(val >= 1) {
					return Math.round(61-val);
				} else if(val != 0) {
					return Math.round(1/val+59);
				} else return 120;
			});

			//format text from the user (view to model)
			ngModel.$parsers.push(function(val) {
				if(val < 60) {
					return (61 - val);
				} else if(val < 120) {
					return 1/(val - 59);
				} else return 0;
			});
		}
	}
});