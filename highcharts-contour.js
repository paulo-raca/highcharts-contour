/**
* Highcharts plugin for contour curves
*
* Author: Paulo Costa
*/

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

defaultOptions.plotOptions.contour = merge(defaultOptions.plotOptions.scatter, {
    marker: {
        radius: 0,
        fillColor: '#ffffff',
        states: {
            hover: {
                radius: defaultOptions.plotOptions.scatter.marker.radius,
            },
        },
    },
    states: {
        hover: {
            halo: {
                size: defaultOptions.plotOptions.scatter.marker.radius + 4,
                attributes: {
                    fill: '#000000',
                },
                opacity: 0.5,
            },
        },
    },
    turboThreshold: 0,
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

wrap(Highcharts.ColorAxis.prototype, 'setAxisSize', function (proceed) {
    if (this.legendSymbol) {
        proceed.call(this);
    } else {
        this.len = 100;
        this.pos = 0;
    }
});

Highcharts.Axis.prototype.drawCrosshair = function() {};

// The Heatmap series type
seriesTypes.contour = extendClass(seriesTypes.heatmap, {
    type: 'contour',
    hasPointSpecificOptions: true,
    getSymbol: seriesTypes.scatter.prototype.getSymbol,
    drawPoints: Highcharts.Series.prototype.drawPoints,
    pointClass: Highcharts.Point,
    pointAttribs: Highcharts.Series.prototype.pointAttribs,

    init: function (chart) {
        this.is3d = chart.is3d && chart.is3d();
        this.gradiend_ids = {};
        seriesTypes.scatter.prototype.init.apply(this, arguments);
    },
    
    bindAxes: function () {
        if (this.is3d) {
            this.axisTypes = ['xAxis', 'yAxis', 'zAxis', 'colorAxis'];
            this.parallelArrays = ['x', 'y', 'z', 'value'];
        } else {
            this.axisTypes = ['xAxis', 'yAxis', 'colorAxis'];
            this.parallelArrays = ['x', 'y', 'value'];
        }
        seriesTypes.scatter.prototype.bindAxes.apply(this, arguments);
    },

    //FIXME: Once https://github.com/highcharts/highcharts/pull/5497 has landed, this whole method can go away
    translate: function () {
        if (!this.is3d) {
            seriesTypes.scatter.prototype.translate.apply(this, arguments);
            return;
        }
        this.chart.options.chart.options3d.enabled = false;
        seriesTypes.scatter.prototype.translate.apply(this, arguments);
        this.chart.options.chart.options3d.enabled = true;

        var series = this,
            chart = series.chart,
            zAxis = series.zAxis;

        Highcharts.each(series.data, function (point) {
            var p3d = {
                x: point.plotX,
                y: point.plotY,
                z: zAxis.translate(zAxis.isLog && zAxis.val2lin ? zAxis.val2lin(point.z) : point.z)
            };
            point.plotXold = p3d.x;
            point.plotYold = p3d.y;
            point.plotZold = p3d.z;

            p3d = perspective([p3d], chart, true)[0];
            point.plotX = p3d.x;
            point.plotY = p3d.y;
            point.plotZ = p3d.z;
        });
        
        
        // Set color of each point (#10) 
        // This is a quick hack. It might be better to look into a better solution later
        series.translateColors();
    },
    
    drawTriangle: function (triangle_data, edgeCount, show_edges, contours) {
        var fill;
        var chart = this.chart;
        var renderer = this.chart.renderer;
        var a = triangle_data.A;
        var b = triangle_data.B;
        var c = triangle_data.C;
        var abc = [a,b,c];


        //SVG Group that holds everything
        if (!triangle_data.group) {
            triangle_data.group = renderer.g().add(this.surface_group);
        }
        triangle_data.group.attr({
          zIndex: -(a.plotZ + b.plotZ + c.plotZ) / 3
        });


        //Normalized values of the vertexes
        var values = [
            this.colorAxis.toRelativePosition(a.value),
            this.colorAxis.toRelativePosition(b.value),
            this.colorAxis.toRelativePosition(c.value)
        ];

        //All vertexes have the same value/color
        if (Math.abs(values[0] - values[1]) < eps && Math.abs(values[0] - values[2]) < eps) {
            fill = this.colorAxis.toColor((a.value + b.value + c.value) / 3);
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
                    gradient = triangle_data.gradient = renderer.createElement("linearGradient");
                    gradient.add(renderer.defs);
                    gradient.attr({
                        id: "contour-gradient-id-" + (gradient_id++),
                        x1: x1,
                        y1: y1,
                        x2: x2,
                        y2: y2
                    });
                } else {
                    gradient.animate({
                        x1: x1,
                        y1: y1,
                        x2: x2,
                        y2: y2
                    });
                }
                gradient.element.setAttributeNS(XLINK_NS, "xlink:href", this.base_gradient_id);
                fill = 'url(' + renderer.url + '#' + gradient.attr('id') + ')';
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
                    stops: this.colorAxis.stops
                };
            }
        }


        var path = [
            'M', a.plotX, a.plotY,
            'L', b.plotX, b.plotY,
            'L', c.plotX, c.plotY,
            'Z'
        ];

        if (triangle_data.shape) {
            triangle_data.shape
                .animate({
                    d: path,
                })
                .attr({
                    fill: fill,
                });
        } else {
            triangle_data.shape = renderer.path(path)
                .attr({
                    'shape-rendering': 'crispEdges',
                    fill: fill
                })
            triangle_data.shape.on('mousemove', function(e) {
                e = chart.pointer.normalize(e);
                var mx = e.chartX - chart.plotLeft;
                var my = e.chartY - chart.plotTop;
                var dist = function(P) {
                    return (P.plotX-mx)*(P.plotX-mx) + (P.plotY-my)*(P.plotY-my);
                }
                var nearest = triangle_data.A;
                if (dist(triangle_data.B) < dist(nearest)) {
                    nearest = triangle_data.B;
                }
                if (dist(triangle_data.C) < dist(nearest)) {
                    nearest = triangle_data.C;
                }
                nearest.onMouseOver(e);
            });
            triangle_data.shape.add(triangle_data.group);
        }

        
        
        // Draw edges around the triangle and/or on contour curves
        
        var edge_path = [];
        if (show_edges) {
            var processEdge = function(a,b,A,B) {
                if (!edgeCount[b + '-' + a]) {
                    if (edgeCount[a + '-' + b]-- == 1) {
                        edge_path.push(
                            'M', A.plotX, A.plotY,
                            'L', B.plotX, B.plotY);
                    }
                }
            }
            processEdge(triangle_data.a, triangle_data.b, triangle_data.A, triangle_data.B);
            processEdge(triangle_data.b, triangle_data.c, triangle_data.B, triangle_data.C);
            processEdge(triangle_data.c, triangle_data.a, triangle_data.C, triangle_data.A);
        }
        
        for (var contour_index=0; contour_index<contours.length; contour_index++) {
            var contourAxis = contours[contour_index].axis;
            var contourAttr = contours[contour_index].attr;
            //TODO: Think carefully about corner conditions and preventing duplicated line segments
            for (var tickIndex in contourAxis.tickPositions) {
                var tickValue = contourAxis.tickPositions[tickIndex];
                var contourVertexes=[];
                for (var i=0; i<3; i++) {
                    var x1 = abc[ i     ].plotX, y1 = abc[ i     ].plotY, v1=abc[ i     ][contourAttr];
                    var x2 = abc[(i+1)%3].plotX, y2 = abc[(i+1)%3].plotY, v2=abc[(i+1)%3][contourAttr];
                    if (v1 != v2 && tickValue >= Math.min(v1, v2) && tickValue < Math.max(v1, v2)) {
                        var q = (tickValue-v1)/(v2-v1);
                        contourVertexes.push([
                            q*(x2-x1) + x1,
                            q*(y2-y1) + y1
                        ]);
                    }
                }
                if (contourVertexes.length == 2) {
                    edge_path.push(
                        'M',
                        contourVertexes[0][0] + ',' + contourVertexes[0][1],
                        'L',
                        contourVertexes[1][0] + ',' + contourVertexes[1][1]);
                }
            }
        }
        
        if (edge_path.length) {
            if (triangle_data.edge) {
                triangle_data.edge.animate({
                    d: edge_path,
                });
            } else {
                triangle_data.edge = renderer.path(edge_path)
                    .attr({
                        'stroke-linecap': 'round',
                        'stroke': 'black',
                        'stroke-width': 1,
                    })
                triangle_data.edge.add(triangle_data.group);
            }
        } else if (triangle_data.edge) {
            triangle_data.edge.destroy();
            delete triangle_data.edge;
        }
    },
    drawGraph: function () {
        var series = this,
            i,j,
            points = series.points,
            options = this.options,
            renderer = series.chart.renderer;
            
        if (!series.surface_group) {
            series.surface_group = renderer.g().add(series.group);
            series.triangles = [];
        }

        //When creating a SVG, we create a "base" gradient with the right colors,
        //And extend it on every triangle to define the orientation.
        if (series.chart.renderer.isSVG) {
            var gradiend_id = "";
            for (var i=0; i<this.colorAxis.stops.length; i++) {
                for (var j=0; j<this.colorAxis.stops[i].length; j++) {
                    gradiend_id += ":" + this.colorAxis.stops[i][j];
                }
            }
            if (!this.gradiend_ids[gradiend_id]) {
                var fake_rect = series.chart.renderer.rect(0,0,1,1).attr({
                    fill: {
                        linearGradient: {
                            x1: 0,
                            y1: 0,
                            x2: 1,
                            y2: 0,
                            spreadMethod: 'pad',
                            gradientUnits:'userSpaceOnUse'
                        },
                        stops: this.colorAxis.stops
                    }
                });
                this.gradiend_ids[gradiend_id] = /(#.*)[)]/.exec(fake_rect.attr('fill'))[1];
            }
            this.base_gradient_id = this.gradiend_ids[gradiend_id];
        }

        var group = series.surface_group;
        var triangle_count = 0;

        var egde_count = {};
        var validatePoint = function(p) {
            return p && (typeof p.x === "number") && (typeof p.y === "number") && (typeof p.z === "number" || !series.is3d) && (typeof p.value === "number");
        };
        var appendEdge = function(a,b) {
            egde_count[a+'-'+b] = (egde_count[a+'-'+b] || 0) + 1;
        };
        var appendTriangle = function(a,b,c) {
            if (validatePoint(points[a]) && validatePoint(points[b]) && validatePoint(points[c])) {
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

                triangle_data.A = points[a];
                triangle_data.B = points[b];
                triangle_data.C = points[c];

                appendEdge(a,b);
                appendEdge(b,c);
                appendEdge(c,a);
            }
        };


        var triangles = [];
        if (options.triangles) {
            for (i=0; i<options.triangles.length; i++) {
                var v = options.triangles[i];
                if (typeof v === "number") {
                    triangles.push(v);
                } else if (typeof v === "object" && typeof v[0] === "number" && typeof v[1] === "number" && typeof v[2] === "number") {
                    triangles.push(v[0], v[1],  v[2]);
                }
            }

        } else if (options.grid_width) {
            //points are in a nice regular grid
            var grid_width = options.grid_width;
            for (i=1; i<points.length/grid_width; i++) {
                for (j=1; j<options.grid_width && (i*grid_width + j)<points.length; j++) {
                    var i00 = (i-1)*grid_width + (j-1);
                    var i01 = (i-1)*grid_width + ( j );
                    var i10 = ( i )*grid_width + (j-1);
                    var i11 = ( i )*grid_width + ( j );

                    if (Math.abs(points[i00].value - points[i11].value) < Math.abs(points[i01].value - points[i10].value)) {
                        triangles.push(i00, i01, i11);
                        triangles.push(i00, i11, i10);
                    } else {
                        triangles.push(i00, i01, i10);
                        triangles.push(i01, i10, i11);
                    }
                }
            }
        } else {
            //If points are not in a regular grid, use Delaunay triangulation.
            //You will have to include this: https://github.com/ironwallaby/delaunay
            points = points.filter(validatePoint);
            triangles = Delaunay.triangulate(points.map(
                this.is3d ?
                function(x) {
                    return [x.plotXold, x.plotZold];
                } : function(x) {
                    return [x.plotX, x.plotY];
                }));
        }
        
        for (i=0; i<triangles.length-2; i+=3) {
            appendTriangle(
                triangles[i],
                triangles[i+1],
                triangles[i+2]);
        }

        // Remove extra unused triangles from previous rendering
        for (i=triangle_count; i<series.triangles.length; i++) {
            if (series.triangles[i].group) {
                series.triangles[i].group.destroy();
            }
            if (series.triangles[i].gradient) {
                series.triangles[i].gradient.parentNode.removeChild(series.triangles[i].gradient);
            }
        }
        series.triangles.splice(triangle_count, series.triangles.length - triangle_count);


        
        var contours = [];
        if (options.contours) {
            Highcharts.each(options.contours, function(contourName) {
                switch (contourName) {
                    case "x":    contours.push({axis: series.xAxis,     attr: "x"}); break;
                    case "y":    contours.push({axis: series.yAxis,     attr: "y"}); break;
                    case "z":    contours.push({axis: series.zAxis,     attr: "z"}); break;
                    case "value":contours.push({axis: series.colorAxis, attr: "value"}); break;
                };
            });
        } else if (options.showContours) {
            contours = this.is3d
                    ? [{axis: series.yAxis,     attr: "y"}]
                    : [{axis: series.colorAxis, attr: "value"}];
        }
                
        // Render each triangle
        for (i=0; i<triangle_count; i++) {
            series.drawTriangle(series.triangles[i], egde_count, options.showEdges, contours);
        }
    }
});


//FIXME: Temporary fix for drawing ColorAxis legend on 3-D charts
//Once https://github.com/highcharts/highcharts/pull/5498 has landed, this whole method can go away
Highcharts.ColorAxis.prototype.render = function () {
    // ColorAxis should never be drawn in 3D, therefore the
    // 3D flag is temporarialy disabled while it is rendered in the legend
    var is3d = this.chart.is3d && this.chart.is3d();
    if (is3d) {
        this.chart.options.chart.options3d.enabled = false;
    }
    Highcharts.Axis.prototype.render.call(this, arguments);
    if (is3d) {
        this.chart.options.chart.options3d.enabled = true;
    }
};


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
