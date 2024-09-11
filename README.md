# polygonarea
Compute area of polygon measured by heading and distance.

This code assumes the entry of N >= 3 pairs of heading and distance, measured
along the perimeter of an area of interest, which will then be approximated as a
polygon. It is assumed the headings are not subject to spherical distortion or
magnetic drift, and that the surface is flat.

Each heading and distance is converted to a vector, and the vectors are added
sequentially to define the polygon. If the sum of all vectors is not 0, then the
difference is split among all points other than the origin and an appropriate
offset is added to smoothly average the sum back to 0. This allows for minor
errors that do not average out to be ignored.

There are a few ways the area could be measured. The polygon could be converted
into triangles, and summed this way. This is modestly complicated, given that
the polygon is not necessarily convex. Instead, the approach will be to place a
grid over the entire polygon, and continue subdividing the grid until an
individual cell within the grid is either entirely inside the polygon or
entirely outside the polygon, at which point the area of the cell will be
attributed to the area of the polygon or not.

This process will be continued until the total area of the remaining
unattributed cells is less than the configured percent error of the total area
of the polygon so far computed.

An additional method using the exact Shoelace formula (or Triangle formula) is
also used.

Both methods also visualize the summation using an HTML Canvas.
