AJAX-Page-Loader
================


AJAX PAGE LOADER 0.4
By Brad Heath - brad.heath@gmail.com
	
Use this tool to convert internal links to AJAX page loads. The tool also attempts to pre-load internal pages into memory so they can be displayed without waiting for a server call. 
	
Requires jQuery, underscore.js and history.js
(Underscore is called internally - see below to change the URL)
	
WHAT'S NEW IN 0.4

This version allows cached data to be kept in sessionStorage in supported browsers, instead of inan arry. 
	
WHAT'S NEW IN 0.3
	
This version is updated to prevent the entire page from being rebuilt each time a new element is added. Now, the app only fetches the divMain content from the server and repopulates divMain on the page with the new content. Other content remains the same. (This could pose nav problems, to be solved later.) 
	
The new version also lets you add a DATA-NOAJAX attribute to links, which will prevent them from being transformed. This is useful for RSS and other content. 
	
Adding the script automatically creates the AJAX-load functionality. You can also add custom, page-specific controls:
	
AJAXPageLoader.setUnload(function)
		
Specify a function to execute before a user exits this page. This is called on statechange, before a new page is loaded (by AJAX or from the cache) into the DOM. This is useful for removing bindings	that may have been created on a particular page that should not survive to 	future pages (or that need to be removed in case the user comes back to this page, to prevent double-binding). 
		
WHAT HAPPENS WHEN THIS IS FIRED?		
* Create an AJAXPageLoader instance if one does not already exist
* Load underscore (required)
* Analyze the links on the page and replace them with AJAX calls (.transformLinks)
* Assign internal links to the preload queue (.transformLinks)
* Gather and cache data from internal links (.preloadLinks)
	
WHEN A CLICK HAPPENS
* It is diverted to handleClick, which prevents the default behavior
* Force a state change on the page 
* On state change, get the requested page, either from the local cache or the server (.getPage)
* Handle whatever transition is required (.fancyTransition)
* Change the title of the page
* Analyze and transform links on the new page (.transformLinks), which leads to the preload queue
		
