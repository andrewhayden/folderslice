# Introduction #

Folderslice presents a wealth of information with relatively few controls.  To start, simply drag a folder or a drive onto the gadget.  The gadget will analyze the contents of the folder you dragged, and will display a brief summary of the results.  You can hit the "Cancel" button at any time to abort processing.

| Drag a Folder or Drive to the Gadget | | Analysis Begins | | Analysis Complete |
|:-------------------------------------|:|:----------------|:|:------------------|
| ![http://folderslice.googlecode.com/svn/trunk/screenshots/instructions-drag.png](http://folderslice.googlecode.com/svn/trunk/screenshots/instructions-drag.png) | -> | ![http://folderslice.googlecode.com/svn/trunk/screenshots/instructions-analysis.png](http://folderslice.googlecode.com/svn/trunk/screenshots/instructions-analysis.png) | -> | ![http://folderslice.googlecode.com/svn/trunk/screenshots/instructions-analysis-complete.png](http://folderslice.googlecode.com/svn/trunk/screenshots/instructions-analysis-complete.png) |

By default, Folderslice displays only the 3 largest folders within the item you have dragged; if you want to see more information, just click on the "Details..." link (as shown above) to bring up a more verbose page (shown below).



# The Controls #
Controlling Folderslice really is simple; but as the saying goes, a picture is worth a thousand words.  To that end, the following picture shows all of the controls available in both the docked gadget (on the right, in the sidebar) as well as the flyout page (the large panel at left):

![http://folderslice.googlecode.com/svn/trunk/screenshots/controls.png](http://folderslice.googlecode.com/svn/trunk/screenshots/controls.png)



# Errors #
Of course, there may be problems that arise during the operation of FolderSlice.  For example, a known issue ([Issue #12](https://code.google.com/p/folderslice/issues/detail?id=#12)) is that the sidebar cannot handle certain types of folders when they are dragged onto it (this is a problem with the Microsoft Sidebar API, not with FolderSlice); in such cases, you will see an error panel fly out of the gadget window, like so:

![http://folderslice.googlecode.com/svn/trunk/screenshots/error-display.png](http://folderslice.googlecode.com/svn/trunk/screenshots/error-display.png)

If you see such a screen and think there might be a problem with FolderSlice (it is certainly possible), by all means please file it as an issue (just click on the Issue tab at the top of this page).



# Miscellaneous #
  * Clicking anywhere outside of the flyout window or gadget will cause the flyout window to hide.  You can show it again by clicking on the "Details..." link as you did before.
  * If you bring up the details pane for a folder that contains _many_ child folders, it may take several seconds to display the flyout, during which the application may be unresponsive.
  * You can drag another folder or drive onto the gadget at any time.  Doing so will discard the current results and begin analysis on the dragged item.
  * Please note that hidden and system files, as well as files and folders in your Recycle Bin, are not currently processed.  Due to a bug in the Windows Sidebar API implementation these files still count towards the total space used on your drive for the purposes of the gadget's display.  If you see, for example, that Drive C: only takes up 80% of itself, this indicates that 20% of Drive C: is actually contained in hidden/system files and/or the Recycle Bin.