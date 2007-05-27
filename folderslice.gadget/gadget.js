var defaultMessage = "Drag folder(s) here..."
var gadgetPath = System.Gadget.path;

// List of archive formats we will not open
var archiveExtensions = [
    "zip", "tar", "gz", "z", "tgz", "bz2", "rar", "jar", "7z",
    "ear", "war", "lzh", "lzx", "ace", "cab", "iso", "arc", "arj"];

// If we get beyond yottabytes (10^24) while using JavaScript, the future is bleak indeed.
var sizeUnits = ["KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];

var visited = new Array;
var numVisited = 0;
var DEBUG = false;

function startup()
{
}

function dropShipment()
{
    runloopDebug();
}

function runloopDebug()
{
    try
    {
        runloop();
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

function runloop()
{
    var mainDiv = null;
    var titleDiv;
    var centerX;
    var centerY;
    var fullWidth;
    var fullHeight;
    var pieX;
    var pieY;
    var pieWidth;
    var pieHeight;
    var pieRadius;
    var sliceOffset;

    mainDiv = document.getElementById("mainDiv");
    titleDiv = document.getElementById("titleDiv");
    fullWidth = mainDiv.style.pixelWidth;
    fullHeight = mainDiv.style.pixelHeight;
    centerX = fullWidth / 2;
    centerY = fullHeight / 2;

    var smallestDimension = fullHeight;
    if (fullHeight > fullWidth)
    {
        smallestDimension = fullWidth;
    }

    pieWidth = smallestDimension;
    pieHeight = pieWidth;
    sliceOffset = 3;
    pieRadius = (smallestDimension / 2) - sliceOffset;
    pieX = centerX;
    pieY = centerY;

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
        setText(defaultMessage);
        return;
    }
    else
    {
        setText("Processing...");
    }

    if (DEBUG) debug("\n" + archiveExtensions.length + " known extensions");
    numVisited = 0;
    var targetSizeBytes = tallyFolderSize(target);
    visited = null;
    visited = new Array;

    var formattedSize = formatSizeNice(targetSizeBytes);

    if (!DEBUG)
    {
        setText(
            "Folder '" + target.name + "':"
            + "\nSize: " + formattedSize + " (" + numVisited + " files)");
    }
    else
    {
        debug(
            "Folder '" + target.name + "':"
            + "\nSize: " + formattedSize + " (" + numVisited + " files)");
    }

    debug("\ndiv at " + mainDiv.style.pixelLeft + "," + mainDiv.style.pixelTop + ", size=" + fullWidth + "x" + fullHeight);
    debug("\npie at " + pieX + "," + pieY + "; radius=" + pieRadius);

    makePieWithSlice("mainDiv", pieX, pieY, sliceOffset, pieRadius, 50, 100);
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
    return (result.toFixed(3) + " " + unit);
}

// 'folder' must be of type 'System.Shell.Item' and must be a directory.
function tallyFolderSize(folder)
{
    var contents = folder.SHFolder.Items;
    var numEntries = contents.count;
    var entry;
    var resolvedEntry;
    var sizeBytes = 0;
    for (var index=0; index<numEntries; index++)
    {
        // Iterate over the list of System.Shell.Item objects in the directory
        entry = contents.item(index);

        if (!entry || !entry.path)
        {
            // Weird.  Don't know how to process these.
            return 0;
        }
        else if (visited[entry.path])
        {
            // Somehow ended up in a circular loop.  Stop!!!
            if (DEBUG) debug("\nbroke out of loop");
            return 0;
        }
        else
        {
            visited[entry.path] = true;
            numVisited++;
        }

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
            var lastDot = path.lastIndexOf(".");
            var isArchive = false;
            if (lastDot >= 0 && lastDot < path.length - 1)
            {
                var extension = path.substring(lastDot + 1).toLowerCase();
                for (var extensionIndex = 0; extensionIndex < archiveExtensions.length; extensionIndex++)
                {
                    if (archiveExtensions[extensionIndex] == extension)
                    {
                        isArchive = true;
                    }
                }
            }

            if (!isArchive)
            {
                if (DEBUG) debug("\nfolder:" + path);
                sizeBytes += tallyFolderSize(entry);
            }
            else
            {
                sizeBytes += entry.size;
                if (DEBUG) debug("\narchive:" + entry + "(" + entry.size + ")");
            }
        }
        else
        {
            // Not a directory, not a link.
            // Must be a file!
            sizeBytes += entry.size;
            if (DEBUG) debug("\nfile:" + entry.path + "(" + entry.size + ")");
        }
    }
    return sizeBytes;
}

function setText(text)
{
    titleDiv.innerText = text;
}

function debug(text)
{
    titleDiv.innerText += text;
}