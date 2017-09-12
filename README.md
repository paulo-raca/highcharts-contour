Contour curves for Highcharts
=============================

This is a plugin for Highcharts to display contour curves (Or smooth heatmaps, if you prefer)

It extends the existing [heatmap](http://www.highcharts.com/maps/demo/heatmap) module (which you must include) to display smooth gradients that interpolate the data points

This extension works by triangulating all the data points and filling each triangle with a linear gradient that matches the values assigned to each vertex.

Triangulation is performed either on a regular grid (Every 'grid_width' vertexes make a row/column) or using [Delaunay](http://en.wikipedia.org/wiki/Delaunay_triangulation) (In case your data is irregular or you are just too lazy). If you decide to use Delaunay, you will have to include the library for [Fast Delaunay Triangulation in JavaScript](https://github.com/ironwallaby/delaunay)


Demos
=====

[Heatmap demo](https://jsfiddle.net/8kk6ggtq/)
--------------------

This is the same demo you can find for Highcharts Heatmap, but chart type was changed to 'contour', and you can toggle contour lines on each axis.

Note that it automatically uses Delaunay for triangulation, no extra effort required ;)


[2-D Curve Plot](https://jsfiddle.net/gfo1kps9/)
------------------------
This demo uses a regular grid to plot a curve.

The color axis is split is several bands, making the contour visualization easier. Contour lines can also be toggled.


[3-D Curve Plot](https://jsfiddle.net/f21y4L4x/)
--------------------
This demo uses a regular grid to plot a curve on a 3D chart.

On this example, Both Y and Color axes store the same values.

The color axis is split is several bands, making the contour visualization easier. Contour lines can also be toggled.


[Random Point locations](https://jsfiddle.net/nd49scnx/)
------------------------
This demo plots a radial function, but the locations of the data points are spread randomly.

You can create a good chart even when you cannot sample your data in a rectangular grid


[Random Data demo](https://jsfiddle.net/naq8uwLL/)
--------------------
This demo uses random data to show that your points don't need to make sense to create pretty chart :P


[Utah Teapot / OBJ Reader](https://jsfiddle.net/9kkx26ev/)
--------------------
This is a just-for-fun extra: Since this plugin can draw surfaces in 3D, why not use it to render the Utah Teapot from an OBJ file?!
