/*

	AJAX PAGE LOADER 0.4
	By Brad Heath - brad.heath@gmail.com
	
	Use this tool to convert internal links to AJAX page loads. The 
	tool also attempts to pre-load internal pages into memory so they 
	can be displayed without waiting for a server call. 
	
	Requires jQuery, underscore.js and history.js
	(Underscore is called internally - see below to change the URL)
	
	WHAT'S NEW IN 0.4

	This version allows cached data to be kept in sessionStorage in supported browsers, instead of in
	an arry. 
	
	WHAT'S NEW IN 0.3
	
	This version is updated to prevent the entire page from being rebuilt each time a new element is added.
	Now, the app only fetches the divMain content from the server and repopulates divMain on the page with
	the new content. Other content remains the same. (This could pose nav problems, to be solved later.) 
	
	The new version also lets you add a DATA-NOAJAX attribute to links, which will prevent them from being
	transformed. This is useful for RSS and other content. 
	
	Adding the script automatically creates the AJAX-load functionality. You can
	also add custom, page-specific controls:
	
		AJAXPageLoader.setUnload(function)
		
			Specify a function to execute before a user exits this page. 
			This is called on statechange, before a new page is loaded (by AJAX
			or from the cache) into the DOM. This is useful for removing bindings
			that may have been created on a particular page that should not survive to 
			future pages (or that need to be removed in case the user comes back
			to this page, to prevent double-binding). 
		
		MORE COMING SOON
		
		AJAXPageLoader.revert()				- Revert to non-AJAX links for this page only
		
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
		
*/
			
(function($, window, document) {
	
	History = window.History;
	
	if(!History.enabled) {
		return false; }
	
	// CREATE NEW LOADER OBJECT IF NONE EXISTS
	if(typeof(AJAXPaeLoader) === 'undefined') {
		
		AJAXPageLoader = new Object();
		AJAXPageLoader.underscoreJS = '/_js/underscore.js';
		AJAXPageLoader.suffix = '?t=1';							// A suffix that prompts server to return partial pages
		AJAXPageLoader.container = '#divBody';				// The body element whose content will be updated
		AJAXPageLoader.domain = document.domain;
		AJAXPageLoader.localLinks = new Array();	
		AJAXPageLoader.cacheHTML = new Array();
		AJAXPageLoader.unloadFunction = function() {};
		AJAXPageLoader.useSessionStorage = false;
		AJAXPageLoader.transitioning = false;
		AJAXPageLoader.debug = false;

		if(typeof(sessionStorage) != 'undefined') {
			AJAXPageLoader.useSessionStorage = true;
		}

		cl = function(msg) {
			if (AJAXPageLoader.debug) { 
				console.log(msg);
			}
		}
		
		cl('Launching new AJAXPageLoader object');
		
		// BIND THE WINDOW STATECHANGE OBJECT
		// THIS IS WHAT YOU DO WHEN THE PAGE STATE CHANGES
		$(window).bind('statechange',function() {
			var state = History.getState();
			var url = state.url;
			AJAXPageLoader.unloadFunction();
			AJAXPageLoader.getPage(url);
		});
		
		AJAXPageLoader.setUnload = function(e) {
			if(typeof(e) === 'function') {
				AJAXPageLoader.unloadFunction = e;
			}
		};
		
		AJAXPageLoader.fancyTransition = function(newdata) {
			// Simplest form:
			// $(AJAXPageLoader.container).html(newdata);

			if($(window).width() >= 800) {
				// do something slick on wide screens
				AJAXPageLoader.transitioning = true;
				var d = document.createElement('div');
				d.style.position = 'absolute';
				d.style.top = 10;
				d.style.left = 10;
				d.style.height = 100;
				d.style.width = 600;
				position = $('#divBody').position();
				pl = position.left + $('#divBody').outerWidth();
				w = $('#divBody').width();
				html = '<div id="divBodyNew" style="position:absolute; top:' + position.top + 'px; left:' + pl + 'px; display:block; background:"></div>';
				$('body').append(html);
				$('#divBodyNew').addClass('divBody');
				$('#divBodyNew').css('z-index', 1100);
				$('#divBodyNew').html(newdata);
				$('#divBodyNew').animate({left: 0}, 300, function() {
					$('#divBody').remove();
					$('#divBodyNew').css('z-index', 1000);
					$('#divBodyNew').attr('id','divBody');
					AJAXPageLoader.transitioning = false;
					AJAXPageLoader.transformLinks();
				});	
			} else {
				$(AJAXPageLoader.container).html(newdata);
				AJAXPageLoader.transitioning = false;
				AJAXPageLoader.transformLinks();
			}
		}
		
		
		AJAXPageLoader.loadPage = function(url) {
			History.pushState(null,'',url);
		}
		
		// RETRIEVE ANOTHER PAGE FROM THE SITE
		AJAXPageLoader.getPage = function(strUrl) {
			if (!AJAXPageLoader.transitioning) {
				$(document).scrollTop(0);
				strUrlMod = strUrl + AJAXPageLoader.suffix;
				var localStored = false;
				// Check whether the target is already in sessionStorage
				if(AJAXPageLoader.useSessionStorage) {
					if(sessionStorage.getItem(strUrlMod)) {
						localStored = true;
					}
				} 
				if (localStored) {
					// If it's in sessionStorage
					cl('Loading local storage page page - ' + strUrl);
					var data = sessionStorage.getItem(strUrlMod);
					AJAXPageLoader.setPageTitle(data);
					AJAXPageLoader.fancyTransition(data);
				} else if(_.find(AJAXPageLoader.cacheHTML, function(e) { 
						if(strUrlMod == e.url) { return true; } else { return false; }
					})) {
					// If it's in the memory cache
					var p = _.filter(AJAXPageLoader.cacheHTML, function(e) {
						if(strUrlMod == e.url) { return true; } else { return false; }
					});
					// DO THIS IF THE REQUESTED PAGE IS ALREADY IN MEMORY
					cl('Loading cached page - ' + strUrl);
					AJAXPageLoader.setPageTitle(p[0].html);
					AJAXPageLoader.fancyTransition(p[0].html);
				} else {
					cl('Loading non-cached page - ' + strUrl);
					var html = '<div id="divLoading" style="opacity:0.6; border-style:solid; border-width:1px; border-color:gray; position:absolute; height:auto; padding:5px 5px 5px 10px; width:300px; background:#333; color:white; font-family:arial; font-size:10px; font-weight: bold; top:0; left:0; z-index:999999">Loading ...</div>';
					$(AJAXPageLoader.container).append(html);
					$.ajax({
						url: strUrlMod,
						success: function(data) {
								AJAXPageLoader.setPageTitle(data);
								AJAXPageLoader.fancyTransition(data);
						}
					});
				}
			}
		}

		AJAXPageLoader.setPageTitle = function(h) {
			if(h.match(/<title>(.*?)<\/title>/i)) { 
				document.title = RegExp.$1;
			} else if ( h.match(/<meta.*?pgtitle=\"(.*?)\"/i)) {
				document.title = RegExp.$1;
			}
		}
		
		// TRANSFORM INTERNAL DOMAIN LINKS TO JAVASCRIPT REFS 
		AJAXPageLoader.transformLinks = function() {
			$('a').each(function() {
				var rPattern = new RegExp(AJAXPageLoader.domain,'ig');
				var thref = this.href
				cl('# ANALYZING HREF ' + thref);
				if(this.href.match(rPattern)) {
					if(!_.find(AJAXPageLoader.localLinks, function(e) {
						if (e == thref + AJAXPageLoader.suffix) { return true; } else { return false; }
					})) {
						if($(this).attr('data-noajax') != 'true' ) {
							cl('     add url to queue - ' + this.href + AJAXPageLoader.suffix);
							AJAXPageLoader.localLinks.push(this.href + AJAXPageLoader.suffix);
						}
					}
					if($(this).attr('data-noajax') != 'true') {
						$(this).unbind('click',AJAXPageLoader.handleClick).bind('click', AJAXPageLoader.handleClick);
					} else { 
					}
				}
			});
			AJAXPageLoader.preloadLinks();
		}
		
		AJAXPageLoader.handleClick = function(event) {
			event.preventDefault();
			History.pushState(null,this.innerHTML,this.href);
		};
		
		// PRE-LOAD PAGE DATA TO INTERNAL ARRAY FOR FASTER PROCESSING
		AJAXPageLoader.preloadLinks = function() {
			for (l in AJAXPageLoader.localLinks) {
				var strUrl = AJAXPageLoader.localLinks[l];
				if(AJAXPageLoader.useSessionStorage) {
					// Cache to local storage if possible
					if (!sessionStorage.getItem(strUrl)) {
						$.get(strUrl, function(data,x,y) {
							cl(' # preloading to sessionStorage ' + this.url);
							sessionStorage.setItem(this.url, data);
						});
					}
				} else {
					// If local storage is unavailable, cache to an array
					if(!_.find(AJAXPageLoader.cacheHTML, function(e) {
							if(e.url == strUrl) { return true; } else { return false; }
						})) {
							$.get(strUrl, function(data,x,y) {
								cl(' # preloading ' + this.url);
								AJAXPageLoader.cacheHTML.push({ url: this.url, html: data});
							});
						}
				}
			}
		}

		$(function() {
			$.getScript(AJAXPageLoader.underscoreJS, function() {
				AJAXPageLoader.transformLinks();
			});
		});
		
	} else { 
		AJAXPageLoader.transformLinks();
	}
	
})(jQuery, window, document);