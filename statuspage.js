var icwsDirectUsageExample = (function (applicationExports) {
    'use strict';
    
    //
    // IC Status page implementation
    // 
    // Demonstrates retrieval of the logged in IC user's configuration settings.
    //
    applicationExports.statusPage = (function (exports) {
        // Element IDs used in this file.
        var USER_CURRENT_STATUS_ELEMENT_ID = 'user-current-status';
        var USER_CHANGE_STATUS_ELEMENT_ID = 'user-change-status';
        
        // A map from status ID to status message details.
        var statusMessages = {};
        // The collection of status IDs that the user is allowed to set by the server.
        var userSelectableStatusIds;
        // The collection of status IDs that will be used as a random selection pool.
        // This is a subset of userSelectableStatusIds, with some statuses removed (e.g. 'forward' statuses).
        var randomCandidateStatusIds;
        // The current status ID for the logged in user.
        var currentStatusId;
        
        /**
         * Retrieves and caches the collection of available IC status messages.
         */
        function retrieveStatusMessages() {
            var utilities = icwsDirectUsageExample.utilities;
            var diagnostics = icwsDirectUsageExample.diagnostics;
            var session = icwsDirectUsageExample.session;
            var statusMessageList, i, j, statusMessage, uri, payload;
            
            // Provide contextual information for the request.
            diagnostics.reportInformationalMessage('Retrieve IC status messages', 'Retrieve the configured IC status message definitions.');
            
            session.sendRequest('GET', '/status/status-messages', payload, function(status, jsonResponse) {
                if (utilities.isSuccessStatus(status)) {
                    // Cache the status messages in a map, keyed by status ID.
                    statusMessageList = jsonResponse.statusMessageList;
                    for (i=0, j=statusMessageList.length; i<j; i++) {
                        statusMessage = statusMessageList[i];
                        statusMessages[statusMessage.statusId] = statusMessage;
                    }
                    
                    // Once the list of available status messages and the list of selectable ones are both cached, filter the result
                    // to obtain the list of statuses that are candidates for random selection.
                    calculateCandidateStatuses();
                    
                    // Now that the status messages are cached, start a subscription for user status changes.
                    // The status messages are needed in order to display any status changes.
                    startUserStatusSubscription();
                    
                    // Pre-load the status icons for faster display by the browser.
                    preloadStatusIcons();
                }
            });
            
            // Provide contextual information for the request.
            diagnostics.reportInformationalMessage('Retrieve available IC statuses', 'Retrieve the IC statuses avilable to the connected IC user.');
            
            uri = '/status/status-messages-user-access/' + session.getSessionUser();
            payload = {};
            session.sendRequest('GET', uri, payload, function(status, jsonResponse) {
                if (utilities.isSuccessStatus(status)) {
                    userSelectableStatusIds = jsonResponse.statusMessages;
                    
                    // Once the list of available status messages and the list of selectable ones are both cached, filter the result
                    // to obtain the list of statuses that are candidates for random selection.
                    calculateCandidateStatuses();
                }
            });
        }
        
        /**
         * Determines the IC statuses available for random selection to assign to the logged in user.
         */
        function calculateCandidateStatuses() {
            var utilities = icwsDirectUsageExample.utilities;
            var i, j, statusId, statusMessage;
            
            // Once the list of available status messages and the list of selectable ones are both cached, filter the result
            // to obtain the list of statuses that are candidates for random selection.
            if (userSelectableStatusIds && userSelectableStatusIds.length > 0 && statusMessages && utilities.hasProperties(statusMessages)) {
                randomCandidateStatusIds = [];
                for (i=0, j=userSelectableStatusIds.length; i<j; i++) {
                    statusId = userSelectableStatusIds[i];
                    statusMessage = statusMessages[statusId];
                    
                    // For this example, filter out forward statuses (to avoid the need for a forward number).
                    if (!statusMessage.isForwardStatus) {
                        randomCandidateStatusIds.push(statusId);
                    }
                }
                
                // Start a time out to repeatedly change the logged in user's IC status.
                startTimeout();
            }
        }
        
        /**
         * Pre-load the status icons for faster display by the browser.
         */
        function preloadStatusIcons() {
            var session = icwsDirectUsageExample.session;
            var icwsRootResourceUri, imagePreloader, statusMessageId, statusMessage;
            
            // The status icon URI is relative to the ICWS root URI for the server
            // that the application is connected to.
            icwsRootResourceUri = session.icwsGetRootResourceUri();
            if (icwsRootResourceUri) {
                imagePreloader = document.createElement('img');
                for (statusMessageId in statusMessages) {
                    if (statusMessages.hasOwnProperty(statusMessageId)) {
                        statusMessage = statusMessages[statusMessageId];
                        
                        // Pre-load the status icon.
                        imagePreloader.src = icwsRootResourceUri + statusMessage.iconUri;
                    }
                }
            }
        }
        
        /**
         * Caches the logged in user's current IC status, and starts a subscription to receive IC status changes for the logged in user.
         */
        function startUserStatusSubscription() {
            var utilities = icwsDirectUsageExample.utilities;
            var diagnostics = icwsDirectUsageExample.diagnostics;
            var session = icwsDirectUsageExample.session;
            var icwsUser, payload, userCurrentStatusElement;
            
            // Provide contextual information for the request.
            diagnostics.reportInformationalMessage('Start IC user status subscription', 'Start a subscription for IC status changes for the logged in user.');
            
            // Start listening for IC status changes for the logged in user.
            icwsUser = session.getSessionUser();
            payload = { userIds:[icwsUser] };
            session.sendRequest('PUT', '/messaging/subscriptions/status/user-statuses', payload, function(status, jsonResponse) {
                if (!utilities.isSuccessStatus(status)) {
                    userCurrentStatusElement = document.getElementById(USER_CURRENT_STATUS_ELEMENT_ID);
                    userCurrentStatusElement.innerHTML = '[Error ' + status + ', ' + jsonResponse.message + ']';
                }
            });
        }
        
        var STATUS_CHANGE_INTERVAL_MS = 3000;
        var timerId;
        
        /**
         * Implements a timer to change the logged in user to a random IC status.
         */
        function startTimeout() {
            var utilities = icwsDirectUsageExample.utilities;
            var diagnostics = icwsDirectUsageExample.diagnostics;
            var session = icwsDirectUsageExample.session;
            var userChangeStatusElement, newStatusMessageId, index, icwsUser, uri, payload;
            
            if (!timerId) {
                timerId = setTimeout(function() {
                    userChangeStatusElement = document.getElementById(USER_CHANGE_STATUS_ELEMENT_ID);
                    // If the statusMessages and currentStatusId have been cached, pick a random status.
                    if (userChangeStatusElement.checked && utilities.hasProperties(statusMessages) && randomCandidateStatusIds && currentStatusId) {
                        
                        if (randomCandidateStatusIds.length > 1) {
                            newStatusMessageId = currentStatusId;
                            
                            // Keep picking a random status until we get a different one than the current status.
                            while (newStatusMessageId === currentStatusId) {
                                index = Math.floor(Math.random() * randomCandidateStatusIds.length);
                                newStatusMessageId = randomCandidateStatusIds[index];
                            }

                            if (newStatusMessageId !== currentStatusId) {
                                icwsUser = session.getSessionUser();
                                
                                uri = '/status/user-statuses/' + icwsUser;
                                
                                // Provide contextual information for the request.
                                diagnostics.reportInformationalMessage('Change IC status', 'Change the IC status of the connected IC user.');
                                
                                payload = { statusId: newStatusMessageId };
                                session.sendRequest('PUT', uri, payload, function() {
                                    timerId = null;
                                    // Start the next timer.
                                    startTimeout();
                                });
                            }
                        }
                    } else if (session.isConnected()) {
                        // The statusMessages and/or currentStatusId haven't been cached yet, skip this timer interval and try again later.
                        timerId = null;
                        // Start the next timer.
                        startTimeout();
                    }
                }, STATUS_CHANGE_INTERVAL_MS);
            }
        }
        
        /**
         * User status changed message processing callback.
         * @param {Object} jsonMessage The JSON message payload.
         */
        function userStatusChanged(jsonMessage) {
            var userStatuses = jsonMessage.userStatusList;

            // This example is only subscribed to a single IC user (the logged in user) for status changes.
            currentStatusId = userStatuses[0].statusId;
            updateUserStatusDisplay(currentStatusId);
        }
        
        /**
         * Updates the display to reflect the specified status.
         * @param {String} statusId The status ID of the status to display.
         */
        function updateUserStatusDisplay(statusId) {
            var session = icwsDirectUsageExample.session;
            var statusMessage, userCurrentStatusElement, uri, statusIconElement, statusMessageElement, statusMessageTextElement;
            
            statusMessage = statusMessages[statusId];
            userCurrentStatusElement = document.getElementById(USER_CURRENT_STATUS_ELEMENT_ID);
            
            // Clear the current status message elements.
            // This could be made more efficient by re-using the existing elements.
            userCurrentStatusElement.innerHTML = '';
            
            // The status icon URI is relative to the ICWS root URI for the server
            // that the application is connected to.
            uri = session.icwsGetRootResourceUri();
            if (uri) {
                uri += statusMessage.iconUri;
                
                // Create an image element for the status icon.
                statusIconElement = document.createElement('img');
                statusIconElement.src = uri;
                statusIconElement.height = 16;
                statusIconElement.width = 16;
                userCurrentStatusElement.appendChild(statusIconElement);
            }
            
            statusMessageElement = document.createElement('span');
            statusMessageTextElement = document.createTextNode(statusMessage.messageText);
            statusMessageElement.appendChild(statusMessageTextElement);
            userCurrentStatusElement.appendChild(statusMessageElement);
        }
        
        // Register this application page, with the page functions wired up where they are needed.
        applicationExports.applicationModel.registerApplicationPage({
            // The HTML element ID of the page, which is also used as the page ID.
            pageId: 'status-page',
            
            // The label under which to publish this page for selection.
            pageLabel: 'Status Example',

            // Performs one time page initialization.
            initialize: function() {
                var session = icwsDirectUsageExample.session;
            
                // Subscribe to the session model's callback mechanism for receiving ICWS messages.
                // In this case, listen to IC user status changes.
                session.registerMessageCallback('urn:inin.com:status:userStatusMessage', userStatusChanged);
            },
        
            // Performs initialization for a new session.
            connect: function() {
                retrieveStatusMessages();
            },
            
            // Performs cleanup due to a disconnected session.
            disconnect: function() {
                if (timerId) {
                    clearTimeout(timerId);
                    timerId = null;
                }
                statusMessages = {};
                randomCandidateStatusIds = null;
                userSelectableStatusIds = null;
                currentStatusId = null;
            }
        });

        return exports;
    } (applicationExports.statusPage || {}));

    return applicationExports;
} (icwsDirectUsageExample || {}));