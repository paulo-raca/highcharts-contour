highcharts-contour
==================

This is a plugin for Highcharts to display contour curves (Or smooth heatmaps, if you prefer)

It extends the existing [heatmap](http://www.highcharts.com/maps/demo/heatmap) module (which you must include) to display smooth gradients that interpolate the data points

This extension works by triangulating all the data points and filling each triangle with a linear gradient that matches the values assigned to each vertex.

Triangulation is performed either on a regular grid (Every 'grid_width' vertexes make a row/column) or using [Delaunay](http://en.wikipedia.org/wiki/Delaunay_triangulation) (In case your data is irregular or you are just too lazy). If you decide to use Delaunay, you will have to include the library for [Fast Delaunay Triangulation in JavaScript](https://github.com/ironwallaby/delaunay)
