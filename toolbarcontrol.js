var icwsDirectUsageExample = (function (applicationExports) {
    'use strict';
    
    //
    // Application toolbar implementation
    // 
    // Provides a simple application toolbar for the example, with support for example page selection and 
    // logging out of an active ICWS session.
    //
    applicationExports.applicationToolbar = (function (exports) {
        // Element IDs used in this file.
        var PAGE_SELECTION_AREA_ELEMENT_ID = 'application-toolbar-page-selection-area';
        var PAGE_SELECTION_ELEMENT_ID = 'application-toolbar-page-selection';
        var CONNECT_AREA_ELEMENT_ID = 'application-toolbar-connect';
        var TOOLBAR_USER_ELEMENT_ID = 'toolbar-user';
        var TOOLBAR_LOGOUT_ELEMENT_ID = 'toolbar-logout';
        
        /**
         * Initializion operations for this control.
         */
        function initialize() {
            var utilities = icwsDirectUsageExample.utilities;
            var applicationModel = applicationExports.applicationModel;
            var connectPage = icwsDirectUsageExample.connectPage;
            
            // Hook up event handlers.
            utilities.bindEvent(document.getElementById(PAGE_SELECTION_ELEMENT_ID), 'change', changeSelectedPage);
            utilities.bindEvent(document.getElementById(TOOLBAR_LOGOUT_ELEMENT_ID), 'click', connectPage.disconnect);
            
            // Register to receive notifications from the application model when the current page changes.
            // This allows the application header page selection control to be updated.
            applicationModel.registerCurrentPageCallback(selectPublishedPage);
            
            // Initialize toolbar control display.
            addPublishedPages();
            updateApplicationToolbar();
        }

        /**
         * Adds all published pages to the page selection control.
         */
        function addPublishedPages() {
            var utilities = icwsDirectUsageExample.utilities;
            var applicationModel = icwsDirectUsageExample.applicationModel;
            var pageSelectionAreaElement, pageSelectionElement, publishedPages, i, j, publishedPage, pageLabel, optionElement;
            
            // For now, hide the page selection control's area (including separators).
            // updateApplicationToolbar will take care of showing/hiding it appropriately.
            pageSelectionAreaElement = document.getElementById(PAGE_SELECTION_AREA_ELEMENT_ID);
            utilities.addClass(pageSelectionAreaElement, applicationModel.CSS_CLASS_HIDDEN);
            
            pageSelectionElement = document.getElementById(PAGE_SELECTION_ELEMENT_ID);
            
            // Get the registered published pages from the application model.
            publishedPages = applicationModel.publishedPages();
            for (i=0, j=publishedPages.length; i<j; i++) {
                publishedPage = publishedPages[i];
                
                // Use the application page's label if available, or default to its page ID.
                if (publishedPage.pageLabel) {
                    pageLabel = publishedPage.pageLabel;
                } else {
                    pageLabel = publishedPage.pageId;
                }
                
                // Create an application page selection control option for this page.
                optionElement = document.createElement('option');
                optionElement.text = pageLabel;
                optionElement.value = publishedPage.pageId;
                pageSelectionElement.add(optionElement);
            }
        }
        
        /**
         * Selects the specified page in the published page selection control.
         */
        function selectPublishedPage(pageId) {
            var pageSelectionElement = document.getElementById(PAGE_SELECTION_ELEMENT_ID);
            var i, j;
            
            // Find the specified page in the page selection control options and select it.
            for(i = 0, j = pageSelectionElement.options.length; i < j; i++) {
                if (pageSelectionElement.options[i].value === pageId) {
                    pageSelectionElement.selectedIndex = i;
                    return;
                }
            }
            
            // The page wasn't found, so clear the selection.
            pageSelectionElement.selectedIndex = -1;
        }
        
        /**
         * Implements current page selection change.
         */
        function changeSelectedPage() {
            var applicationModel = icwsDirectUsageExample.applicationModel;
            var pageSelectionElement, pageId;
            
            // Retrieve the selection from the page selection control and have the
            // application model select that page.
            pageSelectionElement = document.getElementById(PAGE_SELECTION_ELEMENT_ID);
            pageId = pageSelectionElement.options[pageSelectionElement.selectedIndex].value;
            applicationModel.showApplicationPage(pageId);
        }
        
        /**
         * Updates the application toolbar display, reflecting current session state.
         */
        function updateApplicationToolbar() {
            var utilities = icwsDirectUsageExample.utilities;
            var session = icwsDirectUsageExample.session;
            var applicationModel = icwsDirectUsageExample.applicationModel;
            var pageSelectionAreaElement, connectAreaElement, userElement, icwsUser;
            
            pageSelectionAreaElement = document.getElementById(PAGE_SELECTION_AREA_ELEMENT_ID);
            connectAreaElement = document.getElementById(CONNECT_AREA_ELEMENT_ID);
            userElement = document.getElementById(TOOLBAR_USER_ELEMENT_ID);
            
            if (session.isConnected()) {
                // When connected, update the application header to display the logged in IC user.
                icwsUser = session.getSessionUser();
                userElement.innerHTML = icwsUser;
                
                // When connected, show the page selection control and session/disconnect controls.
                utilities.removeClass(connectAreaElement, applicationModel.CSS_CLASS_HIDDEN);                
                utilities.removeClass(pageSelectionAreaElement, applicationModel.CSS_CLASS_HIDDEN);
            } else {
                // When disconnected, hide the page selection control and session/disconnect controls.
                utilities.addClass(connectAreaElement, applicationModel.CSS_CLASS_HIDDEN);                
                utilities.addClass(pageSelectionAreaElement, applicationModel.CSS_CLASS_HIDDEN);
            }
        }
        
        // Register the application toolbar control, with the control functions wired up where they are needed.
        applicationExports.applicationModel.registerApplicationControl({
            // The control ID.
            controlId: 'applicationToolbar',
        
            // Performs one time control initialization.
            initialize: initialize,
        
            // Performs initialization for a new session.
            connect: updateApplicationToolbar,

            // Performs cleanup due to a disconnected session.
            disconnect: updateApplicationToolbar
        });
        
        return exports;
    } (applicationExports.applicationToolbar || {}));

    return applicationExports;
} (icwsDirectUsageExample || {}));