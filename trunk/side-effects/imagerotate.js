var imagerotateArray = new Array;
var imagerotateCounter = 0;

// Not currently functional - reason unknown
function prepareElement(elementId, imageUrl, imageWidth, imageHeight)
{
    imagerotateCounter++;

    var newId = "rotatingShape" + imagerotateCounter;
    var container = document.getElementById(elementId);

    // Create new element...
    var newElement = document.createElement("v:image");
    newElement.id = newId;
    newElement.style.width=imageWidth;
    newElement.style.height=imageHeight;
    newElement.src=imageUrl;
    container.appendChild(newElement);

    var stats = new Object;
    stats.newId = newId;
    stats.container = container;
    stats.imageUrl = imageUrl;
    stats.imageWidth = imageWidth;
    stats.imageHeight = imageHeight;
    imagerotateArray[newId] = stats;
    return newId;
}

function prepareImage(container, imageId, imageUrl, imageWidth, imageHeight)
{
    imagerotateCounter++;

    var stats = new Object;
    stats.newId = imageId;
    stats.container = container;
    stats.imageUrl = imageUrl;
    stats.imageWidth = imageWidth;
    stats.imageHeight = imageHeight;
    imagerotateArray[imageId] = stats;
    return imageId;
}

function startRotation(shapeId, intervalMillis, amountDegrees)
{
    var stats = imagerotateArray[shapeId];
    stats.intervalMillis = intervalMillis;
    stats.amountDegrees = amountDegrees;
    stats.currentRotation = 0;
    stats.timerId = setInterval("doRotation('" + shapeId + "')", intervalMillis);
}

function stopRotation(shapeId)
{
    var stats = imagerotateArray[shapeId];
    clearInterval(stats.timerId);
    stats.timerId = -1;
}

function doRotation(shapeId)
{
    var stats = imagerotateArray[shapeId];
    if (!stats || stats.timerId == -1)
    {
        return; // Asked to cancel.
    }

    var element = document.getElementById(shapeId);

    // Else, do rotation
    var newRotation = (stats.currentRotation + stats.amountDegrees) % 360;
    element.rotation = newRotation;
    stats.currentRotation = newRotation;
    document.getElementById(shapeId).rotation = newRotation;
}