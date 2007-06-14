function colorHexToInts(color)
{
    var colorRegex = /^#?[a-f0-9]{6}$/;
    if (!color.match(colorRegex))
    {
        throw "color must be a string in standard HTML color syntax (e.g., '#ac02c2'): " + color;
    }

    // Else, we're good
    var trimmed = color;
    if (color.charAt(0) === '#')
    {
        trimmed = color.substr(1);
    }

    var rgbArray = new Array(3);
    rgbArray[0] = new Number(parseInt(trimmed.substr(0,2), 16)); // red
    rgbArray[1] = new Number(parseInt(trimmed.substr(2,2), 16)); // green
    rgbArray[2] = new Number(parseInt(trimmed.substr(4,2), 16)); // blue
    return rgbArray;
}

function colorIntsToHex(rgbArray)
{
    if (rgbArray.length != 3)
    {
        throw "rgbArray must have length 3: " + rgbArray.length;
    }

    // Else, we're good
    var hexForm = "";
    for (var x=0; x<3; x++)
    {
        hexForm += (rgbArray[x].valueOf() < 10 ? "0" : "") + rgbArray[x].toString(16);
    }
    return "#" + hexForm;
}

function makeEqualWeightsArray(colorArray)
{
    var weights = new Array(colorArray.length - 1);
    for (var index=0; index<colorArray.length - 1; index++)
    {
        weights[index] = 1 / (colorArray.length - 1);
    }
    return weights;
}

function linearArrayInterpolateFromHex(colorArray, weightsArray, percent)
{
    var asInts = new Array(colorArray.length);
    for (var index=0; index<colorArray.length; index++)
    {
        asInts[index] = colorHexToInts(colorArray[index]);
    }

    return colorIntsToHex(linearArrayInterpolateFromInts(asInts, weightsArray, percent));
}

function linearArrayInterpolateFromInts(colorArray, weightsArray, percent)
{
    // Calculate weights...
    var computedWeights;
    if ((!weightsArray) || weightsArray.length === 0)
    {
        computedWeights = makeEqualWeightsArray(colorArray);
    }
    else
    {
        computedWeights = weightsArray;
    }

    // Find the bin for the specified percent
    var bin = 0;
    var cumulativeWeight = 0;
    for (var index=0; index<computedWeights.length; index++)
    {
        var nextMarker = cumulativeWeight + computedWeights[index];
        if (percent <= nextMarker)
        {
           // Found our color endpoints...
           var color1 = colorArray[index]; 
           var color2 = colorArray[index+1];
           var relativePercent = (percent - cumulativeWeight) / (nextMarker - cumulativeWeight);
           return linearInterpolateFromInts(color1, color2, relativePercent);
        }
        cumulativeWeight = nextMarker;
    }

    // If we got this far, something went wrong or the weights didn't add to 1.
    // Just return the last color
    return colorArray[colorArray.length - 1];
}

function linearInterpolateFromHex(color1, color2, percent)
{
    return colorIntsToHex(linearInterpolateFromInts(colorHexToInts(color1), colorHexToInts(color2), percent));
}

function linearInterpolateFromInts(rgbArray1, rgbArray2, percent)
{
    var result = new Array(3);
    for (var x=0; x<3; x++)
    {
        var delta = rgbArray2[x].valueOf() - rgbArray1[x].valueOf();
        result[x] = new Number(rgbArray1[x].valueOf() + Math.round(delta * percent));
    }
    return result;
}