### 0.9.6 ###
_09 April 2008_
  * Fixed serious bug in 0.9.5 that could cause the gadget to crash whenever analysis was started. ([Issue #16](https://code.google.com/p/folderslice/issues/detail?id=#16))
  * FolderSlice now has options!
  * Compact Mode is now optional.
  * The user will now be notified whenever FolderSlice changes modes, in order to head off confusion about gadgets moving around as a result of the resizing.  This notification can be disabled via the usual "Don't show me this again" checkbox or in the options page.
  * Probably the last pre-1.0 release, barring bugs.

### 0.9.5 ###
_06 April 2008_
  * Gadget now notifies the user when it is moved to another pane because of resizing itself. ([Issue #14](https://code.google.com/p/folderslice/issues/detail?id=#14))
  * Now properly handles folders with single quote characters in their paths. ([Issue #15](https://code.google.com/p/folderslice/issues/detail?id=#15))
  * New icon, taken from actual use (original icon was created before the gadget functioned).  Behold the awesome icon!

### 0.9.4 ###
_12 December 2007_
  * Improved response time, particularly when the application encounters large blocks of slow-to-access files.  The new algorithm is based on time instead of fixed-size file-batching operations. ([Issue #8](https://code.google.com/p/folderslice/issues/detail?id=#8))
  * Implemented workaround for serious bug (caused by underlying bugs in Microsoft API) that caused files >= 2GB to have incorrect (sometimes negative) file sizes! ([Issue #7](https://code.google.com/p/folderslice/issues/detail?id=#7))
  * Debugging pane now always sits below everything else and is tucked out-of-the-way (if debug mode is enabled).
  * Added note to details page that gadget does not include hidden and/or system files.  ([Issue #9](https://code.google.com/p/folderslice/issues/detail?id=#9), still outstanding)
  * Corrected buildfile problem where the buildfile couldn't create a release unless the gadget had already been deployed at least once. ([Issue #6](https://code.google.com/p/folderslice/issues/detail?id=#6))
  * Corrected serious problem where folders whose names ended in ".zip" (or any other common archive extension) could cause the gadget to hang in the "processing" state forever.  ([Issue #10](https://code.google.com/p/folderslice/issues/detail?id=#10))
  * Gadget is now much more graceful in the face of errors and will attempt to display the cause and any useful information in a new flyout. ([Issue #11](https://code.google.com/p/folderslice/issues/detail?id=#11))
  * Thanks to Greg S. for his help in testing this release with large files and folders, and archive-name folders.

### 0.9.3 ###
_18 November 2007_
  * Second public release
  * Gadget starts up in a much more compact mode
  * Can now discard results, which will return to compact mode, using the Dismiss button on the results screen
  * Creation of details page is now done on-the-fly instead of all-or-nothing.  This means that the application is much, much, much more responsive when browsing through folders that contain many child folders.  A progress indicator is displayed while this is happening.
  * Greatly improved the logic for displaying the pie chart and color swatches.  The gadget no longer draws pie slices that would be too small to be useful.
  * Entries not appearing on the pie chart will also not receive a color swatch, and will all be lumped together in the details list after a descriptive line noting that the remaining items are very small
  * Fixed weird page-overflow bug in main window that would allow users to drag items along the bottom edge of the window, causing the window to scroll (yay for overflow: hidden)
  * Cleaned up debug code a bit and made it rock solid; any accidentally-enabled debugging code will no longer attempt to print to a non-existent DIV element
  * No remaining calls to debug are unqualified (that is, they all check for the debug flag before bothering to call the printing method)
  * Minor miscellaneous performance enhancements (insignificant speedup, but the code is a tiny bit cleaner as a result)

### 0.9.1 ###
_18 June 2007_
  * First public release



### 0.9.0 ###
_14 June 2007_
  * Non-public release
  * Unstable