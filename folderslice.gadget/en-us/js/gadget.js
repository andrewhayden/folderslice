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

    try
    {
        startupInternal();
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

function startupInternal()
{
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
    gadgetState.sortedTargetChildren = new Array(0);
    gadgetState.numFiles = 0;
    gadgetState.numFolders = 0;
    gadgetState.cancelButtonId = "cancelButton";
    gadgetState.targetPieDivId = "targetPieDiv";
    gadgetState.targetSuffix = "_target";
    gadgetState.childrenPieDivId = "childrenPieDiv";
    gadgetState.childrenSwatchDivId = "childSwatchDiv";
    gadgetState.progressIndicatorId = "progressIndicator";
    gadgetState.childSuffix = "_child";
    gadgetState.maxTargetChars = 12;
    gadgetState.maxChildChars = 16;
    gadgetState.pieColors = new Object;
    gadgetState.pieColors.color1 = "#a0a0a0";
    gadgetState.pieColors.color2 = "#333333";
    gadgetState.childSliceColors = new Array(0);
    gadgetState.childSliceColors[0] = new Object;
    gadgetState.childSliceColors[0].color1 = "#ff0000";
    gadgetState.childSliceColors[0].color2 = "#400000";
    gadgetState.childSliceColors[1] = new Object;
    gadgetState.childSliceColors[1].color1 = "#00ff00";
    gadgetState.childSliceColors[1].color2 = "#004000";
    gadgetState.childSliceColors[2] = new Object;
    gadgetState.childSliceColors[2].color1 = "#0000ff";
    gadgetState.childSliceColors[2].color2 = "#000040";
    gadgetState.showFlyoutOnFinish = false;

    // Show defaults.
    document.getElementById(gadgetState.cancelButtonId).noResize = true;
    document.getElementById('resultsScreen').noResize = true;
    document.getElementById('processingScreen').noResize = true;
    document.getElementById('childrenDiv0').noResize = true;
    document.getElementById('childrenDiv1').noResize = true;
    document.getElementById('childrenDiv2').noResize = true;
    document.getElementById('parentGoButton').noResize = true;
    document.getElementById(gadgetState.progressIndicatorId).noResize = true;

    setVisible(gadgetState.progressIndicatorId, false);
    setVisible(gadgetState.cancelButtonId, false);
    setEnabled(gadgetState.cancelButtonId, false);
    setVisible('childrenDiv0', false);
    setVisible('childrenDiv1', false);
    setVisible('childrenDiv2', false);
    setVisible('parentGoButton', false);
    showProcessingScreen();
    showDefaultProcessingText();

    // Taste the rainbow, ride the walrus.
    var rainbow = new Array(0);
    rainbow[0] = "#ff0000";
    rainbow[1] = "#dd8000";
    rainbow[2] = "#ffff00";
    rainbow[3] = "#00ff00";
    rainbow[4] = "#0000ff";
    rainbow[5] = "#8000ff";
    rainbow[6] = "#ff00ff";
    gadgetState.rainbow = rainbow;
    gadgetState.rainbowWeights = makeEqualWeightsArray(rainbow);
    gadgetState.rainbow.childColors = new Array(0);

    if (DEBUG) debug("Startup complete.");
}

function showAnalysisFlyout()
{
    System.Gadget.Flyout.file =  'analysisFlyout.html';
    System.Gadget.Flyout.show = true;
}

function hideAnalysisFlyout()
{
    System.Gadget.Flyout.show = false;
}

function flyoutLoaded()
{
    try
    {
        flyoutLoadedInternal();
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

function flyoutLoadedInternal()
{
    var element = System.Gadget.Flyout.document.getElementById('content');
    if (element)
    {
        // Clear any old contents.
        while(element.children && element.children.length > 0)
        {
            element.removeChild(element.children(0));
        }

        // Create new element to hold summary.
        var summaryWrapper = System.Gadget.Flyout.document.createElement("div");
        summaryWrapper.className='summaryWrapper';
        createChildSummaryContainer(System.Gadget.Flyout.document, summaryWrapper);

        // Create new element to hold children.
        var childOuterWrapper = System.Gadget.Flyout.document.createElement("div");
        childOuterWrapper.className='childOuterWrapper';
        var childWrapper = System.Gadget.Flyout.document.createElement("div");
        childWrapper.className='childWrapper';

        // Add everything in.
        childOuterWrapper.appendChild(childWrapper);
        element.appendChild(summaryWrapper);
        element.appendChild(childOuterWrapper);

        // Figure out sizes and colors.
        var sortedChildren = gadgetState.sortedTargetChildren;
        var numChildren = sortedChildren.length;
        var targetSizeBytes = gadgetState.visited[gadgetState.target.path].size;
        var increment = 1 / numChildren;
        var childSizesDegrees = new Array(0);
        var childSizesPercents = new Array(0);
        var childColors = new Array(0);

        for (var index=0; index<numChildren; index++)
        {
            childSizesPercents[index] = sortedChildren[index].size / targetSizeBytes;
            childSizesDegrees[index] = 360* (sortedChildren[index].size / targetSizeBytes);
            var childIndexAsPercent = (index === 0 ? 0 : index / numChildren);
            childColors[index] = new Object;
            childColors[index].color1 = linearArrayInterpolateFromHex(
                gadgetState.rainbow, gadgetState.rainbowWeights, childIndexAsPercent);
            childColors[index].color2 = linearArrayInterpolateFromHex(
                gadgetState.rainbow, gadgetState.rainbowWeights, childIndexAsPercent + increment);
        }

        // We must do the actual content updates last in order for all layout
        // information to be available to javascript.
        updateFlyoutSummaryResults(summaryWrapper, childSizesDegrees, childColors);
        updateFlyoutChildrenResults(childWrapper, childSizesPercents, childColors);
    }
}

function createChildSummaryContainer(containerDocument, containerElement)
{
    var contentDiv = containerDocument.createElement("div");
    var pieWrapper = containerDocument.createElement("div");
    var pieDiv = containerDocument.createElement("div");
    var pieDiv2 = containerDocument.createElement("span");
    var textDiv = containerDocument.createElement("div");
    var titleSpan = containerDocument.createElement("span");
    var detailsSpan = containerDocument.createElement("span");
    var details2Span = containerDocument.createElement("span");
    var details3Span = containerDocument.createElement("span");
    var refreshSpan = containerDocument.createElement("span");
    var refreshAction = containerDocument.createElement("span");
    var refreshLink = containerDocument.createElement("a");
    var upOneLevelSpan = containerDocument.createElement("span");
    var upOneLevelAction = containerDocument.createElement("span");
    var upOneLevelLink = containerDocument.createElement("a");

    // Assign class
    contentDiv.className='childSummary';
    pieWrapper.className='childSummaryPieWrapper';
    pieDiv.className='childSummaryPie';
    pieDiv2.className='childSummaryParentPie';
    textDiv.className='childSummaryText';
    titleSpan.className='childSummaryTitle';
    detailsSpan.className='childSummaryDetails';
    details2Span.className='childSummaryDetails';
    details3Span.className='childSummaryDetails';
    refreshSpan.className='childSummaryRefreshSpan';
    refreshAction.className='childSummaryRefreshAction';
    refreshLink.className='childSummaryRefreshLink';
    upOneLevelSpan.className='childSummaryUpOneLevelSpan';
    upOneLevelAction.className='childSummaryUpOneLevelAction';
    upOneLevelLink.className='childSummaryUpOneLevelLink';

    // Assemble in reverse order...
    refreshSpan.appendChild(refreshAction);
    refreshSpan.appendChild(refreshLink);
    upOneLevelSpan.appendChild(upOneLevelAction);
    upOneLevelSpan.appendChild(upOneLevelLink);
    textDiv.appendChild(titleSpan);
    textDiv.appendChild(containerDocument.createElement("br"));
    textDiv.appendChild(detailsSpan);
    textDiv.appendChild(containerDocument.createElement("br"));
    textDiv.appendChild(details2Span);
    textDiv.appendChild(containerDocument.createElement("br"));
    textDiv.appendChild(details3Span);
    textDiv.appendChild(containerDocument.createElement("br"));
    textDiv.appendChild(refreshSpan);
    textDiv.appendChild(containerDocument.createElement("br"));
    textDiv.appendChild(upOneLevelSpan);
    pieWrapper.appendChild(pieDiv);
    pieWrapper.appendChild(pieDiv2);
    contentDiv.appendChild(pieWrapper);
    contentDiv.appendChild(textDiv);

    // Marker metadata
    containerElement.folderslice = new Object;
    containerElement.folderslice.isChild = true;

    // Set elements as attributes, for easy access
    containerElement.folderslice.contentDiv = contentDiv;
    containerElement.folderslice.textDiv = textDiv;
    containerElement.folderslice.pieWrapper = pieWrapper;
    containerElement.folderslice.pieDiv = pieDiv;
    containerElement.folderslice.pieDiv2 = pieDiv2;
    containerElement.folderslice.titleSpan = titleSpan;
    containerElement.folderslice.detailsSpan = detailsSpan;
    containerElement.folderslice.details2Span = details2Span;
    containerElement.folderslice.details3Span = details3Span;
    containerElement.folderslice.refreshSpan = refreshSpan;
    containerElement.folderslice.refreshAction = refreshAction;
    containerElement.folderslice.refreshLink = refreshLink;
    containerElement.folderslice.upOneLevelSpan = upOneLevelSpan;
    containerElement.folderslice.upOneLevelAction = upOneLevelAction;
    containerElement.folderslice.upOneLevelLink = upOneLevelLink;

    // Attach to container.
    containerElement.appendChild(contentDiv);
}

function createChildResultContainer(containerDocument, containerElement, childIndex, numChildren)
{
    var contentDiv = containerDocument.createElement("div");
    var swatchDiv = containerDocument.createElement("div");
    var textDiv = containerDocument.createElement("div");
    var sizeSpan = containerDocument.createElement("span");
    var navigationDiv = containerDocument.createElement("div");
    var navigationLink = containerDocument.createElement("a");
    var exploreAction = containerDocument.createElement("span");
    var exploreLink = containerDocument.createElement("a");
    var exploreLinkText= containerDocument.createTextNode("");

    // Make color swatch
    var swatchShape = containerDocument.createElement("v:roundrect");
    swatchShape.arcSize = "25%";
    var swatchFill = containerDocument.createElement("v:fill");
    swatchFill.type="gradient";

    // Assign class
    contentDiv.className='childEntry';
    swatchDiv.className='childEntrySwatch';
    textDiv.className='childEntryText';
    sizeSpan.className='childEntrySize';
    navigationDiv.className='childEntryNavigation';
    navigationLink.className='childEntryNavigationLink';
    swatchShape.className='childEntrySwatchShape';
    swatchFill.className='childEntrySwatchFill';
    exploreAction.className = 'childEntryExploreAction';
    exploreLink.className = 'childEntryExploreLink';


    // Give the button an ID
    contentDiv.id = "childEntry" + childIndex;
    
    // Assemble in reverse order...
    swatchShape.appendChild(swatchFill);
    swatchDiv.appendChild(swatchShape);
    exploreLink.appendChild(exploreLinkText);
    navigationDiv.appendChild(exploreAction);
    navigationDiv.appendChild(exploreLink);
    textDiv.appendChild(navigationLink);
    textDiv.appendChild(containerDocument.createElement("br"));
    textDiv.appendChild(sizeSpan);
    textDiv.appendChild(containerDocument.createElement("br"));
    textDiv.appendChild(navigationDiv);
    contentDiv.appendChild(swatchDiv);
    contentDiv.appendChild(textDiv);

    // Marker metadata
    containerElement.folderslice = new Object;
    containerElement.folderslice.isChild = true;

    // Set elements as attributes, for easy access
    containerElement.folderslice.contentDiv = contentDiv;
    containerElement.folderslice.swatchDiv = swatchDiv;
    containerElement.folderslice.swatchShape = swatchShape;
    containerElement.folderslice.swatchFill = swatchFill;
    containerElement.folderslice.textDiv = textDiv;
    containerElement.folderslice.sizeSpan = sizeSpan;
    containerElement.folderslice.navigationDiv = navigationDiv;
    containerElement.folderslice.navigationLink = navigationLink;
    containerElement.folderslice.exploreAction = exploreAction;
    containerElement.folderslice.exploreLink = exploreLink;
    containerElement.folderslice.exploreLinkText = exploreLinkText;

    // Attach to container.
    containerElement.appendChild(contentDiv);
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

        // Clean up right away to avoid holding onto memory we don't need
        gadgetState.visited = null;
        gadgetState.visited = new Array;
        gadgetState.numVisited = 0;
        gadgetState.target = null;
    }
}

function showProcessingScreen()
{
    setVisible('childrenDiv0', false);
    setVisible('childrenDiv1', false);
    setVisible('childrenDiv2', false);
    setVisible('parentGoButton', false);
    setVisible('resultsScreen', false);
    setVisible('processingScreen', true);
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
    if (element)
    {
        if (visible)
        {
            if (!element.noResize && element.oldWidth && element.oldHeight)
            { 
                element.style.width=element.oldWidth;
                element.style.height=element.oldHeight;
            }
            element.style.visibility = "visible";
        }
        else
        {
            if (!element.noResize)
            { 
                element.oldWidth = element.style.width;
                element.oldHeight = element.style.height;
            }

            element.style.visibility = "hidden";

            if (!element.noResize)
            { 
                element.style.width="0px";
                element.style.height="0px";
            }
        }
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
        var droppedItem = System.Shell.itemFromFileDrop(event.dataTransfer, 0);
        kickOff(droppedItem);
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
function kickOff(droppedItem)
{
    hideAnalysisFlyout();
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
    gadgetState.visited[target.path].numImmediateChildren = 0;

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

function updateFlyoutStats(flyoutElement, childIndex, numChildren, folderLocation, folderName, percent, sizeBytes, numFiles, color1, color2)
{
    var formattedPercent = (percent < 0.1 ? "0" : "") + (percent * 100).toFixed(1);
    var formattedSize = formatSizeNice(sizeBytes);

    var element = flyoutElement.folderslice.locationSpan;
    if (element)
    {
        if (!flyoutElement.folderslice.isChild)
        {
            element.innerText = folderLocation;
        }   
    }

    element = flyoutElement.folderslice.sizeSpan;
    if (element)
    {
        if (flyoutElement.folderslice.isChild)
        {
            element.innerText = formattedSize + " in " + numFiles + " files (" + formattedPercent + "% of the parent folder)";
        }
        else
        {
            element.innerText = formattedSize + " in " + numFiles + " files (" + formattedPercent + "% of used space on drive " + getDriveLetter(folderLocation) + ")";
        }
    }

/*
    element = flyoutElement.folderslice.fileCountSpan;
    if (element)
    {
        element.innerText = numFiles + " files";
    }
*/
    if (flyoutElement.folderslice.isChild)
    {
        // Special child entry processing!
        // The path that will be passed back in calls cannot contain any "\"
        // characters.  This appears to be a problem with IE7's JS VM, unless
        // I am missing something.  So, we swap "\" with "/" in our paths...
        // If someone wants to correct my errors, I'd be happy to know
        // what I am doing wrong...
        var bakedPath = hackPathForCall(folderLocation);

        element = flyoutElement.folderslice.swatchFill;
        if (element)
        {
            var increment = 1 / numChildren;
            var childIndexAsPercent = (childIndex === 0 ? 0 : childIndex / numChildren);
            element.color = color1;
            element.color2 = color2;
        }

        element = flyoutElement.folderslice.navigationLink;
        if (element)
        {
            element.href="javascript:flyoutNavigate('" + bakedPath + "');";
            element.innerText = folderName;
        }

        element = flyoutElement.folderslice.exploreAction;
        if (element)
        {
            // Set on-click
            element.onclick=new Function("flyoutExplore('" + bakedPath + "');");
        }

        element = flyoutElement.folderslice.exploreLink;
        if (element)
        {
            element.href="javascript:flyoutExplore('" + bakedPath + "');";
        }

        element = flyoutElement.folderslice.exploreLinkText;
        if (element)
        {
            element.data="Explore this folder...";
        }
    }
}

function hackPathFromCall(path)
{
    return path.replace(/\057/g, "\\");
}

function hackPathForCall(path)
{
    // As far as I can tell, no matter how you try to use string.replace,
    // you cannot get anything with backslashes into a dynamically-generated
    // javascript call.  I tried up to 12 backslashes of escaping, with
    // nothing but failure.
    // There is probably a bug in IE7 JS VM implementation.
    // So, we'll use an illegal character as a workaround.
    return path.replace(/\\/g, "/");
}

function flyoutNavigate(folderLocation)
{
    var bakedPath = hackPathFromCall(folderLocation);
    var entry = System.Shell.itemFromPath(bakedPath);
    if (DEBUG) debug("flyout navigating to... " + bakedPath);
     // If we have visited the location already, we can just display results;
    // Otherwise, we have to do a full parse.
    if (gadgetState.visited[bakedPath])
    {
        gadgetState.invocationCounter++;
        gadgetState.target = entry;
        gadgetState.timerId = setTimeout('finishUp()', 0);
    }
    else
    {
        kickOff(entry);
    }
}

function updateTargetResults(pieDivId)
{
    updateTargetResultsInternal(false, document.getElementById(pieDivId), undefined);
}

function updateTargetResultsInternal(isFlyout, pieDiv, flyoutElement)
{
    // NOTE!  OffsetWidth/Height can only be accessed *AFTER* the element has been added to the page!
    var fullWidth = pieDiv.offsetWidth; // IE-specific alternative to pixelWidth
    var fullHeight = pieDiv.offsetHeight; // IE-specific alternative to pixelHeight
    if (fullWidth === 0 && fullHeight === 0)
    {
        if (DEBUG) debug("height and width of pie are 0; trying alternative");
        fullWidth = pieDiv.style.pixelWidth;
        fullHeight = pieDiv.style.pixelHeight;
    }

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

    if (!isFlyout)
    {
        updateStats(
            gadgetState.targetSuffix, gadgetState.maxTargetChars,
            gadgetState.target.name, percentUsedSpaceUsedByFolder,
            gadgetState.visited[gadgetState.target.path].size,
            gadgetState.visited[gadgetState.target.path].numFiles);
    }
    else
    {
        updateFlyoutStats(
            flyoutElement, 0, 0,
            gadgetState.target.path, gadgetState.target.name,
            percentUsedSpaceUsedByFolder,
            gadgetState.visited[gadgetState.target.path].size,
            gadgetState.visited[gadgetState.target.path].numFiles,
            gadgetState.pieColors.color1,
            gadgetState.pieColors.color2);
    }

    var sliceSizes = new Array;
    sliceSizes[0] = percentUsedSpaceUsedByFolder * 360;
    makePieWithSlices(pieDiv, pieX, pieY, sliceOffset, pieRadius,
        sliceSizes, 100,
        gadgetState.pieColors.color1,
        gadgetState.pieColors.color2,
        gadgetState.childSliceColors);
}

function updateChildrenResults(pieDivId)
{
    updateChildrenResultsInternal(false, document.getElementById(pieDivId), undefined);
}

function updateFlyoutChildrenResults(element, sliceSizes, sliceColors)
{
    // Fill in children.
    var sortedChildren = gadgetState.sortedTargetChildren;
    var numChildren = sortedChildren.length;
    var targetSizeBytes = gadgetState.tallySizeBytes;
    for (var index=0; index<numChildren; index++)
    {
        var childEntry = System.Shell.itemFromPath(sortedChildren[index].path);
        var childElement = System.Gadget.Flyout.document.createElement("div");
        createChildResultContainer(
            System.Gadget.Flyout.document, childElement,
            index, numChildren);
        
        updateFlyoutStats(childElement, index, numChildren,
            childEntry.path, childEntry.name, sliceSizes[index],
            sortedChildren[index].size, sortedChildren[index].numFiles,
            sliceColors[index].color1,
            sliceColors[index].color2);
        element.appendChild(childElement);
    }
}

function updateFlyoutSummaryResults(element, sliceSizes, childColors)
{
    // Fill in children.
    var fullWidth = element.folderslice.pieDiv.offsetWidth; // IE-specific alternative to pixelWidth
    var fullHeight = element.folderslice.pieDiv.offsetHeight; // IE-specific alternative to pixelHeight
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

    var driveLetter = gadgetState.target.path.charAt(0).toUpperCase();
    var drive = System.Shell.drive(driveLetter);
    var totalSizeMB = drive.totalSize;
    var freeSpaceMB = drive.freeSpace;
    var usedSpaceMB = totalSizeMB - freeSpaceMB;
    var targetSizeBytes = gadgetState.visited[gadgetState.target.path].size;
    var formattedSize = formatSizeNice(targetSizeBytes);
    var percentUsedSpaceUsedByFolder = targetSizeBytes / (usedSpaceMB * 1024 * 1024);
    var formattedPercent = (percentUsedSpaceUsedByFolder < 0.1 ? "0" : "") + (percentUsedSpaceUsedByFolder * 100).toFixed(1);

    if (element.folderslice.titleSpan)
    {
        element.folderslice.titleSpan.innerText = gadgetState.target.path;
    }

    if (element.folderslice.detailsSpan)
    {
        element.folderslice.detailsSpan.innerText = "Contains " + formattedPercent + "% of the space used on your hard drive (" + formattedSize + ").";
    }

    var numFiles = gadgetState.visited[gadgetState.target.path].numImmediateChildren;
    if (element.folderslice.details2Span)
    {
        if (numFiles > 0)
        {
            element.folderslice.details2Span.innerText = "This folder contains " + numFiles + " files.";
        }
        else
        {
            element.folderslice.details2Span.innerText = "This folder contains no files.";
        }
    }

    if (element.folderslice.details3Span)
    {
        var numChildren = gadgetState.sortedTargetChildren.length;
        var numFilesInChildren = gadgetState.visited[gadgetState.target.path].numFiles - numFiles;
        if (DEBUG) debug("num files total: " + numFiles + "; num in children: " + numFilesInChildren);
        if (numChildren > 0)
        {
            if (numFilesInChildren > 0)
            {
                element.folderslice.details3Span.innerText = "There are " + numFilesInChildren + (numFiles > 0 ? "additional" : "") + " files within the " + numChildren + " folders listed below.";
            }
            else
            {
                element.folderslice.details3Span.innerText = "There are no additional files contained within the " + numChildren + " folders listed below.";
            }
        }
        else
        {
            element.folderslice.details3Span.innerText = "There are no additional folders or files within this folder.";
        }
    }

    if (element.folderslice.refreshLink)
    {
        element.folderslice.refreshLink.innerText = "Refresh the details for this folder...";
        element.folderslice.refreshLink.href="javascript:flyoutRefresh();";
    }
    else
    {
        debug("no refresh link element...");
    }
    if (element.folderslice.upOneLevelLink)
    {
        element.folderslice.upOneLevelLink.innerText = "Display the details for this folder's parent...";
        element.folderslice.upOneLevelLink.href="javascript:flyoutUpOneLevel();";
    }

    makePieWithSlices(element.folderslice.pieDiv, pieX, pieY, sliceOffset, pieRadius,
        sliceSizes, 100,
        gadgetState.pieColors.color1,
        gadgetState.pieColors.color2,
        childColors);

    // Now create a pie for the parent folder...
    // Fill in children.
    fullWidth = element.folderslice.pieDiv2.offsetWidth; // IE-specific alternative to pixelWidth
    fullHeight = element.folderslice.pieDiv2.offsetHeight; // IE-specific alternative to pixelHeight
    centerX = fullWidth / 2;
    centerY = fullHeight / 2;
    smallestDimension = fullHeight;
    if (fullHeight > fullWidth)
    {
        smallestDimension = fullWidth;
    }

    pieWidth = smallestDimension;
    pieHeight = pieWidth;
    sliceOffset = 3;
    pieRadius = (smallestDimension / 2) - (sliceOffset * 2);
    pieX = centerX;
    pieY = centerY;

    sliceSizes = new Array;
    sliceSizes[0] = percentUsedSpaceUsedByFolder * 360;
    makePieWithSlices(element.folderslice.pieDiv2, pieX, pieY, sliceOffset, pieRadius,
        sliceSizes, 100,
        gadgetState.pieColors.color1,
        gadgetState.pieColors.color2,
        gadgetState.childSliceColors);
}

function updateChildrenResultsInternal(isFlyout, pieDiv, flyoutElement)
{
    var fullWidth = pieDiv.offsetWidth; // IE-specific alternative to pixelWidth
    var fullHeight = pieDiv.offsetHeight; // IE-specific alternative to pixelHeight
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
    gadgetState.sortedTargetChildren = sortedChildren;

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
    
            updateStats(gadgetState.childSuffix + index, gadgetState.maxChildChars,
                childEntry.name, percentSpaceFromParent,
                sortedChildren[index].size, sortedChildren[index].numFiles);
        }
        else
        {
            //Deleted by the user before we got here perhaps... (ewww)
            sliceSizes[index] = 0;
    
            updateStats(gadgetState.childSuffix + index, gadgetState.maxChildChars,
                "[Unknown]", percentSpaceFromParent,
                sortedChildren[index].size, sortedChildren[index].numFiles);
        }

        // Fill color swatches, if they exist
        makeColorSwatch(index);

        // Make child visible.
        setVisible("childrenDiv" + index, true);
        if (DEBUG) debug("made child visible: " + "childrenDiv" + index);
    }

    var numChildrenToHide = 3 - numChildren;
    for (var hideIndex = numChildrenToHide; hideIndex > numChildren - 1; hideIndex--)
    {
        setVisible("childrenDiv" + hideIndex, false);
        if (DEBUG) debug("made child hidden: " + "childrenDiv" + hideIndex);
    }

    makePieWithSlices(pieDiv, pieX, pieY, sliceOffset, pieRadius,
        sliceSizes, 100,
        gadgetState.pieColors.color1,
        gadgetState.pieColors.color2,
        gadgetState.childSliceColors);
}

function makeColorSwatch(index)
{
    var id = gadgetState.childrenSwatchDivId + index;
    var element = document.getElementById(id);
    if (element)
    {
        // if (DEBUG) debug("creating swatch for child " + id);
        // Clear any old data in the div
        clearElement(id);

        // Create swatch
        var swatchElement = document.createElement("v:roundrect");
        swatchElement.style.width = "16px";
        swatchElement.style.height = "16px";
        swatchElement.arcSize = "30%";
        var fillElement = document.createElement("v:fill");
        fillElement.type="gradient";
        fillElement.color=gadgetState.childSliceColors[index].color1;
        fillElement.color2=gadgetState.childSliceColors[index].color2;

        swatchElement.appendChild(fillElement);
        element.appendChild(swatchElement);
    }
}

function clearElement(elementId)
{
    var element = document.getElementById(elementId);
    if (element)
    {
        while(element.children && element.children.length > 0)
        {
            element.removeChild(element.children(0));
        }
    }
}

/**
 * Enters a child folder.
 */
function childNavigate(childId)
{
    var index = new Number(childId).valueOf();
    var childEntry = System.Shell.itemFromPath(gadgetState.sortedTargetChildren[index].path);
    if (DEBUG) debug("navigating to child, path=" + childEntry.path);
    gadgetState.invocationCounter++;
    gadgetState.target = childEntry;
    gadgetState.timerId = setTimeout('finishUp()', 0);
}

/**
 * Returns the System.Shell.Item that constitutes the parent of the specified
 * path, provided that the specified path is not a top-level directory
 * (e.g., a drive).
 *
 * A 'top level directory' is naievely defined here as a path ending with
 * a file separator character ('\'), as Windows stores the path
 * to a drive as simply "[letter][colon][backslash]", e.g. "C:\" and "D:\".
 */
function getParent(path)
{
    var indexOfFileSeparator = path.lastIndexOf("\\");
    if (indexOfFileSeparator >= 0 && indexOfFileSeparator < path.length - 1)
    {
        var newPath = path.substr(0, indexOfFileSeparator);
        return System.Shell.itemFromPath(newPath);
    }
    else
    {
        return undefined; // no parent
    }
}

function getDriveShellItem(path)
{
    var indexOfFileSeparator = path.indexOf("\\");
    if (indexOfFileSeparator > 0)
    {
        var newPath = path.substr(0, indexOfFileSeparator);
        return System.Shell.itemFromPath(newPath);
    }
    else
    {
        return undefined; // no parent
    }
}

function getDriveLetter(path)
{
    return path.substr(0, 1);
}

/**
 * Navigates to the parent of the current folder.
 *
 * If the parent has already been visited, no new scan is performed;
 * if the parent has not yet been visited, a full scan is required.
 */
function parentNavigate()
{
    var parent = getParent(gadgetState.target.path);
    if (parent)
    {
        // If we have visited the parent already, we can just display results;
        // Otherwise, we have to do a full parse.
        if (gadgetState.visited[parent.path])
        {
            gadgetState.invocationCounter++;
            gadgetState.target = parent;
            gadgetState.timerId = setTimeout('finishUp()', 0);
        }
        else
        {
            kickOff(parent);
        }
    }
}

/**
 * Completes the process, rendering information and graphics.
 */ 
function finishUp()
{
    try
    {
        var parent = getParent(gadgetState.target.path);
        if (parent !== undefined)
        {
            setVisible("parentGoButton", true);
        }
        else
        {
            setVisible("parentGoButton", false);
        }

        showResultsScreen();
        setVisible(gadgetState.progressIndicatorId, false);
        setVisible(gadgetState.cancelButtonId, false);
        setEnabled(gadgetState.cancelButtonId, false);

        updateTargetResults(gadgetState.targetPieDivId);
        updateChildrenResults(gadgetState.childrenPieDivId);
        if (System.Gadget.Flyout.show)
        {
            // Flyout already showing, must update
            flyoutLoadedInternal();
        }
        else if (gadgetState.showFlyoutOnFinish === true)
        {
            // Flyout not yet showing, but has been requested;
            // Start the display.
            gadgetState.showFlyoutOnFinish = false;
            showAnalysisFlyout();
        }
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

    //if (DEBUG) debug("tallyStack.length=" + gadgetState.tallyStack.length);

    // If we aren't behind the times, see if there is work to be done.
    if (gadgetState.tallyStack.length === 0)
    {
        // No work to be done.  We are finished!
        finishUp();
        return false;
    }

    //if (DEBUG) debug("working...");

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
                //debug("resting for " + gadgetState.restIntervalMillis + "ms");
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
                    gadgetState.visited[entry.path].numImmediateChildren = 0;

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
                    gadgetState.visited[tallyState.target.path].numImmediateChildren++;
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
                gadgetState.visited[tallyState.target.path].numImmediateChildren++;
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

function highlightRefreshButton()
{
    var element = document.getElementById("refreshButton");
    if (element)
    {
        element.style.backgroundImage = 'url("refresh-light.png")';
    }
}

function darkenRefreshButton(childId)
{
    var element = document.getElementById("refreshButton");
    if (element)
    {
        element.style.backgroundImage = 'url("refresh-dark.png")';
    }
}

function highlightParentGoButton()
{
    var element = document.getElementById("parentGoButton");
    if (element)
    {
        element.style.backgroundImage = 'url("up-light.png")';
    }
}

function darkenParentGoButton()
{
    var element = document.getElementById("parentGoButton");
    if (element)
    {
        element.style.backgroundImage = 'url("up-dark.png")';
    }
}

function refresh()
{
    kickOff(gadgetState.target);
}