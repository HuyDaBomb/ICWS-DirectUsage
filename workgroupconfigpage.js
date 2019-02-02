var icwsDirectUsageExample = (function (applicationExports) {
    'use strict';
    
    //
    // Workgroup configuration page implementation.
    // 
    // Demonstrates subscription to a set of configuration settings for IC workgroups.
    //
    applicationExports.workgroupConfigPage = (function (exports) {
        // Element IDs used in this file.
        var WORKGROUP_CONFIG_TABLE_ELEMENT_ID = 'workgroup-config-table';
        
        // Track application page state.
        var isConnected = false;
        var isShown = false;
        var isSubscriptionStarted = false;
        
        // Each subscription needs a unique ID.  The application can use whatever IDs it wants to track those subscriptions.
        // Here, we use an incrementing integer.
        var subscriptionId = 1;
        
        // Caches the workgroup configurations, with subscription updates applied as they are received.
        var workgroupConfigurations = {};
        
        // Define the columns that should be displayed in the workgroup table.
        var WORKGROUP_CONTENTS_COLUMNS = [
            // The workgroup display name is retrieved from a sub-property, which is handled as a special
            // case in this example, via the 'isDisplayName' property.
            {displayName: 'Workgroup', property: '', isDisplayName: true},
            {displayName: 'Has Queue', property: 'hasQueue'},
            {displayName: 'Is Active?', property: 'isActive'},
            {displayName: 'Wrap Up Enabled?', property: 'isWrapUpActive'},
            {displayName: 'Callback Enabled?', property: 'isCallbackEnabled'},
            {displayName: 'ACD Email Enabled?', property: 'isAcdEmailRoutingActive'}
        ];

        /**
         * Initializes the view.
         */
        function intializeView() {
            var session = icwsDirectUsageExample.session;
            var tableHeaderRowElement, i, j, columnDefinition, headerColumnText, headerCellElement, tableElement, tableHeaderElement;
       
            // Subscribe to the session model's callback mechanism for receiving ICWS messages.
            // In this case, listen to workgroup configuration changes.
            session.registerMessageCallback('urn:inin.com:configuration.people:workgroupsMessage', workgroupConfigurationChanged);
            
            // Dynamically populate the workgroup table element.
            tableHeaderRowElement = document.createElement('tr');

            // Add the column headers to match the application's planned display.
            for (i=0, j=WORKGROUP_CONTENTS_COLUMNS.length; i<j; i++) {
                columnDefinition = WORKGROUP_CONTENTS_COLUMNS[i];
                headerColumnText = document.createTextNode(columnDefinition.displayName);
                
                headerCellElement = document.createElement('th');
                headerCellElement.appendChild(headerColumnText);
                tableHeaderRowElement.appendChild(headerCellElement);
            }

            // Add the header to the table element.
            tableElement = document.getElementById(WORKGROUP_CONFIG_TABLE_ELEMENT_ID);
            tableHeaderElement = tableElement.tHead;
            tableHeaderElement.appendChild(tableHeaderRowElement);
            tableElement.appendChild(tableHeaderElement);
        }
        
        /**
         * If the application is connected and the view is shown, then update the display.
         */
        function startWorkgroupConfigSubscription() {
            var diagnostics = icwsDirectUsageExample.diagnostics;
            var session = icwsDirectUsageExample.session;
            var uri, payload, i, j, columnDefinition;
            
            // Only start the subscription when a connection is active and the page is shown.
            if (isConnected && isShown && !isSubscriptionStarted) {
                // Provide contextual information for the request.
                diagnostics.reportInformationalMessage('Start workgroup subscription', 'Start a subscription for workgroup configuration changes.');
                
                uri = '/messaging/subscriptions/configuration/workgroups/' + subscriptionId++;
                
                payload = {
                    configurationIds: ['*'], // Subscribe to all object matching the rightsFilter.
                    properties: [], // Subscribe to specific properties on those object, populated below.
                    rightsFilter: 'view' // Subscribe to only workgroups that the logged in user has IC 'view' access rights.
                };
                
                // Add the list of properties to the subscription request payload, indicating only the properties that
                // are needed to display as columns in the table display.
                //
                // The workgroup configuration display name does not need requested since all ICWS configuration object
                // operations include a 'configurationId' property that contains both the ID and display name of the object.
                for (i=0, j=WORKGROUP_CONTENTS_COLUMNS.length; i<j; i++) {
                    columnDefinition = WORKGROUP_CONTENTS_COLUMNS[i];
                    if (!columnDefinition.isDisplayName) {
                        payload.properties.push(columnDefinition.property);
                    }
                }
                
                session.sendRequest('PUT', uri, payload, function() {
                    /* Further error handling could be performed here, based on the value of status. */
                });

                isSubscriptionStarted = true;
            }
        }
        
        /**
         * User status changed message processing callback.
         * @param {Object} jsonMessage The JSON message payload.
         */
        function workgroupConfigurationChanged(jsonMessage) {
            var utilities = icwsDirectUsageExample.utilities;
            var added, iAdded, jAdded, workgroupConfigAdded,
                changed, iChanged, jChanged, workgroupConfigChanged, workgroupConfig,
                removed, iRemoved, jRemoved, workgroupConfigRemovedId;
            
            // If this is not an update, then the message contains the entire result.
            if (!jsonMessage.isDelta) {
                // Clear any cached workgroup configurations.
                workgroupConfigurations = {};
            }
            
            // Process newly added objects, caching them by configuration ID.
            added = jsonMessage.added;
            for (iAdded=0, jAdded=added.length; iAdded<jAdded; iAdded++) {
                workgroupConfigAdded = added[iAdded];
                workgroupConfigurations[workgroupConfigAdded.configurationId.id] = workgroupConfigAdded;
            }
            
            // Process changed objects, merging their updated properties into the cache.
            changed = jsonMessage.changed;
            for (iChanged=0, jChanged=changed.length; iChanged<jChanged; iChanged++) {
                workgroupConfigChanged = changed[iChanged];
                workgroupConfig = workgroupConfigurations[workgroupConfigChanged.configurationId.id];
                // Merge the properties from workgroupConfigChanged into the workgroupConfig cache object.
                utilities.applyObjectChanges(workgroupConfig, workgroupConfigChanged);
            }
            
            // Process removed objects, removing them from the cache by configuration ID.
            removed = jsonMessage.removed;
            for (iRemoved=0, jRemoved=removed.length; iRemoved<jRemoved; iRemoved++) {
                workgroupConfigRemovedId = removed[iRemoved];
                delete workgroupConfigurations[workgroupConfigRemovedId];
            }

            updateWorkgroupConfigDisplay();
        }
        
        /**
         * Update the display to reflect the current workgroup configuration cache.
         */
        function updateWorkgroupConfigDisplay() {
            var tableElement, tableBodyElement, row, workgroupConfigId, tableRowElement, workgroupConfiguration,
                i, j, columnDefinition, propertyValue, columnTextElement, cellElement;

            tableElement = document.getElementById(WORKGROUP_CONFIG_TABLE_ELEMENT_ID);
            
            // Remove any previous table rows.
            tableBodyElement = tableElement.tBodies[0];
            for (row=tableBodyElement.rows.length-1; row>=0; row--) {
               tableBodyElement.deleteRow(row);
            }
            
            // Add a table row for each workgroup configuration.
            // A better interface implementation might update existing rows rather than replacing them.
            for (workgroupConfigId in workgroupConfigurations) {
                if (workgroupConfigurations.hasOwnProperty(workgroupConfigId)) {
                    tableRowElement = tableBodyElement.insertRow(-1);
            
                    workgroupConfiguration = workgroupConfigurations[workgroupConfigId];
                    
                    // Add a cell for each column that should be displayed, getting the property value from
                    // the object.
                    for (i=0, j=WORKGROUP_CONTENTS_COLUMNS.length; i<j; i++) {
                        columnDefinition = WORKGROUP_CONTENTS_COLUMNS[i];
                        
                        // The workgroup display name is retrieved from a sub-property.
                        // For other properties, just use the string display for simplicity of this example.
                        if (!columnDefinition.isDisplayName) {
                            propertyValue = workgroupConfiguration[columnDefinition.property];
                        } else {
                            propertyValue = workgroupConfiguration.configurationId.displayName;
                        }
                        
                        columnTextElement = document.createTextNode(propertyValue);
                        cellElement = tableRowElement.insertCell(-1);
                        cellElement.appendChild(columnTextElement);
                    }
                }
            }
        }
        
        // Register this application page, with the page functions wired up where they are needed.
        applicationExports.applicationModel.registerApplicationPage({
            // The HTML element ID of the page, which is also used as the page ID.
            pageId: 'workgroup-config-page',
            
            // The label under which to publish this page for selection.
            pageLabel: 'Workgroup Configuration',

            // Performs one time page initialization.
            initialize: function() {
                intializeView();
            },
        
            // Called when the page is shown.
            show: function() {
                isShown = true;
                startWorkgroupConfigSubscription();
            },
        
            // Called when the page is hidden.
            hide: function() {
                isShown = false;
            },
            
            // Performs initialization for a new session.
            connect: function() {
                isConnected = true;
                startWorkgroupConfigSubscription();
            },
        
            // Performs cleanup due to a disconnected session.
            disconnect: function() {
                isConnected = false;
                isSubscriptionStarted = false;
                workgroupConfigurations = {};
                updateWorkgroupConfigDisplay();
            }
        });

        return exports;
    } (applicationExports.workgroupConfigPage || {}));

    return applicationExports;
} (icwsDirectUsageExample || {}));