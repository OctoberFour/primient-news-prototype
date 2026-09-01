var CMS = {};

new CMSFrontendFramework(function(HELPERS) {

	jQuery.extend(CMS, HELPERS); 

	// Load debugger script
	head.js({ debug: CMS.assets.central + '/js/debug.js' }, function() { 

		// Only start debugger if it's enabled in developer settings
		if(CMS.developer.debug) debug.start(); 
		
		debug.log("<mark>Global Settings Loaded</mark>");

		// Load frontend scripts once globals are set.
		head.js({ frontend: CMS.assets.local + "/js/frontend.js"}, function() {
		
			CMS.externalLinks();
		
			if(CMS.page.draft) {
				$("body").prepend('<div style="position: fixed;top: 5px;left: 5px;background: rgba(255,0,0,0.3);padding: 8px 16px;font-style: italic;color: #fff;text-shadow: 1px 1px 1px rgba(0,0,0,0.2);z-index: 9999999;">Draft</div>');
			}
		
			debug.log("<mark>Frontend Loaded</mark>");
			
			debug.log(CMS.page);

		});
	
	});

});
