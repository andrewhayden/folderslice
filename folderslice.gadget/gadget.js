var defaultMessage = "Drag folder(s) here..."
var gadgetPath = System.Gadget.path;

// List of archive formats we will not open
var archiveExtensions = [
    "zip", "tar", "gz", "z", "tgz", "bz2", "rar", "jar", "7z",
    "ear", "war", "lzh", "lzx", "ace", "cab", "iso", "arc", "arj"];

// If we get beyond yottabytes (10^24) while using JavaScript, the future is bleak indeed.
var sizeUnits = ["KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
var gadgetState = new Object;
var DEBUG = false;

function cancel()
{
    if (gadgetState.timerId != 0)
    {
        gadgetState.invocationCounter++;
        clearTimeout(gadgetState.timerId);
        gadgetState.timerId = 0;
        clearText();
        progressIndicatorOff();
    }
}

function progressIndicatorOn()
{
    var element = document.getElementById("progressIndicator");
    element.style.visibility = "visible";
    element.style.width=element.oldWidth;
    element.style.height=element.oldHeight;
}

function progressIndicatorOff()
{
    var element = document.getElementById("progressIndicator");
    element.oldWidth = element.style.width;
    element.oldHeight = element.style.height;
    element.style.visibility = "hidden";
    element.style.width="0px";
    element.style.height="0px";
}

function startup()
{
    clearText();
    gadgetState.visited = new Array;
    gadgetState.numVisited = 0;
    gadgetState.target = null;
    gadgetState.timerId = 0;
    gadgetState.invocationCounter = 0;
    gadgetState.maxFilesPerInterval = 100;
    gadgetState.restIntervalMillis = 25;
    gadgetState.tallySizeBytes = 0;
    gadgetState.tallyStack = new Array(0);
    gadgetState.numFiles = 0;
    gadgetState.numFolders = 0;

    setPieColors("#a0a0a0", "#333333");
    setSliceColors(0, "#ff0000", "#400000");
    setSliceColors(1, "#00ff00", "#004000");
    setSliceColors(2, "#0000ff", "#000040");
    progressIndicatorOff();
    if (DEBUG)
    {
        document.getElementById("debugDiv").style.display="block";
        debug("Debug ENABLED");
    }
}

function dropShipment()
{
    try
    {
        kickOff();
    }
    catch(error)
    {
        var errorText = error.name + ": " + error;
        if (error.message)
        {
            errorText += ": " + error.message;
        }
        else if (error.cause)
        {
            errorText += ": " + error.cause;
        }
        else if (error.description)
        {
            errorText += ": " + error.description;
        }

        mainDiv.innerText =  errorText;
    }
}

function runloopDebug(invocationCounter)
{
    try
    {
        tallyHelper(invocationCounter);
    }
    catch(error)
    {
        var errorText = error.name + ": " + error;
        if (error.message)
        {
            errorText += ": " + error.message;
        }
        else if (error.cause)
        {
            errorText += ": " + error.cause;
        }
        else if (error.description)
        {
            errorText += ": " + error.description;
        }

        mainDiv.innerText =  errorText;
    }
}

/**
 * Starts the tallying process. 
 */
function kickOff()
{
    var droppedItem = System.Shell.itemFromFileDrop(event.dataTransfer, 0);
    var target;
    if (droppedItem.isLink)
    {
        target = System.Shell.itemFromPath(droppedItem.link);
    }
    else
    {
        target = System.Shell.itemFromPath(droppedItem.path);
    }

    if (!target.isFolder)
    {
        clearText(); // nothing to do
        return;
    }
    else
    {
        clearText();
        setFolderValue("Processing...");
        progressIndicatorOn();
    }

    gadgetState.visited = new Array(0);
    gadgetState.numVisited = 0;
    gadgetState.timerId = 0;
    gadgetState.tallySizeBytes = 0;
    gadgetState.tallyStack = new Array(0);
    gadgetState.numFiles = 0;
    gadgetState.numFolders = 0;

    gadgetState.invocationCounter++;
    gadgetState.target = target;
    gadgetState.visited[target.path] = new Object;
    gadgetState.visited[target.path].size = 0;
    gadgetState.visited[target.path].parent = null;
    gadgetState.visited[target.path].numFiles = 0;

    var tallyState = new Object;
    tallyState.bootstrap = true;
    tallyState.target = target;
    gadgetState.tallyStack.push(tallyState);
    if (DEBUG)
    {
        document.getElementById("debugDiv").innerText = "";
        gadgetState.timerId = setTimeout('runloopDebug(' + gadgetState.invocationCounter + ')', 1);
    }
    else
    {
        gadgetState.timerId = setTimeout('tallyHelper(' + gadgetState.invocationCounter + ')', 1);
    }
}

/**
 * Completes the process, rendering information and graphics.
 */ 
function finishUp()
{
    var mainDiv = document.getElementById("mainDiv");
    var fullWidth = mainDiv.style.pixelWidth;
    var fullHeight = mainDiv.style.pixelHeight;
    var centerX = fullWidth / 2;
    var centerY = fullHeight / 2;
    var smallestDimension = fullHeight;
    if (fullHeight > fullWidth)
    {
        smallestDimension = fullWidth;
    }

    var pieWidth = smallestDimension;
    var pieHeight = pieWidth;
    var sliceOffset = 3;
    var pieRadius = (smallestDimension / 2) - (sliceOffset * 2);
    var pieX = centerX;
    var pieY = centerY;

    var targetSizeBytes = gadgetState.tallySizeBytes;

    var driveLetter = gadgetState.target.path.charAt(0).toUpperCase();
    var drive = System.Shell.drive(driveLetter);
    var totalSizeMB = drive.totalSize;
    var freeSpaceMB = drive.freeSpace;
    var usedSpaceMB = totalSizeMB - freeSpaceMB;

    var percentUsedSpaceUsedByFolder = targetSizeBytes / (usedSpaceMB * 1024 * 1024);
    var formattedPercent = (percentUsedSpaceUsedByFolder * 100).toFixed(1);
    var formattedSize = formatSizeNice(targetSizeBytes);

    progressIndicatorOff();
    setFolderValue(gadgetState.target.name.length > 15 ?
        (gadgetState.target.name.substr(0,15) + "...") : gadgetState.target.name);
    setSizeValue(formattedSize);
    setFilesValue(gadgetState.numFiles);
    setPercentOfUsedSpaceValue((formattedPercent < 10 ? "0" : "") + formattedPercent + "% of used");

    var sliceSizes = new Array;
    sliceSizes[0] = percentUsedSpaceUsedByFolder * 360;
    setSliceColors(0, "#ffffff", "#a0a0a0");
    makePieWithSlices("mainDiv", pieX, pieY, sliceOffset, pieRadius,
        sliceSizes, 100);

    var sortedChildren = getEntriesDecreasingOrder(gadgetState.target.path);
    if (DEBUG)
    {
        for (var x=0; x<sortedChildren.length; x++)
        {
            debug("\n#" + x + ": " + sortedChildren[x].path + ": " + sortedChildren[x].size);
        }
    }

    sliceSizes = new Array;
    for (var x=0; x<sortedChildren.length && x<3; x++)
    {
        var percentSpaceFromParent = sortedChildren[x].size / targetSizeBytes;
        sliceSizes[x] = percentSpaceFromParent * 360;
    }
    setSliceColors(0, "#ff0000", "#400000");
    makePieWithSlices("childrenDiv", pieX, pieY, sliceOffset, pieRadius,
        sliceSizes, 100);

    // Clean up right away to avoid holding onto memory we don't need
    gadgetState.visited = null;
    gadgetState.visited = new Array;
    gadgetState.numVisited = 0;
    gadgetState.target = null;
}


function formatSizeNice(bytes)
{
    var nextUnitLowerBound = 1024;
    var unit = "bytes";

    if (bytes < nextUnitLowerBound)
    {
        // No need for any floating-point precision calculations or whatever
        return bytes + " " + unit;
    }

    for (var unitIndex = 0; (unitIndex < sizeUnits.length) && (nextUnitLowerBound < bytes); unitIndex++)
    {
        unit = sizeUnits[unitIndex];
        nextUnitLowerBound *= 1024;
    }

    var result = bytes / (nextUnitLowerBound / 1024);
    return (result.toFixed(2) + " " + unit);
}

function tallyHelper(invocationCounter)
{
    while(tallyFolderSize(invocationCounter))
    {
        // Yay.
    }
}

/**
 * Invoked on the timer.
 * Accumulates data in gadgetState.
 */
function tallyFolderSize(invocationCounter)
{
    // Check if we are executing the user's latest request.
    if (invocationCounter != gadgetState.invocationCounter)
    {
        // We are behind the times.  We've been canceled!
        return false;
    }

    // If we aren't behind the times, see if there is work to be done.
    if (gadgetState.tallyStack.length == 0)
    {
        // No work to be done.  We are finished!
        finishUp();
        return false;
    }

    // Otherwise, there is work to be done.
    var tallyState = gadgetState.tallyStack.pop();

    if (tallyState.bootstrap)
    {
        // First time for this folder.
        tallyState.contents = tallyState.target.SHFolder.Items;
        tallyState.numEntries = tallyState.contents.count;
        tallyState.index = 0;
        tallyState.bootstrap = false;
    }

    var entry;
    var resolvedEntry;
    var sizeBytes = 0;
    var numLoops = 0;
    for (; tallyState.index<tallyState.numEntries; tallyState.index++)
    {
        if (gadgetState.numVisited > 0 && numLoops > 0
            && (gadgetState.numVisited % gadgetState.maxFilesPerInterval) == 0)
        {
            // We need to rest for a while to let the system have some time.
            // Push our current state onto the stack...
            // (Note: Technically, it is possible to force the state machine
            // into a worst-case scenario by nesting folders with exactly one
            // entry each; in this case, this method will never stop to rest,
            // so to speak, and may appear unresponsive until it reaches the
            // end of the tree of such directories.  This will not happen
            // with any great frequency in reality, and the program will still
            // function in a degraded mode if it does.)
            gadgetState.tallyStack.push(tallyState);
            setFolderValue(gadgetState.numVisited + " files");

            // Set the timeout to come back here in a little while...
            if (DEBUG)
            {
                debug("\nresting for " + gadgetState.restIntervalMillis + "ms");
                gadgetState.timerId = setTimeout('runloopDebug(' + invocationCounter + ')', gadgetState.restIntervalMillis);
            }
            else
            {
                gadgetState.timerId = setTimeout('tallyHelper(' + invocationCounter + ')', gadgetState.restIntervalMillis);
            }

            // And finally, halt execution of this method.
            return false;
        }

        // If we get this far we have a valid state and are still on-track.
        numLoops++;

        // Iterate over the list of System.Shell.Item objects in the directory
        entry = tallyState.contents.item(tallyState.index);
        var ok = true;

        if (!entry || !entry.path)
        {
            // Weird.  Don't know how to process these.
            ok = false;
        }
        else if (gadgetState.visited[entry.path])
        {
            // Somehow ended up in a circular loop.  Stop!!!
            if (DEBUG) debug("\nbroke out of loop");
            ok = false;
        }
        else
        {
            gadgetState.numVisited++;
        }

        if (ok)
        {
            // "System.Shell.Item.isFile" is currently broken (26 May 2007)
            if (entry.isLink)
            {
                // Ignore links.
            }
            else if (entry.isFolder)
            {
                // A directory, or a file.  Note that ZIP files are considered
                // directories.
                // If this is an archive file, its size is it's compressed size,
                // not the size of its contents (we do not want to open the zip
                // files.  We really, really don't want to.
                var path = entry.path.toString();
                var archive = isArchive(path);
    
                if (!archive)
                {
                    // Regular folder
                    gadgetState.visited[entry.path] = new Object;
                    gadgetState.visited[entry.path].size = 0;
                    gadgetState.visited[entry.path].parent = tallyState.target;
                    gadgetState.visited[entry.path].numFiles = 0;
                    gadgetState.visited[entry.path].path = entry.path;

                    // if (DEBUG) debug("\nfolder:" + path);
                    // Recurse.
                    var newState = new Object;
                    newState.bootstrap = true;
                    newState.target = entry;
                    // Push new state onto the stack...
                    gadgetState.tallyStack.push(newState);
                    gadgetState.numFolders++;
                }
                else
                {
                    // Archive folder
                    gadgetState.tallySizeBytes += entry.size;
                    gadgetState.numFiles++;
                    addSizeRecursive(tallyState.target.path, entry.size);
                    // if (DEBUG) debug("\narchive:" + path);
                }
            }
            else
            {
                // Not a directory, not a link.
                // Must be a file!
                gadgetState.tallySizeBytes += entry.size;
                gadgetState.numFiles++;
                addSizeRecursive(tallyState.target.path, entry.size);
                // if (DEBUG) debug("\nfile:" + entry.path);
            }
        }
    }

    // If we get here, we have not set the timer to call us back.
    // This means we have either finished, or we have just added things to the
    // stack but haven't yet hit the limit of resources we can examine in this
    // interval.
    // Return true; the helper will invoke us again immediately.
    return true;
}

/**
 * Adds size recursively to the target entry itself as well as all of its
 * parents.
 */
function addSizeRecursive(parentPath, size)
{
    var target = parentPath;
    while(true)
    {
        gadgetState.visited[target].size += size;
        gadgetState.visited[target].numFiles++;
        if (gadgetState.visited[target].parent)
        {
            target = gadgetState.visited[target].parent.path;
        }
        else
        {
            return;
        }
    }
}

/**
 * Returns true if the file is an archive; otherwise, returns false.
 */
function isArchive(path)
{
    var lastDot = path.lastIndexOf(".");
    if (lastDot >= 0 && lastDot < path.length - 1)
    {
        var extension = path.substring(lastDot + 1).toLowerCase();
        for (var extensionIndex = 0; extensionIndex < archiveExtensions.length; extensionIndex++)
        {
            if (archiveExtensions[extensionIndex] == extension)
            {
                return true;
            }
        }
    }
    return false;
}

function debug(text)
{
    document.getElementById("debugDiv").innerText += text;
}

function clearText()
{
    setFolderValue(defaultMessage);
    setSizeValue("");
    setFilesValue("");
    setPercentOfUsedSpaceValue("");
}

function setFolderValue(text)
{
    document.getElementById("folderValue").innerText = text;
}

function setSizeValue(text)
{
    document.getElementById('sizeValue').innerText = text;
}

function setFilesValue(text)
{
    document.getElementById('filesValue').innerText = text;
}

function setPercentOfUsedSpaceValue(text)
{
    document.getElementById('percentValue').innerText = text;
}

/**
 * Compares two entries in the visted[] hash based on size.
 */
function entryCompare(a,b)
{
    return a.size - b.size;
}

/**
 * Returns an ordered listing of all children of the specified
 * folder, sorted by decreasing size.
 */
function getEntriesDecreasingOrder(path)
{
    var mainEntry = System.Shell.itemFromPath(path);
    var contents = mainEntry.SHFolder.Items;
    var numEntries = contents.count;
    var children = new Array(0);
    for (var x=0; x<numEntries; x++)
    {
        var path = contents.item(x).path;
        if (gadgetState.visited[path])
        {
            children.push(gadgetState.visited[path]);
        }
    }
    children.sort(entryCompare);
    children.reverse();
    return children;
}