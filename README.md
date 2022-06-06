Contour curves for Highcharts
=============================

This is a plugin for Highcharts to display contour curves.

It extends the existing [heatmap](http://www.highcharts.com/maps/demo/heatmap) module (which you must include) to display smooth gradients that interpolate the data points, and optionally contour lines over it.

It can use either a list of discrete data points or a math function as an input.

If you specify a discrete list of points, the surface can be triangulated in 3 ways:
- Automatically, using [Delaunay](http://en.wikipedia.org/wiki/Delaunay_triangulation) (In case your data is irregular or you are just lazy). You'll have to include [Fast Delaunay Triangulation in JavaScript](https://github.com/ironwallaby/delaunay).
- In a grid, where each row has `grid_width` data points.
- Manually specifying a list of triangles.



Demos
=====
[Heatmap demo](https://jsfiddle.net/cnft1xog/)
--------------------

This is the same demo you can find for Highcharts Heatmap, but chart type was changed to 'contour', and you can toggle contour lines on each axis.

Note that it automatically uses Delaunay for triangulation, no extra effort required ;)


[2-D Curve Plot](https://jsfiddle.net/e08kmdwh/)
------------------------
This demo uses the built-in suport for evaluating a `dataFunction`: The points are evaluated in a regular grid and produce a 2D chart.

Extras:
- The color axis is split is several bands, making the contour visualization easier.
- Contour lines can be toggled.
- Tooltip can be extrapolated for any point in the chart, not only the points used for rendering.


[2-D Curve Plot with contour axis labels](https://jsfiddle.net/0Ljcotw8/)
------------------------
This example augments the 2-D Curve Plot demo with extra axes that display the values of the contour curves.


[3-D Curve Plot](https://jsfiddle.net/zpxaws8g/)
--------------------
This is equivalent to the 2-D Curve Plot demo, in 3D.

On this example, Both Y and Color axes store the same values, a trick that makes visualization easier.


[3-D Curve Plot #2](https://jsfiddle.net/eL3yzpq0/)
--------------------
Similar to the previous demo, but Y and Color axes have independent values.


[Random Point locations](https://jsfiddle.net/aznt8vh6/)
------------------------
This demo plots a radial function, but the locations of the data points are spread randomly.

You can create a good chart even when you cannot sample your data in a rectangular grid


[Random Data demo](https://jsfiddle.net/xsyzo2fq/)
--------------------
This demo uses random data to show that your points don't need to make sense to create pretty chart :P


[Utah Teapot / OBJ Reader](https://jsfiddle.net/1gjzca60/)
--------------------
This is a just-for-fun extra: Since this plugin can draw surfaces in 3D, why not use it to render the Utah Teapot from an OBJ file?!
