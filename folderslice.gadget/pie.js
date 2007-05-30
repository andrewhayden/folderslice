/**
 * Pie chart Javascript library.
 *
 * By Andrew L. Hayden
 * Website: http://www.andrewlynchhayden.com
 *
 * This library is distributed under the terms of the Apache License 2.0:
 * http://www.apache.org/licenses/LICENSE-2.0.html
 *
 * Your are free to copy and use this library; I would appreciate it if
 * you kept this attribution message, but you are not required to do so.
 *
 * IMPORTANT:
 * This script uses VML.  This will not work outside of Internet Explorer.
 * In order to allow this script to function, your HTML code ***MUST***
 * enable VML explicitly as shown in the following sample snippet:
 *
 * <html xmlns:v="urn:schemas-microsoft-com:vml">
 * <head>
 *     <style> v\:* { behavior: url(#default#VML); }</style>
 * </head>
 * <body> (your content here) </body>
 * </html>
 *
 * The items of importance are the xmlns attribute in the HTML element,
 * and the style definition.  You can of course have other attributes
 * and styles as necessary.
 */

// Version information:
// Source: $HeadURL$
// Id: $Id$

var pieGlobals = new Object;
pieGlobals.pieColor1 = '#ffea3b';
pieGlobals.pieColor2 = '#c43122';
pieGlobals.sliceColors = new Array;
pieGlobals.sliceColors[0] = new Object;
pieGlobals.sliceColors[0].color1 = '#0055ff';
pieGlobals.sliceColors[0].color2 = '#000040';
pieGlobals.pieCoordinateSize = 1000;
pieGlobals.pieDebug = false; // Set to 'true' to turn on debugging.

/**
 * Changes the size of the coordinate system used to create pies.
 * Larger coordinate spaces make smoother interpolation possible at a cost
 * in speed.
 */
function setPieCoordinateSpace(size)
{
    pieGlobals.pieCoordinateSize = size;
}

/**
 * Changes the colors used to draw the pie gradient.
 */
function setPieColors(c1, c2)
{
    pieGlobals.pieColor1 = c1;
    pieGlobals.pieColor2 = c2;
}

/**
 * Changes the colors used to draw the slice gradient.
 * @param sliceIndex the index of the slice whose color should be set
 * @param c1 color #1
 * @param c2 color #2
 */
function setSliceColors(sliceIndex, c1, c2)
{
    pieGlobals.sliceColors[sliceIndex] = new Object;
    pieGlobals.sliceColors[sliceIndex].color1 = c1;
    pieGlobals.sliceColors[sliceIndex].color2 = c2;
}

/**
 * Makes a pie with any number of floating slices.
 *
 * @param elementId     the ID of the container element in which to draw.
 *                      IMPORTANT: the element's contents are DISCARDED
 *                      before drawing!!
 *                      IMPORTANT: the container must have accessible and
 *                      correct properties "style.pixelTop" and
 *                      "style.pixelLeft"
 * @param centerX       the location, relative to the top-left corner of the
 *                      container element, at which to center the pie
 * @param centerY       the location, relative to the top-left corner of the
 *                      container element, at which to center the pie
 * @param floatOffset   the offset, in pixels, of the pie slice from the center
 *                      of the pie.  This value is scaled according to the
 *                      sin/cos values of the bisector of the slice in order to
 *                      keep the slice edges approximately equidistant from
 *                      the edges of the pie itself.
 * @param radius        the radius, in pixels, of the pie.  Note that the
 *                      total space required to hold the object should always
 *                      be padded on all sides with the floatOffset specified
 *                      above, since the wedge might jut out in any direction
 *                      by that many pixels.
 * @param sliceSizes    array containing the sizes of the slices, in degrees,
 *                      to take out of the pie;
 *                      the code will attempt to draw any non-zero size,
 *                      so it is up to the caller to zero the slice size if it
 *                      is too small to reasonably be shown.
 * @param pointsInFullCircle
 *                      the number of points that would be used to smoothly
 *                      interpolate a polygon representation of the full
 *                      circumference of the circle.  Large values make the
 *                      drawing smoother at a cost in performance.
 */
function makePieWithSlices(elementId, centerX, centerY, floatOffset, radius, sliceSizes, pointsInFullCircle)
{
    // Clear old contents...
    document.getElementById(elementId).innerHTML = "";

    // Tally slice sizing information
    var totalSliceSize = 0;
    for (var x=0; x<sliceSizes.length; x++)
    {
        totalSliceSize += sliceSizes[x];
    }

    var rotation = 90;
    var pieStartAngle = rotation;
    var pieAngleWidth = 360 - totalSliceSize;
    if (pieAngleWidth > 0)
    {
        makeSlice(elementId, centerX, centerY, radius,
            pieStartAngle, pieAngleWidth, pointsInFullCircle,
            pieGlobals.pieColor1, pieGlobals.pieColor2, 180);
    }

    var sliceSizeDone = 0;
    for (var index=0; index<sliceSizes.length; index++)
    {
        var sliceSize = sliceSizes[index];
        if (sliceSize != 0)
        {
            // Offset must be scaled in x/y according to sin/cos of the angle...
            var sliceStartAngle = 360 - totalSliceSize + rotation + sliceSizeDone;
            var sliceCenter = sliceStartAngle + (sliceSize / 2);
            var xScale = cosDegrees(sliceCenter);
            var yScale = sinDegrees(sliceCenter);
            var offsetX = xScale * floatOffset;
            var offsetY = yScale * floatOffset;
            var color1;
            var color2;
            var color1 = pieGlobals.sliceColors[index % pieGlobals.sliceColors.length].color1;
            var color2 = pieGlobals.sliceColors[index % pieGlobals.sliceColors.length].color2;

            makeSlice(elementId,
                Math.round(centerX + offsetX),
                Math.round(centerY - offsetY),
                radius, sliceStartAngle, sliceSize, pointsInFullCircle,
                color1, color2, 180 - sliceCenter);
            sliceSizeDone += sliceSize;
        }
    }
}

/**
 * Adds a slice section to the specified element.
 *
 * @param elementId     the ID of the container element in which to draw.
 * @param centerX       the location, relative to the top-left corner of the
 *                      container element, at which to center the pie
 * @param centerY       the location, relative to the top-left corner of the
 *                      container element, at which to center the pie
 * @param radius        the radius, in pixels, of the pie.
 * @param startAngle    the starting angle at which the pie section begins.
 *                      0 is at the top of the pie, with positive values
 *                      proceeding counter-clockwise.
 * @param angleWidth    the size of the section, in degrees;
 *                      the code will attempt to draw any non-zero size,
 *                      so it is up to the caller to suppress this call if the
 *                      section is too small to reasonably be shown.
 * @param pointsInFullCircle
 *                      the number of points that would be used to smoothly
 *                      interpolate a polygon representation of the full
 *                      circumference of the circle.  Large values make the
 *                      drawing smoother at a cost in performance.
 * @param color1        the first color for the gradient
 * @param color2        the second color for the gradient
 * @param fillAngle     the angle through which the gradient is rotated
 */
function makeSlice(elementId, centerX, centerY, radius, startAngle, angleWidth, pointsInFullCircle, color1, color2, fillAngle)
{
    var pixelCenterX = centerX;
    var pixelCenterY = centerY;
    var pixelRadius = radius;

    centerX = pieGlobals.pieCoordinateSize / 2;
    centerY = pieGlobals.pieCoordinateSize / 2;
    radius = pieGlobals.pieCoordinateSize / 2;
    var element = document.getElementById(elementId);
    var xPoints = new Array;
    var yPoints = new Array;
    var percentFull = angleWidth / 360;
    var numPointsToInterpolate = Math.round(percentFull * pointsInFullCircle);
    var startX = centerX + (cosDegrees(startAngle) * radius);
    var startY = centerY - (sinDegrees(startAngle) * radius);
    var stopX = centerX + (cosDegrees(startAngle + angleWidth) * radius);
    var stopY = centerY - (sinDegrees(startAngle + angleWidth) * radius);

    var numPoints = 0;
    setPoint(xPoints, yPoints, numPoints++, centerX, centerY);
    setPoint(xPoints, yPoints, numPoints++, startX, startY);
    // Interpolated points.
    for (var interpolateIndex=1; interpolateIndex < numPointsToInterpolate - 1; interpolateIndex++)
    {
        var angle = startAngle + ((interpolateIndex / numPointsToInterpolate) * angleWidth);
        setPoint(xPoints, yPoints, numPoints++,
            centerX + (cosDegrees(angle) * radius),
            centerY - (sinDegrees(angle) * radius));
    }
    setPoint(xPoints, yPoints, numPoints++, stopX, stopY);
    setPoint(xPoints, yPoints, numPoints++, centerX, centerY);

    // If debugging is enabled, show the user interesting information
    if (pieGlobals.pieDebug)
    {
        var xText = "";
        for (var index=0; index<numPoints; index++)
        {
            xText += xPoints[index] + ",";
        }
        var yText = "";
        for (var index=0; index<numPoints; index++)
        {
            yText += yPoints[index] + ",";
        }
        alert("X:" + xText + "\nY: " + yText);
    }

    var path = "m " + Math.round(startX) + "," + Math.round(startY) + " l ";
    for (var index=1; index<numPoints; index++)
    {
        path += xPoints[index] + "," + yPoints[index] + " ";
    }
    path += "x e"; // close and end the path

    var divX = element.style.pixelLeft;
    var divY = element.style.pixelTop;

    var shapeHtml = "<v:shape";
    shapeHtml += " style='position:absolute; top: " + (pixelCenterY) + "px; left: " + (pixelCenterX) + "px; width: " + (pixelRadius * 2) + "px; height: " + (pixelRadius * 2) + "px;'";
    shapeHtml += "coordsize='" + pieGlobals.pieCoordinateSize + "," + pieGlobals.pieCoordinateSize + "' coordorigin='" + centerX + "," + centerY + "'";
    shapeHtml += ">";
    shapeHtml += "\n    <v:path v='" + path + "' />";
    shapeHtml += "\n    <v:fill type='gradient' color='" + color1 + "' color2='" + color2 + "' angle='" + fillAngle + "'/>";
    shapeHtml += "\n</v:shape>";

    if (pieGlobals.pieDebug) alert("shapehtml=" + shapeHtml + "\nDiv at: " + divX + ", " + divY);

    element.innerHTML+=shapeHtml;
}

/**
 * Converts degrees to radians and returns the cosine of the result.
 */
function cosDegrees(degrees)
{
    return Math.cos(toRadians(degrees));
}

/**
 * Converts degrees to radians and returns the sine of the result.
 */
function sinDegrees(degrees)
{
    return Math.sin(toRadians(degrees));
}

/**
 * Converts degrees to radians and returns the result.
 */
function toRadians(degrees)
{
    return ((Math.PI * 2) * ((degrees % 360) / 360));
}

/**
 * Sets the point at the specified index, rounding to an integer in the process.
 */
function setPoint(arrayX, arrayY, index, x, y)
{
    arrayX[index] = Math.round(x);
    arrayY[index] = Math.round(y);
}