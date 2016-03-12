/**
* @license @product.name@ JS v@product.version@ (@product.date@)
*
* (c) 2011-2014 Torstein Honsi
*
* License: www.highcharts.com/license
*/

/*global HighchartsAdapter*/
(function (Highcharts) {

"use strict";


var defaultOptions = Highcharts.getOptions(),
	each = Highcharts.each,
	extendClass = Highcharts.extendClass,
	merge = Highcharts.merge,
	seriesTypes = Highcharts.seriesTypes,
	wrap = Highcharts.wrap,
	perspective = Highcharts.perspective,
	eps = 0.0001,
	SVG_NS = "http://www.w3.org/2000/svg",
	XLINK_NS = "http://www.w3.org/1999/xlink",
	gradient_id = 0;

/**
 * Extend the default options with map options
 */


defaultOptions.plotOptions.contour = merge(defaultOptions.plotOptions.heatmap, {
	marker: defaultOptions.plotOptions.scatter.marker,
	//state: defaultOptions.plotOptions.scatter.states,
});

/**
 * Normalize a value into 0-1 range
 */
Highcharts.ColorAxis.prototype.toRelativePosition = function(value) {
	if (this.isLog) {
		value = this.val2lin(value);
	}
    return (value - this.min) / ((this.max - this.min) || 1);
};

Highcharts.Axis.prototype.drawCrosshair = function() {};

// The Heatmap series type
seriesTypes.contour = extendClass(seriesTypes.heatmap, {
	type: 'contour',
	axisTypes: ['xAxis', 'yAxis', 'colorAxis'],
	optionalAxis: 'zAxis',
	parallelArrays: ['x', 'y', 'z', 'value'],
	colorKey: 'value',
	hasPointSpecificOptions: true,
	getSymbol: seriesTypes.scatter.prototype.getSymbol,
	drawPoints: Highcharts.Series.prototype.drawPoints,
	init: function () {
		seriesTypes.heatmap.prototype.init.apply(this, arguments);

		//We don't want "padding" between our data points and the margin
		this.pointRange = 0;
		this.is3d = this.chart.is3d && this.chart.is3d();
		this.xAxis.axisPointRange = 0;
		this.yAxis.axisPointRange = 0;

		//FIXME: I have no idea why, but it believes my chart is always hidden!
		//This causes a _HUGE_ slowdown while the whole thing is copied over on chart.cloneRenderTo()
		this.chart.renderer.isHidden = function() {
			return false;
		};
	},
	translate: function () {
		seriesTypes.heatmap.prototype.translate.apply(this, arguments);

		if (!this.is3d) {
			return;
		}

		var series = this,
			chart = series.chart,
			options3d = series.chart.options.chart.options3d,
			depth = options3d.depth,
			zMin = chart.zAxis[0].min,
			zMax = chart.zAxis[0].max,
			rangeModifier = depth / (zMax - zMin);

		Highcharts.each(series.data, function (point) {
			var p3d = {
				x: point.plotX,
				y: point.plotY,
				z: (point.z - zMin) * rangeModifier
			};
			point.plotXold = p3d.x;
			point.plotYold = p3d.y;
			point.plotZold = p3d.z;

			p3d = perspective([p3d], chart, true)[0];
			point.plotX = p3d.x;
			point.plotY = p3d.y;
			point.plotZ = p3d.z;
		});
		series.kdTree = null;
	},
	getExtremes: function () {
		// Get the extremes from the value data
		Highcharts.Series.prototype.getExtremes.call(this, this.valueData);
		this.valueMin = this.dataMin;
		this.valueMax = this.dataMax;

		Highcharts.Series.prototype.getExtremes.call(this, this.zData);
		this.zMin = this.dataMin;
		this.zMax = this.dataMax;

		// Get the extremes from the y data
		Highcharts.Series.prototype.getExtremes.call(this);
	},
	drawTriangle: function (triangle_data, points, edgeCount) {
		var fill;
		var chart = this.chart;
		var colorKey = this.colorKey;
		var renderer = this.chart.renderer;
		var a = points[triangle_data.a];
		var b = points[triangle_data.b];
		var c = points[triangle_data.c];

		//Normalized values of the vertexes
		var values = [
			this.colorAxis.toRelativePosition(a[colorKey]),
			this.colorAxis.toRelativePosition(b[colorKey]),
			this.colorAxis.toRelativePosition(c[colorKey])
		];

		//All vertexes have the same value/color
		if (Math.abs(values[0] - values[1]) < eps && Math.abs(values[0] - values[2]) < eps) {
			fill = this.colorAxis.toColor((a[colorKey] + b[colorKey] + c[colorKey]) / 3);
		//Use a linear gradient to interpolate values/colors
		} else {
			//Find function where "Value = A*X + B*Y + C" at the 3 vertexes
			var m = new Matrix([
				[a.plotX, a.plotY, 1, values[0]],
				[b.plotX, b.plotY, 1, values[1]],
				[c.plotX, c.plotY, 1, values[2]]]);
			m.toReducedRowEchelonForm();
			var A = m.mtx[0][3];
			var B = m.mtx[1][3];
			var C = m.mtx[2][3];

			//For convenience, we place our gradient control points at (k*A, k*B)
			//We can find the value of K as:
			// Value = A*X + B*Y + C =
			// Value = A*(A*k) + B*(B*k) + C
			// Value = A²*k + B²*k + C
			// Value = k*(A² + B²) + C
			// k = (Value - C) / (A² + B²)
			var k0 = (0-C) / (A*A + B*B);
			var k1 = (1-C) / (A*A + B*B);
			var x1 = k0*A;
			var y1 = k0*B;
			var x2 = k1*A;
			var y2 = k1*B;

			// Assign a linear gradient that interpolates all 3 vertexes
			if (renderer.isSVG) {
				//SVGRenderer implementation of gradient is slow and leaks memory -- Lets do it ourselves
				var gradient = triangle_data.gradient;
				if (!gradient) {
					var gradient = triangle_data.gradient = document.createElementNS(SVG_NS, "linearGradient");
					gradient.setAttribute("id", "contour-gradient-id-" + (gradient_id++));
					renderer.defs.element.appendChild(gradient);
				}
				gradient.setAttributeNS(XLINK_NS, "xlink:href", this.base_gradient_id);
				gradient.setAttribute("x1", x1);
				gradient.setAttribute("y1", y1);
				gradient.setAttribute("x2", x2);
				gradient.setAttribute("y2", y2);
				fill = 'url(' + renderer.url + '#' + gradient.getAttribute('id') + ')';
			} else {
				fill = {
					linearGradient: {
						x1: x1,
						y1: y1,
						x2: x2,
						y2: y2,
						spreadMethod: 'pad',
						gradientUnits:'userSpaceOnUse'
					},
					stops: this.colorAxis.options.stops || [
						[0, this.colorAxis.options.minColor],
						[1, this.colorAxis.options.maxColor]
					]
				};
			}
		}


		var path = [
			'M',
			a.plotX + ',' + a.plotY,
			'L',
			b.plotX + ',' + b.plotY,
			'L',
			c.plotX + ',' + c.plotY,
			'Z'
		];

		if (triangle_data.shape) {
			triangle_data.shape.attr({
				d: path,
				fill: fill,
			});
		} else {
			triangle_data.shape = renderer.path(path)
				.attr({
					'shape-rendering': 'crispEdges',
					fill: fill
				})
		}
		triangle_data.shape.add(this.surface_group);

		if (edgeCount) {
			var edge_path = [];
			var processEdge = function(a,b) {
				if (!edgeCount[b + '-' + a]) {
					if (edgeCount[a + '-' + b]-- == 1) {
						edge_path.push(
							'M',
							points[a].plotX + ',' + points[a].plotY,
							'L',
							points[b].plotX + ',' + points[b].plotY);
					}
				}
			}
			processEdge(triangle_data.a,triangle_data.b);
			processEdge(triangle_data.b,triangle_data.c);
			processEdge(triangle_data.c,triangle_data.a);
			if (edge_path.length) {
				if (triangle_data.edge) {
					triangle_data.edge.attr({
						d: edge_path,
					});
				} else {
					triangle_data.edge = renderer.path(edge_path)
						.attr({
							'stroke-linecap': 'round',
							'stroke': 'black',
							'stroke-width': 2,
						})
				}
				triangle_data.edge.add(this.surface_group);
			} else if (triangle_data.edge) {
				triangle_data.edge.destroy();
				triangle_data.edge = null;
			}
		}
	},
	drawGraph: function () {
		var series = this,
			i,j,
			points = series.points,
			options = this.options,
			renderer = series.chart.renderer,
			grid_width = options.grid_width,
			show_edges = options.showEdges;

		if (!series.surface_group) {
			series.surface_group = renderer.g().add(series.group);
			series.triangles = [];
		}

		//When creating a SVG, we create a "base" gradient with the right colors,
		//And extend it on every triangle to define the orientation.
		if (renderer.isSVG) {
			var fake_rect = renderer.rect(0,0,1,1).attr({
				fill: {
					linearGradient: {
						x1: 0,
						y1: 0,
						x2: 1,
						y2: 0,
						spreadMethod: 'pad',
						gradientUnits:'userSpaceOnUse'
					},
					stops: this.colorAxis.options.stops || [
						[0, this.colorAxis.options.minColor],
						[1, this.colorAxis.options.maxColor]
					]
				}
			});
			this.base_gradient_id = /(#.*)[)]/.exec(fake_rect.attr('fill'))[1];
		}

		var group = series.surface_group;
		var triangle_count = 0;

		var egde_count = show_edges ? {} : null;
		var appendEdge = function(a,b) {
			egde_count[a+'-'+b] = (egde_count[a+'-'+b] || 0) + 1;
		};
		var appendTriangle = function(a,b,c) {
			var triangle_data = series.triangles[triangle_count];
			if (!triangle_data) {
				triangle_data = series.triangles[triangle_count] = {};
			}
			triangle_count++;

			//Make sure the shape is counter-clockwise
			if (shapeArea([points[a], points[b], points[c]], 'plotX', 'plotY') > 0) {
				var tmp = a;
				a = b;
				b = tmp;
			}
			triangle_data.a = a;
			triangle_data.b = b;
			triangle_data.c = c;

			if (show_edges) {
				appendEdge(a,b);
				appendEdge(b,c);
				appendEdge(c,a);
			}

			triangle_data.z_order = [(points[a].plotZ + points[b].plotZ + points[c].plotZ)/3];
		};


		if (grid_width) {
			var triangles = []
			//points are in a nice regular grid
			for (i=1; i<points.length/grid_width; i++) {
				for (j=1; j<options.grid_width; j++) {
					appendTriangle(
						( i )*grid_width + (j-1),
						(i-1)*grid_width + (j-1),
						(i-1)*grid_width + ( j ));
					appendTriangle(
						( i )*grid_width + ( j ),
						( i )*grid_width + (j-1),
						(i-1)*grid_width + ( j ));
				}
			}
		} else {
			//If points are not in a regular grid, use Delaunay triangulation.
			//You will have to include this: https://github.com/ironwallaby/delaunay
			var triangles = Delaunay.triangulate(points.map(
				this.is3d ?
				function(x) {
					return [x.plotXold, x.plotZold];
				} : function(x) {
					return [x.plotX, x.plotY];
				}));
			for (i=0; i<triangles.length; i+=3) {
				appendTriangle(
					triangles[i],
					triangles[i+1],
					triangles[i+2]);
			}
		}

		// Remove extra unused triangles from previous rendering
		for (i=triangle_count; i<series.triangles.length; i++) {
			if (series.triangles[i].shape) {
				series.triangles[i].shape.destroy();
			}
			if (series.triangles[i].edge) {
				series.triangles[i].edge.destroy();
			}
			if (series.triangles[i].gradient) {
				series.triangles[i].gradient.parentNode.removeChild(series.triangles[i].gradient);
			}
		}
		series.triangles.splice(triangle_count, series.triangles.length - triangle_count);

		series.triangles.sort(function (a,b) {
			for (var i=0; i<3; i++) {
				var ret = b.z_order[i] - a.z_order[i];
				if (ret) {
					return ret;
				}
			}
			return 0;
		});

		// Render each triangle
		for (i=0; i<triangle_count; i++) {
			series.drawTriangle(series.triangles[i], points, egde_count);
		}
	}
});

//Shoelace algorithm -- http://en.wikipedia.org/wiki/Shoelace_formula

function shapeArea(vertexes, xProperty, yProperty) {
	var area = 0;
	for (var i=0; i<vertexes.length; i++) {
		var j = (i+1) % vertexes.length;
		area += vertexes[i][xProperty]*vertexes[j][yProperty] - vertexes[j][xProperty]*vertexes[i][yProperty];
	}
	return area / 2;
};

// ==== Matrix functions =======

// http://rosettacode.org/wiki/Matrix_Transpose#JavaScript
function Matrix(ary) {
	this.mtx = ary;
	this.height = ary.length;
	this.width = ary[0].length;
}

// http://rosettacode.org/wiki/Reduced_row_echelon_form#JavaScript
Matrix.prototype.toReducedRowEchelonForm = function() {
	for (var col=0; col<this.width && col<this.height; col++) {
		var bestRow = null;
		var bestRowVal = 0;
		for (var row=col; row<this.height; row++) {
			if (Math.abs(this.mtx[row][col]) > bestRowVal) {
				bestRow = row;
				bestRowVal = Math.abs(this.mtx[row][col]);
			}
		}

		//All zeros in this column :(
		if (bestRow == null) {
			for (var row=0; row<this.height; row++) {
				this.mtx[row][col] = 0;
			}
			continue;
		}

		//Swap rows
		var tmp = this.mtx[col];
		this.mtx[col] = this.mtx[bestRow];
		this.mtx[bestRow] = tmp;

		//Normalize
		for (var row=0; row<this.height; row++) {
			if (row == col) { //Normalize reference row last, for numeric stability
				continue;
			}
			var k = this.mtx[row][col] / this.mtx[col][col];
			for (var i=col; i<this.width; i++) {
				this.mtx[row][i] -= k * this.mtx[col][i];
			}
		}

		//Normalize reference row now
		var k = this.mtx[col][col];
		for (var i=col; i<this.width; i++) {
			this.mtx[col][i] /= k;
		}

		//Normalize this column for numeric stability
		for (var row=0; row<this.height; row++) {
			this.mtx[row][col] = row == col ? 1 : 0;
		}
	}
	return this;
};

Matrix.prototype.toString = function () {
	var s = [];
	for (var i = 0; i < this.mtx.length; i++)
	s.push(this.mtx[i].join(","));
	return s.join("\n");
};

}(Highcharts));
