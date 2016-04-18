angular.module("specialInputs", [])
	.directive('rectangleInput', function($document) {
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
					context.strokeStyle = '#000';
					if (scope.stroke) {
						var strokekeys = Object.keys(scope.stroke);
						for (var i = 0; i < strokekeys.length; ++i) {
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
	})

.directive('directionInput', function($document) {
	return {
		require: "?ngModel",
		scope: {
			model: '=ngModel',
			radius: '=radius',
			mode: '=mode',
			circlestroke: '=circleStroke',
			arrowstroke: '=arrowStroke'
		},
		restrict: 'E',
		template: '<canvas width=100 height=100></canvas>',
		link: function(scope, element, attrs, ngModel) {
			if (!ngModel) return;
			element.css({
				display: "block",
				width: scope.radius*2,
				height: scope.radius*2
			});
			var canvas = element.children()[0];
			canvas.height = scope.radius*2;
			canvas.width = scope.radius*2;
			var context = canvas.getContext('2d');

			scope.$watch("radius", function() {
				scope.radius = scope.radius || 50;
				element.css({
					height: scope.radius*2,
					width: scope.radius*2
				});
				canvas.height = scope.radius*2;
				canvas.width = scope.radius*2;
				redraw();
			});
			scope.$watch("circleStroke", redraw);
			scope.$watch("arrowStroke", redraw);
			scope.$watch("mode", redraw);

			scope.dir = {
				x: 0,
				y: -1
			}
			scope.mode = scope.mode;
			function clamp(val, min, max) {
				return Math.min(Math.max(val, min), max);
			};
			var drawing = false;
			element.on('mousedown', function(event) {
				// Prevent default dragging of selected content
				console.log("mousedown");
				var x = event.offsetX / scope.radius - 1;
				var y = event.offsetY / scope.radius - 1;
				var lensq = x * x + y * y;
				if (scope.mode === undefined || scope.mode == "direction" || (scope.mode == "velocity" && lensq > 1)) {
					var len = 1 / (Math.sqrt(lensq));
					x *= len;
					y *= len;
				}
				scope.dir.x = x;
				scope.dir.y = y;
				scope.onChange();
				event.preventDefault();
				drawing = true;
				$document.on('mousemove', mousemove);
				$document.on('mouseup', mouseup);
			});

			function mousemove(event) {
				if (drawing) {
					var offset = element.offset();
					var x = (event.pageX - offset.left) / scope.radius - 1;
					var y = (event.pageY - offset.top) / scope.radius - 1;
					var lensq = x * x + y * y;
					if (scope.mode === undefined || scope.mode == "direction" || (scope.mode == "velocity" && lensq > 1)) {
						var len = 1 / (Math.sqrt(lensq));
						x *= len;
						y *= len;
					}
					scope.dir.x = x;
					scope.dir.y = y;
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
						var x = Math.round(scope.dir.x*1000)/1000;
						var y = Math.round(scope.dir.y*1000)/1000;
						if(Math.abs(x)==1) y = 0;
						if(Math.abs(y)==1) x = 0;
						scope.model = `${x},${y}`;
					}
				});
			};

			function redraw() {
				context.clearRect(0, 0, canvas.width, canvas.height);

				// draw the circle
				context.save();
				context.beginPath();
				context.lineWidth = 1;
				context.strokeStyle = '#000';
				if (scope.circlestroke) {
					var strokekeys = Object.keys(scope.circlestroke);
					for (var i = 0; i < strokekeys.length; ++i) {
						var key = strokekeys[i];
						context[key] = scope.circlestroke[key];
					}
				}
				context.arc(canvas.width / 2, canvas.height / 2, scope.radius, 0, 2 * Math.PI);
				context.stroke();
				context.restore();
				// draw the line
				context.save();
				context.beginPath();
				context.moveTo(canvas.width / 2, canvas.height / 2);
				var arrowx = canvas.width / 2 + scope.dir.x * scope.radius;
				var arrowy = canvas.height / 2 + scope.dir.y * scope.radius;
				context.lineTo(arrowx, arrowy);
				context.lineWidth = 1;
				context.strokeStyle = '#000';
				context.fillStyle = '#000';
				if (scope.arrowstroke) {
					var strokekeys = Object.keys(scope.arrowstroke);
					for (var i = 0; i < strokekeys.length; ++i) {
						var key = strokekeys[i];
						context[key] = scope.arrowstroke[key];
					}
				}
				context.stroke();
				// draw the arrowhead
				var rotation = Math.atan2(scope.dir.y, scope.dir.x);
				context.translate(arrowx, arrowy);
				context.rotate(rotation);
				context.moveTo(0, 0);
				// draw the arrowhead, 10% as long as the radius, in the golden ratio (hence the 0.061 = 0.1/golden ratio)
				context.lineTo(-scope.radius * 0.1, scope.radius * 0.061);
				context.lineTo(-scope.radius * 0.1, -scope.radius * 0.061);
				context.closePath();
				context.fill();
				context.restore();
			}

			ngModel.$render = function() {
				if (!drawing && scope.model) {
					var modelType = typeof(scope.model);
					if (modelType == "object") {
						scope.rect = scope.model;
					} else {
						var split = scope.model.split(",");
						if (split.length == 2) {
							scope.dir.x = parseFloat(split[0]);
							scope.dir.y = parseFloat(split[1]);
							scope.onChange();
						}
					}
				}
				redraw();
			}
			redraw();
			scope.$watch("model.x", redraw);
			scope.$watch("model.y", redraw);
		}
	}
});