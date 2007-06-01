var gadgetPath = System.Gadget.path;

// List of archive formats we will not open
var archiveExtensions = [
    "zip", "tar", "gz", "z", "tgz", "bz2", "rar", "jar", "7z",
    "ear", "war", "lzh", "lzx", "ace", "cab", "iso", "arc", "arj"];

// If we get beyond yottabytes (10^24) while using JavaScript, the future is bleak indeed.
var sizeUnits = ["KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
var gadgetState = new Object;
var DEBUG = false;

function startup()
{
    // Prepare for debugging
    if (DEBUG)
    {
        document.getElementById("debugDiv").style.display="block";
        debug("Debug ENABLED");
    }

    // Init state object
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
    gadgetState.cancelButtonId = "cancelButton";
    gadgetState.targetPieDivId = "targetPieDiv";
    gadgetState.targetSuffix = "_target";
    gadgetState.childrenPieDivId = "childrenPieDiv";
    gadgetState.progressIndicatorId = "progressIndicator";
    gadgetState.childSuffix = "_child";

    // Show defaults.
    setVisible(gadgetState.progressIndicatorId, false);
    setVisible(gadgetState.cancelButtonId, false);
    setEnabled(gadgetState.cancelButtonId, false);
    showProcessingScreen();
    showDefaultProcessingText();

    // Set up default colors
    setPieColors("#a0a0a0", "#333333");
    setSliceColors(0, "#ff0000", "#400000");
    setSliceColors(1, "#00ff00", "#004000");
    setSliceColors(2, "#0000ff", "#000040");
}

function cancel()
{
    if (gadgetState.timerId !== 0)
    {
        gadgetState.invocationCounter++;
        clearTimeout(gadgetState.timerId);
        gadgetState.timerId = 0;
        setVisible(gadgetState.progressIndicatorId, false);
        showDefaultProcessingText();
    }
}

function showProcessingScreen()
{
    document.getElementById('resultsScreen').style.visibility="hidden";
    document.getElementById('processingScreen').style.visibility="visible";
}

function showDefaultProcessingText()
{
    setVisible(gadgetState.cancelButtonId, false);
    setEnabled(gadgetState.cancelButtonId, false);
    document.getElementById('processingLabel').innerText="Drag a drive or folder";
    document.getElementById('processingValue').innerText="here to begin...";
}

function showProcessingProgressText()
{
    setEnabled(gadgetState.cancelButtonId, true);
    setVisible(gadgetState.cancelButtonId, true);
    document.getElementById('processingLabel').innerText="Processing...";
    document.getElementById('processingValue').innerText="";
}

function updateProgress(numFiles)
{
    document.getElementById('processingValue').innerText=numFiles + " files";
}

function showResultsScreen()
{
    document.getElementById('processingScreen').style.visibility="hidden";
    document.getElementById('resultsScreen').style.visibility="visible";
}

function setVisible(elementId, visible)
{
    var element = document.getElementById(elementId);
    if (visible)
    {
        element.style.visibility = "visible";
        element.style.width=element.oldWidth;
        element.style.height=element.oldHeight;
    }
    else
    {
        element.oldWidth = element.style.width;
        element.oldHeight = element.style.height;
        element.style.visibility = "hidden";
        element.style.width="0px";
        element.style.height="0px";
    }
}

function setEnabled(elementId, enabled)
{
    var element = document.getElementById(elementId);
    element.style.enabled = (enabled ? "true" : "false");
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

        if (DEBUG) debug(errorText);
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

        if (DEBUG) debug(errorText);
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
        showDefaultProcessingText();
        setVisible(gadgetState.progressIndicatorId, false);
        setVisible(gadgetState.cancelButtonId, false);
        setEnabled(gadgetState.cancelButtonId, false);
        showProcessingScreen();
        return;
    }
    else
    {
        showProcessingProgressText();
        setEnabled(gadgetState.cancelButtonId, true);
        setVisible(gadgetState.progressIndicatorId, true);
        setVisible(gadgetState.cancelButtonId, true);
        showProcessingScreen();
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
        debug("kicking off, target=" + target.path);
        gadgetState.timerId = setTimeout('runloopDebug(' + gadgetState.invocationCounter + ')', 1);
    }
    else
    {
        gadgetState.timerId = setTimeout('tallyHelper(' + gadgetState.invocationCounter + ')', 1);
    }
}

function updateStats(idSuffix, maxFolderChars, folderName, percent, sizeBytes, numFiles)
{
    var formattedPercent = (percent < 0.1 ? "0" : "") + (percent * 100).toFixed(1);
    var formattedSize = formatSizeNice(sizeBytes);

    var element = document.getElementById("folderName" + idSuffix);
    if (element)
    {
        var folderText = folderName.length > maxFolderChars ?
            folderName.substr(0,maxFolderChars) + "..." : folderName;
        element.innerText = folderText;
    }

    element = document.getElementById("statsLine1" + idSuffix);
    if (element)
    {
        element.innerText = formattedPercent + "% / " + formattedSize;
    }

    element = document.getElementById("statsLine2" + idSuffix);
    if (element)
    {
        element.innerText = numFiles + " files";
    }
}

function updateTargetResults(pieDivId)
{
    var mainDiv = document.getElementById(pieDivId);
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

    /* FIXME: Use the number of files from the visited[] hash. */
    updateStats(gadgetState.targetSuffix, 12,
        gadgetState.target.name, percentUsedSpaceUsedByFolder,
        gadgetState.tallySizeBytes, gadgetState.numFiles);

    var sliceSizes = new Array;
    sliceSizes[0] = percentUsedSpaceUsedByFolder * 360;
    setSliceColors(0, "#ffffff", "#a0a0a0");
    makePieWithSlices(pieDivId, pieX, pieY, sliceOffset, pieRadius,
        sliceSizes, 100);
}


function updateChildrenResults(pieDivId)
{
    var mainDiv = document.getElementById(pieDivId);
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

    var sortedChildren = getEntriesDecreasingOrder(gadgetState.target.path);
    if (DEBUG)
    {
        for (var x=0; x<sortedChildren.length; x++)
        {
            debug("#" + x + ": " + sortedChildren[x].path + ": " + sortedChildren[x].size);
        }
    }

    var numChildren = sortedChildren.length;
    document.getElementById("childrenCount").innerText = (numChildren >= 3 ? 3 : numChildren);

    var targetSizeBytes = gadgetState.tallySizeBytes;
    var sliceSizes = new Array;
    for (var index=0; index<numChildren && index<3; index++)
    {
        var percentSpaceFromParent = sortedChildren[index].size / targetSizeBytes;
        var childEntry = System.Shell.itemFromPath(sortedChildren[index].path);
        if (childEntry)
        {
            sliceSizes[index] = percentSpaceFromParent * 360;
    
            updateStats(gadgetState.childSuffix + index, 18,
                childEntry.name, percentSpaceFromParent,
                sortedChildren[index].size, sortedChildren[index].numFiles);
        }
        else
        {
            //Deleted by the user before we got here perhaps... (ewww)
            sliceSizes[index] = 0;
    
            updateStats(gadgetState.childSuffix + index, 18,
                "[Unknown]", percentSpaceFromParent,
                sortedChildren[index].size, sortedChildren[index].numFiles);
        }
    }
    setSliceColors(0, "#ff0000", "#400000");
    makePieWithSlices(pieDivId, pieX, pieY, sliceOffset, pieRadius,
        sliceSizes, 100);
}

/**
 * Completes the process, rendering information and graphics.
 */ 
function finishUp()
{
    showResultsScreen();
    setVisible(gadgetState.progressIndicatorId, false);
    setVisible(gadgetState.cancelButtonId, false);
    setEnabled(gadgetState.cancelButtonId, false);

    updateTargetResults(gadgetState.targetPieDivId);
    updateChildrenResults(gadgetState.childrenPieDivId);

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
        // truly nothing here.  This is just a while loop
        // that goes forever...
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

    if (DEBUG) debug("tallyStack.length=" + gadgetState.tallyStack.length);

    // If we aren't behind the times, see if there is work to be done.
    if (gadgetState.tallyStack.length === 0)
    {
        // No work to be done.  We are finished!
        finishUp();
        return false;
    }

    if (DEBUG) debug("working...");

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
        if (gadgetState.numVisited > 0 && numLoops > 0 && (gadgetState.numVisited % gadgetState.maxFilesPerInterval) === 0)
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
            updateProgress(gadgetState.numVisited);

            // Set the timeout to come back here in a little while...
            if (DEBUG)
            {
                debug("resting for " + gadgetState.restIntervalMillis + "ms");
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
            if (DEBUG) debug("broke out of loop");
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

                    // if (DEBUG) debug("folder:" + path);
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
                    // if (DEBUG) debug("archive:" + path);
                }
            }
            else
            {
                // Not a directory, not a link.
                // Must be a file!
                gadgetState.tallySizeBytes += entry.size;
                gadgetState.numFiles++;
                addSizeRecursive(tallyState.target.path, entry.size);
                // if (DEBUG) debug("file:" + entry.path);
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
    document.getElementById("debugDiv").innerText += "\n" + text;
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
        var childPath = contents.item(x).path;
        if (gadgetState.visited[childPath])
        {
            children.push(gadgetState.visited[childPath]);
        }
    }
    children.sort(entryCompare);
    children.reverse();
    return children;
}