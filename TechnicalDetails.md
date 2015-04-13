# Introduction #

This page contains information about the technical workings of the gadget.  It is intended for those who are curious about performance, technology, and so on.  Most users do not need to read this information, but you are welcome to do so (and if you are having an issue, it is possible this information may be of some help).

# Non-Recursive, Gentle File System Traversal #
The gadget is very careful not to peg your CPU or slam your hard drive while it is examining things.  Basically, it creates a stack where it pushes and pops processing states, and examines files in small batches at a time (by default, 100 files) with a rest period in-between batches (by default, 25 milliseconds).  The end result is that, in general, the gadget _should_ behave very well on most Vista computers.  It is this technique that is responsible for the animation of the "processing" graphic being able to actually occur; if the gadget simply tried to delve through your files as fast as possible, you would not see any graphical change until it completed.

A future release _may_ include configuration options to adjust the aggressiveness of this algorithm if such a feature is requested; you would then be able to adjust the batch size and rest interval manually.  However, the defaults should be sufficient for the vast majority of users.

# Full Tree Traversal #
When you drag a drive or a folder into Folderslice, it traverses the _entire_ structure within that drive/folder, including all child folders.  Instead of storing information about each individual file, it keeps track of all information on a per-folder basis, using the path to the folder as a unique identifier.  Each folder keeps track of how many files it has as top-level children, how many files it has total (including all those in child folders), and the total size of all files (again, including those in child folders).

It may seem that the full-tree traversal has a high memory cost, but this is mitigated by the fact that there are generally on the order of a thousand times more files than folders on a given system.  For example, on a system with ten million files, you could reasonably expect there to be somewhere around a mere ten _thousand_ folders.  You can make some reasonable estimates of memory usage from this - assuming that the average path length is somewhere around 250 characters on such a system (a pretty high estimate), it would take a mere 2.5 megabytes to store all the paths.  The author has never seen a system with ten million files, although certainly such things exist...

The full-tree traversal allows us to do some fantastic things, such as...

# Zero-Cost Navigation Within Child Folders #
Since the entire tree of the dragged item is traversed and processed up-front, _all information about **all** child folders_ is available for immediate use.  You can step into and out of any and all child folders at no additional processing cost (of course, the display of the information within those folders, such as the pie charts, requires additional time - but this is unrelated to processing the file system).

This is really the key to having the plugin be of any use at all - you can quickly find the space hog within a given folder by repeatedly navigating to the topmost entry in the list of child folders, generally within a few seconds at most.

# DHTML, VML, .NET - Oh My! #
Generally, the author holds that all web applications should be written to adhere to the [HTML 4.01 Strict DTD](http://www.w3.org/TR/html401/) and should comply with [Cascading Style Sheets, Level 2](http://www.w3.org/TR/REC-CSS2/).  However, since this particular application can _only_ run in the context of the Windows Vista sidebar, meaning it can _only_ run in a specific configuration Internet Explorer 7, not everything in the gadget is 100% compliant with the afore-mentioned specifications.  In particular, IE-specific style properties are used to extract and manipulate information on the page, and [Vector Markup Language (VML)](http://www.w3.org/TR/NOTE-VML.html) is used extensively to generate the graphics on-the-fly.

Last but definitely not least, the gadget uses the .NET APIs exposed via the sidebar Javascript bindings extensively.  This is the means by which all the non-trivial functionality is achieved (i.e., examining the file system and launching Windows Explorer).  So, basically, if you're thinking about running this outside of the sidebar in Vista - it's probably not going to happen any time soon.  Sorry.