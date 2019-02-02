var icwsDirectUsageExample = (function (applicationExports) {
    'use strict';
    
    //
    // Introduction page implementation
    // 
    // Provides an overview of the application.
    //
    applicationExports.introPage = (function (exports) {
        // Element IDs of special pages needed for basic application behavior.    
        var INTRO_PAGE_ID = 'intro-page';
        
        // Element IDs used in this file.
        var INTRO_CONTINUE_ELEMENT_ID = 'intro-continue';
        var INTRO_UNSUPPORTED_BROWSER_ELEMENT_ID = 'intro-unsupported-browser';
    
        /**
         * Initializes html event handlers and initial page for the application.
         */
        function initialize() {
            var utilities = icwsDirectUsageExample.utilities;
            var applicationModel = icwsDirectUsageExample.applicationModel;
            
            var continueElement = document.getElementById(INTRO_CONTINUE_ELEMENT_ID);
            var unsupportedBrowserElement = document.getElementById(INTRO_UNSUPPORTED_BROWSER_ELEMENT_ID);
            
            // Hook up event handlers.
            utilities.bindEvent(continueElement, 'click', continueApplication);
            
            // Due to limitations with CORS support, some browsers do not support this example application
            // unless a web proxy is utilized.  To support 'out of the box' usage of the example application
            // display a message about the issue when an unsupported browser is being used.
            if (!isUsingUnsupportedBrowser()) {
                utilities.removeClass(continueElement, applicationModel.CSS_CLASS_HIDDEN);
                utilities.addClass(unsupportedBrowserElement, applicationModel.CSS_CLASS_HIDDEN);
            } else {
                utilities.addClass(continueElement, applicationModel.CSS_CLASS_HIDDEN);
                utilities.removeClass(unsupportedBrowserElement, applicationModel.CSS_CLASS_HIDDEN);
            }
            
            // Show the intro page by default.
            applicationModel.showApplicationPage(INTRO_PAGE_ID);
        }
        
        /**
         * Determines whether the browser is unsupported.
         * @returns {Boolean} true if the browser is unsupported, otherwise false.
         */
        function isUsingUnsupportedBrowser() {
            var version;
            
            // Determines whether the browser is IE7 or previous.
            // IE7 (and previous) is not supported for this example application by default due to CORS concerns.
            // Although a proxy server could be used to circumvent that concern, the example application is
            // intended to be used without special proxy server configuration.
            if (/MSIE (\d+\.\d+);/.test(navigator.userAgent)) {
                version = parseInt(RegExp.$1, 10);
                return (version <= 7);
            }
            
            return false;
        }
        
        /**
         * Continues the application, switching to the connect page.
         */
        function continueApplication() {
            var applicationModel = icwsDirectUsageExample.applicationModel;
            var connectPage = icwsDirectUsageExample.connectPage;
            
            // Switch to the connect application page.
            applicationModel.showApplicationPage(connectPage.CONNECT_PAGE_ID);
        }
        
        // Register an additional small application page, for programmatic use only with unsupported browsers.
        applicationExports.applicationModel.registerApplicationPage({
            // The HTML element ID of the page, which is also used as the page ID.
            pageId: INTRO_PAGE_ID,
        
            // This page should not be published to the application page selection list.
            shouldBePublished: false,
            
            // Performs one time page initialization.
            initialize: initialize
        });
        
        return exports;
    } (applicationExports.introPage || {}));

    return applicationExports;
} (icwsDirectUsageExample || {}));