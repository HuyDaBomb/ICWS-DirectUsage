var icwsDirectUsageExample = (function (applicationExports) {
    'use strict';

    //
    // Application model implementation
    // 
    // This implements a very basic 'application model' of pages and controls that can receive
    // application-level events such as initialize, show, hide, connect (to ICWS), and disconnect.
    // 
    // This allows the example application to have structure without relying on a particular
    // rich framework model.  This module is not intended to be a reusable framework of its own.
    //
    applicationExports.applicationModel = (function (exports) {
        /**
         * Invokes the 'initialize' function on each registered page.
         */
        function initializeApplication() {
            invokePageFunction(APPLICATION_METHOD_INITIALIZE);
        }
        
        // Add a page load event handler so that the application's initialization can occur.
        icwsDirectUsageExample.utilities.bindEvent(window, 'load', initializeApplication);
        
        // Define a constant for the CSS class used to hide application elements.
        exports.CSS_CLASS_HIDDEN = 'hidden';
        
        // Cache of the registered application pages.
        var applicationPages = {};
        // The currently displayed application page.
        var currentApplicationPageId;
        // Cache of the registered application controls.
        var applicationControls = {};
        
        // Constants for the properties/methods of the application view/control objects.
        var APPLICATION_METHOD_INITIALIZE = 'initialize';
        var APPLICATION_METHOD_SHOW = 'show';
        var APPLICATION_METHOD_HIDE = 'hide';
        var APPLICATION_METHOD_CONNECT = 'connect';
        var APPLICATION_METHOD_DISCONNECT = 'disconnect';
        var APPLICATION_PROPERTY_ELEMENT_ID = 'elementId';
        var APPLICATION_PROPERTY_SHOULD_BE_PUBLISHED = 'shouldBePublished';
        
        /**
         * Registers an application page.
         * @param {Object} applicationPage The application page.
         * @param {String} applicationPage.pageId The ID of the page.
         * @param {String} [applicationPage.elementId=pageId] The HTML element ID of the page.
         * @param {Boolean} [applicationPage.shouldBePublished=true] Specifies whether this page should be published.
         * @param {String} [applicationPage.pageLabel] Specifies the label to display for the page, if it should be published.
         * @param {Object} [applicationPage.initialize] Called for initialization of the page.
         * @param {Object} [applicationPage.show] Called when the page is shown.
         * @param {Object} [applicationPage.hide] Called when the page is hidden.
         * @param {Object} [applicationPage.connect] Called when the ICWS connection is established.
         * @param {Object} [applicationPage.disconnect] Called when the ICWS connection is ended.
         * @throws {Error} Multiple application pages have the same page ID.
         */
        exports.registerApplicationPage = function(applicationPage) {
            var pageId = applicationPage.pageId;
            
            if (!applicationPages[pageId]) {
                // For convenience, default the elementId to be the pageId.
                if (!applicationPage.hasOwnProperty(APPLICATION_PROPERTY_ELEMENT_ID)) {
                    applicationPage.elementId = applicationPage.pageId;
                }
                
                applicationPages[pageId] = applicationPage;
            } else {
                throw new Error('Multiple application pages with page ID: ' + pageId);
            }
        };
        
        /**
         * Registers an application control.
         * @param {Object} applicationControl The application control.
         * @param {String} applicationControl.controlId The ID of the control.
         * @param {Object} [applicationControl.initialize Called for initialization of the control.
         * @param {Object} [applicationControl.connect Called when the ICWS connection is established.
         * @param {Object} [applicationControl.disconnect Called when the ICWS connection is ended.
         * @throws {Error} Multiple application controls have the same control ID.
         */
        exports.registerApplicationControl = function(applicationControl) {
            var controlId = applicationControl.controlId;
            
            if (!applicationControls[controlId]) {
                applicationControls[controlId] = applicationControl;
            } else {
                throw new Error('Multiple application controls with control ID: ' + controlId);
            }
        };
        
        /**
         * Registers an application control.
         * @returns {Array<Object>} The array of published application pages, where each item has 'pageId' and optional 'pageLabel'.
         */
        exports.publishedPages = function() {
            var publishedPages, pageId, applicationPage;

            publishedPages = [];
            
            for (pageId in applicationPages) {
                if (applicationPages.hasOwnProperty(pageId)) {
                    applicationPage = applicationPages[pageId];
                    
                    if (shouldPageBePublished(applicationPage)) {
                        publishedPages.push({
                            pageId: applicationPage.pageId,
                            pageLabel: applicationPage.pageLabel
                        });
                    }
                }
            }
            
            return publishedPages;
        };
        
        /**
         * Determines whether the specified application page should be published.
         * @param {Object} applicationPage The application page.
         * @returns {Boolean} true if the page should be published.
         */
        function shouldPageBePublished(applicationPage) {
            return !applicationPage.hasOwnProperty(APPLICATION_PROPERTY_SHOULD_BE_PUBLISHED) || applicationPage.shouldBePublished;
        }
        
        /**
         * Invokes the 'connect' function on each registered page.
         */
        exports.connect = function() {
            var publishedPages, pageIdToSelect, publishedPageId, applicationPage;
            
            invokePageFunction(APPLICATION_METHOD_CONNECT);
            
            // When the application connects, change to a published page.
            publishedPages = exports.publishedPages();
            if (publishedPages.length > 0) {
                // Select the first published page.
                pageIdToSelect = publishedPages[0].pageId;
                
                // Unless there is a persisted published page ID that is available.
                publishedPageId = retrieveCurrentPublishedPageId();
                if (applicationPages.hasOwnProperty(publishedPageId)) {
                    applicationPage = applicationPages[publishedPageId];
                    if (shouldPageBePublished(applicationPage)) {
                        pageIdToSelect = publishedPageId;
                    }
                }
                
                // Show the selected page.
                exports.showApplicationPage(pageIdToSelect);
            }
        };
        
        /**
         * Invokes the 'disconnect' function on each registered page.
         */
        exports.disconnect = function() {
            invokePageFunction(APPLICATION_METHOD_DISCONNECT);
        };
        
        /**
         * Invokes the specified function on each registered page / control.
         * @param {String} functionName The page function to invoke.
         */
        function invokePageFunction(functionName) {
            var pageId, applicationPage, controlId, applicationControl;
            
            for (pageId in applicationPages) {
                if (applicationPages.hasOwnProperty(pageId)) {
                    applicationPage = applicationPages[pageId];
                    invokeMethodOnApplicationComponent(applicationPage, functionName);
                }
            }

            for (controlId in applicationControls) {
                if (applicationControls.hasOwnProperty(controlId)) {
                    applicationControl = applicationControls[controlId];
                    invokeMethodOnApplicationComponent(applicationControl, functionName);
                }
            }
        }
        
        /**
         * Invokes the specified function on the specified page/control.
         * @param {Object} applicationComponent The page/control.
         * @param {String} functionName The page function to invoke.
         */
        function invokeMethodOnApplicationComponent(applicationComponent, functionName) {
            if (applicationComponent.hasOwnProperty(functionName)) {
                applicationComponent[functionName]();
            }
        }
        
        /**
         * Verifies that the specified application page exists, throwing otherwise.
         * @param {String} pageId The ID of the page.
         * @throws {Error} The specified page ID wasn't found.
         */
        function verifyApplicationPageId(pageId) {
            if (!applicationPages.hasOwnProperty(pageId)) {
                throw new Error('Unknown application page ID: ' + pageId);
            }
        }
        
        /**
         * Performs various initialization for the application.  Should be called on page load.
         * @param {String} pageIdToShow The ID of the page to show.
         * @throws {Error} The specified page ID wasn't found.
         */
        exports.showApplicationPage = function(pageIdToShow) {
            var utilities = icwsDirectUsageExample.utilities;
            var pageId, applicationPage, applicationPageElement;
            
            if (currentApplicationPageId === pageIdToShow) {
                return;
            }
            
            // Ensure that the requested page has been registered.
            verifyApplicationPageId(pageIdToShow);
            
            // Go through all the pages, showing the specified page and hiding the others.
            for (pageId in applicationPages) {
                if (applicationPages.hasOwnProperty(pageId)) {
                    applicationPage = applicationPages[pageId];
                    applicationPageElement = document.getElementById(applicationPage.pageId);
                    if (pageId !== pageIdToShow) {
                        // Hide the page.
                        utilities.addClass(applicationPageElement, exports.CSS_CLASS_HIDDEN);
                        
                        // If the page wasn't already hidden, raise the page event.
                        if (pageId === currentApplicationPageId) {
                            invokeMethodOnApplicationComponent(applicationPage, APPLICATION_METHOD_HIDE);
                        }
                    } else {
                        utilities.removeClass(applicationPageElement, exports.CSS_CLASS_HIDDEN);

                        if (pageId !== currentApplicationPageId) {
                            // Raise the page event for the newly shown page.
                            invokeMethodOnApplicationComponent(applicationPage, APPLICATION_METHOD_SHOW);
                            
                            // As a convenience for the user, persist the currently active page for the
                            // next time the application is started.
                            if (shouldPageBePublished(applicationPage)) {
                                storeCurrentPublishedPageId(pageIdToShow);
                            }
                        }
                    }
                }
            }
            
            currentApplicationPageId = pageIdToShow;
            
            // To support the application level interface, provide an event when
            // the currently displayed page changes.
            reportCurrentPage(currentApplicationPageId);
        };
        
        //
        // Support for registering a callback to receive an event when the current page changes.
        // 
        // For this example application, the event is used by the toolbarcontrol to update the
        // page droplist in the application header to have the current page selected.
        //
        
        /**
         * The callback for receiving current page changes {@link registerCurrentPageCallback}.
         * @callback applicationModelCurrentPageCallback
         * @param {String} pageId The current page.
         * @see icwsDirectUsageExample.applicationModel.registerCurrentPageCallback
         */
     
        // Callback for processing current page changes.
        // Type: applicationModelCurrentPageCallback
        var applicationModelCurrentPageCallback = null;
        
        /**
         * Sets a callback to be invoked for current page changes.
         * @param {applicationModelCurrentPageCallback} currentPageCallback The callback to invoke with current page information.
         * @throws {Error} The currentPageCallback was undefined.
         * @throws {Error} A callback is already registered for the specified messageType.
         * @see icwsDirectUsageExample.applicationModel.reportCurrentPage
         */
        exports.registerCurrentPageCallback = function(currentPageCallback) {
            if (currentPageCallback === undefined) {
                throw new Error('Invalid argument "currentPageCallback".');
            }
            
            if (!applicationModelCurrentPageCallback) {
                applicationModelCurrentPageCallback = currentPageCallback;
            } else {
                throw new Error('Current page callback already registered.');
            }
        };
        
        /**
         * Reports the current page.
         * @param {String} pageId The current page.
         * @see icwsDirectUsageExample.applicationModel.registerCurrentPageCallback
         */
        function reportCurrentPage(pageId) {
            if (!!applicationModelCurrentPageCallback) {
                applicationModelCurrentPageCallback(pageId);
            }
        }
        
        //
        // Support for persisting the current published page ID.
        //
        
        var STORAGE_SETTING_PUBLISHED_PAGE_ID = 'ININ-ICWS-DIRECT-USAGE-EXAMPLE-APPLICATIONMODEL-PUBLISHEDPAGEID';
        
        /**
         * Stores connection form values for later use.
         * @param {String} publishedPageId The published page ID.
         */
        function storeCurrentPublishedPageId(publishedPageId) {
            if (!!localStorage) {
                localStorage[STORAGE_SETTING_PUBLISHED_PAGE_ID] = publishedPageId;
            }
        }

        /**
         * Retrieves the previously selected published page ID, if one was stored.
         * @returns {String} The previously selected published page ID.
         */
         function retrieveCurrentPublishedPageId() {
            var publishedPageId;
            
            if (!!localStorage) {
                publishedPageId = localStorage[STORAGE_SETTING_PUBLISHED_PAGE_ID];
            }
            
            return publishedPageId;
        }
        
        return exports;
    } (applicationExports.applicationModel || {}));

    return applicationExports;
} (icwsDirectUsageExample || {}));