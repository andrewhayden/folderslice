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

var pieColor1 = '#ffea3b';
var pieColor2 = '#c43122';
var sliceColor1 = '#0055ff';
var sliceColor2 = '#000040';
var pieCoordinateSize = 1000; // 1000x1000 should be plenty of resolution

// Set to 'true' to turn on debugging.
var PIE_DEBUG = false;

/**
 * Changes the size of the coordinate system used to create pies.
 * Larger coordinate spaces make smoother interpolation possible at a cost
 * in speed.
 */
function setPieCoordinateSpace(size)
{
    pieCoordinateSize = size;
}

/**
 * Changes the colors used to draw the pie gradient.
 */
function setPieColors(c1, c2)
{
    pieColor1 = c1;
    pieColor2 = c2;
}

/**
 * Changes the colors used to draw the slice gradient.
 */
function setSliceColors(c1, c2)
{
    sliceColor1 = c1;
    sliceColor2 = c2;
}

/**
 * Makes a pie with a single floating slice.
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
 * @param sliceSize     the size of the slize, in degrees, to take out of the
 *                      pie; the code will attempt to draw any non-zero size,
 *                      so it is up to the caller to zero the slice size if it
 *                      is too small to reasonably be shown.
 * @param pointsInFullCircle
 *                      the number of points that would be used to smoothly
 *                      interpolate a polygon representation of the full
 *                      circumference of the circle.  Large values make the
 *                      drawing smoother at a cost in performance.
 */
function makePieWithSlice(elementId, centerX, centerY, floatOffset, radius, sliceSize, pointsInFullCircle)
{
    // Clear old contents...
    document.getElementById(elementId).innerHTML = "";

    var rotation = 90;
    var pieStartAngle = 0 + rotation;
    var pieAngleWidth = 360 - sliceSize;
    makePieWithGap(elementId, centerX, centerY, radius, pieStartAngle, pieAngleWidth, pointsInFullCircle, pieColor1, pieColor2, 180);

    if (sliceSize != 0)
    {
        // Offset must be scaled in x/y according to sin/cos of the angle...
        var sliceStartAngle = 360 - sliceSize + rotation;
        var sliceCenter = sliceStartAngle + (sliceSize / 2);
        var xScale = cosDegrees(sliceCenter);
        var yScale = sinDegrees(sliceCenter);
        var offsetX = xScale * floatOffset;
        var offsetY = yScale * floatOffset;
        makePieWithGap(elementId,
            Math.round(centerX + offsetX),
            Math.round(centerY - offsetY),
            radius, sliceStartAngle, sliceSize, pointsInFullCircle,
            sliceColor1, sliceColor2, 180 - sliceCenter);
    }
}

/**
 * Adds a pie section to the specified element.
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
function makePieWithGap(elementId, centerX, centerY, radius, startAngle, angleWidth, pointsInFullCircle, color1, color2, fillAngle)
{
    var pixelCenterX = centerX;
    var pixelCenterY = centerY;
    var pixelRadius = radius;

    centerX = pieCoordinateSize / 2;
    centerY = pieCoordinateSize / 2;
    radius = pieCoordinateSize / 2;
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
    if (PIE_DEBUG)
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
    shapeHtml += "coordsize='" + pieCoordinateSize + "," + pieCoordinateSize + "' coordorigin='" + centerX + "," + centerY + "'";
    shapeHtml += ">";
    shapeHtml += "\n    <v:path v='" + path + "' />";
    shapeHtml += "\n    <v:fill type='gradient' color='" + color1 + "' color2='" + color2 + "' angle='" + fillAngle + "'/>";
    shapeHtml += "\n</v:shape>";

    if (PIE_DEBUG) alert("shapehtml=" + shapeHtml + "\nDiv at: " + divX + ", " + divY);

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
    return ((Math.PI * 2) * (degrees / 360)) % 360;
}

/**
 * Sets the point at the specified index, rounding to an integer in the process.
 */
function setPoint(arrayX, arrayY, index, x, y)
{
    arrayX[index] = Math.round(x);
    arrayY[index] = Math.round(y);
}