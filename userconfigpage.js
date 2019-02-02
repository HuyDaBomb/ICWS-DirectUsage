var icwsDirectUsageExample = (function (applicationExports) {
    'use strict';
    
    //
    // User configuration page implementation
    // 
    // Demonstrates IC user status subscription and modification.
    //
    applicationExports.userConfigPage = (function (exports) {
        // Element IDs used in this file.
        var USER_CONFIG_ELEMENT_ID = 'user-config-display';
        
        // Track application page state.
        var isConnected = false;
        var isShown = false;
        var userConfig;
        
        /**
         * If the application is connected and the view is shown, then update the display.
         */
        function updateUserConfigIfNecessary() {
            var utilities = icwsDirectUsageExample.utilities;
            var diagnostics = icwsDirectUsageExample.diagnostics;
            var session = icwsDirectUsageExample.session;
            var uri, payload, latestCorrelationId;
            
            if (isConnected && isShown) {
                if (userConfig) {
                    updateUserConfigDisplay(userConfig);
                } else {
                    // Provide contextual information for the request.
                    diagnostics.reportInformationalMessage('Retrieve logged in user configuration', 'Retrieve all configuration settings for the logged in user.');
                    
                    // ICWS configuration API retrievals utilize query parameters to specify which values should be returned.
                    // uri = '/configuration/users/' + session.getSessionUser();
                    uri = '/configuration/users/';
                    // Return all properties on the object.  This works since we are only querying a small number of objects (i.e. 1).
                    // 
                    // Note that this example retrieves all properties as a simple example, however it is inefficient since it requests
                    // all properties on the user--in general, the specific properties that are needed by an application should be specified.
                    // uri += '?select=*';
                    // mailboxProperties.emailAddress
                    // personalInformationProperties.notes
                    uri += '?select=extension,skills,workgroups,statusText,cost,mailboxProperties.emailAddress,personalInformationProperties.notes';
                    // Use the special right to view the logged in user's own configuration, guaranteeing access.
                    // uri += '&rightsFilter=loggedInUser';
                    uri += '&rightsFilter=admin';
                    
                    payload = {};
                    latestCorrelationId = session.sendRequest('GET', uri, payload, function(status, jsonResponse, correlationId) {
                        // Only apply the latest result.
                        if (latestCorrelationId === correlationId) {
                            if (utilities.isSuccessStatus(status)) {
                                userConfig = jsonResponse;
                            } else {
                                userConfig = {};
                            }
                            updateUserConfigDisplay(userConfig);
                        }
                    });
                }
            } else {
                // Clear the display.
                updateUserConfigDisplay('');
            }
        }
        
        /**
         * Updates the display with the specified text.
         * @param {Object|String} text The text to display.
         */
        function updateUserConfigDisplay(text) {
            var utilities = icwsDirectUsageExample.utilities;
            var formattedMessage, userConfigElement;
            
            // For improved user experience, perform basic syntax highlighting of the text.
            formattedMessage = utilities.syntaxHighlight(text);
            
            userConfigElement = document.getElementById(USER_CONFIG_ELEMENT_ID);
            userConfigElement.innerHTML = formattedMessage;
        }
        
        // Register this application page, with the page functions wired up where they are needed.
        applicationExports.applicationModel.registerApplicationPage({
            // The HTML element ID of the page, which is also used as the page ID.
            pageId: 'user-config-page',
            
            // The label under which to publish this page for selection.
            pageLabel: 'User Configuration',

            // Called when the page is shown.
            show: function() {
                isShown = true;
                updateUserConfigIfNecessary();
            },
        
            // Called when the page is hidden.
            hide: function() {
                isShown = false;
                updateUserConfigIfNecessary();
            },
            
            // Performs initialization for a new session.
            connect: function() {
                isConnected = true;
                updateUserConfigIfNecessary();
            },
        
            // Performs cleanup due to a disconnected session.
            disconnect: function() {
                isConnected = false;
                userConfig = null;
                updateUserConfigIfNecessary();
            }
        });

        return exports;
    } (applicationExports.userConfigPage || {}));

    return applicationExports;
} (icwsDirectUsageExample || {}));