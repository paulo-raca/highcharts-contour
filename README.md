Contour curves for Highcharts
=============================

This is a plugin for Highcharts to display contour curves (Or smooth heatmaps, if you prefer)

It extends the existing [heatmap](http://www.highcharts.com/maps/demo/heatmap) module (which you must include) to display smooth gradients that interpolate the data points

This extension works by triangulating all the data points and filling each triangle with a linear gradient that matches the values assigned to each vertex.

Triangulation is performed either on a regular grid (Every 'grid_width' vertexes make a row/column) or using [Delaunay](http://en.wikipedia.org/wiki/Delaunay_triangulation) (In case your data is irregular or you are just too lazy). If you decide to use Delaunay, you will have to include the library for [Fast Delaunay Triangulation in JavaScript](https://github.com/ironwallaby/delaunay)


Demos
=====

[Basic heatmap demo](http://jsfiddle.net/paulo_raca/72kc0cjf/)
--------------------

This is the same demo you can find at Highcharts Heatmap Demo, but chart type was changed to 'contour'.

Note that it automatically uses Delaunay for triangulation, no extra effort required ;)


[Basic heatmap demo with contour lines](http://jsfiddle.net/paulo_raca/fmmc0be2/)
--------------------

This charts is based on the Heatmap Demo, but you can toggle contour lines on each axis.


[Countour curve](http://jsfiddle.net/1peapgLw/)
------------------------
This demo uses a regular grid to plot a saddle point. The color axis is split is several constant-color ranges, creating contour lines.


[3-D demo](http://jsfiddle.net/yw56rtus/)
--------------------
This demo demonstrates how to use this plugin to display 3-D contour curves

Note that this relies on changes that are not in the main Highcharts distribution yet.


[3-D demo with contour lines](http://jsfiddle.net/bgxd3tgr/)
--------------------
Same as the previous one, but showing contour lines

Note that this relies on changes that are not in the main Highcharts distribution yet.


[Random Point locations](http://jsfiddle.net/f7ofc3q3/)
------------------------
This demo plots a radial function, but the locations of the data points are spread randomly.

You can create a good chart even when you cannot sample your data in a rectangular grid


[Random Data demo](http://jsfiddle.net/mqxmraL2/)
--------------------
This demo uses random data to show that your points don't need to make sense to create pretty chart :P


[Utah Teapot / OBJ Reader](http://jsfiddle.net/paulo_raca/qy7a8evj/)
--------------------
Since this plugin can draw surfaces in 3D, why not use it to render the Utah Teapot from an OBJ file?!
