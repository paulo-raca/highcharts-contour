highcharts-contour
==================

This is a plugin for Highcharts to display contour curves (Or smooth heatmaps, if you prefer)

It extends the existing [heatmap](http://www.highcharts.com/maps/demo/heatmap) module (which you must include) to display smooth gradients that interpolate the data points

This extension works by triangulating all the data points and filling each triangle with a linear gradient that matches the values assigned to each vertex.

Triangulation is performed either on a regular grid (Every 'grid_width' vertexes make a row/column) or using [Delaunay](http://en.wikipedia.org/wiki/Delaunay_triangulation) (In case your data is irregular or you are just too lazy). If you decide to use Delaunay, you will have to include the library for [Fast Delaunay Triangulation in JavaScript](https://github.com/ironwallaby/delaunay)


Demo
====

[Basic heatmap demo](http://jsfiddle.net/nsj5uzdw/)
--------------------

This is the same demo you can find at http://www.highcharts.com/maps/demo/heatmap, but chart type was changed to 'contour'. Note that it automatically used Delaunay for triangulation, so that you didn't need any extra effort ;)

[Random Point locations](http://jsfiddle.net/1peapgLw/)
------------------------
This demo plots a radial function, but the locations of the data points are spread randomly.
You can create a good chart even when you cannot sample your data in a rectangular grid

[Random Point locations](http://jsfiddle.net/f7ofc3q3/)
------------------------
This demo plots a radial function, but the locations of the data points are spread randomly.
You can create a good chart even when you cannot sample your data in a rectangular grid

[Random Data demo](http://jsfiddle.net/mqxmraL2/)
--------------------
This demo uses random data to show that your points don't need to make sense to create pretty chart :P
