var icwsDirectUsageExample = (function (applicationExports) {
    'use strict';
    
    //
    // Version page implementation
    // 
    // Provides examples of retrieving ICWS server version and feature information.
    //
    applicationExports.versionPage = (function (exports) {
        // Element IDs used in this file.
        var SERVER_VERSION_ELEMENT_ID = 'server-version';
        var SERVER_FEATURES_AREA_ELEMENT_ID = 'server-features-area';
        
        //
        // Display ICWS version information.
        //

        // Cache server name to version/features results, to avoid repetitive server hits for static data.
        // Dictionary of server name to objects with version and features members.
        var connectionServerInfo = {};
        
        var mostRecentVersionCorrelationId = 0;
        var mostRecentFeaturesCorrelationId = 0;
        
        /**
         * Callback handler for connection form server field keyup.
         */
        function retrieveVersionInfo() {
            var session = icwsDirectUsageExample.session;
            
            var server = session.getSessionServer();
            
            // If there is a connection form server value, process it.
            if (server) {
                // Initialize a cache object for this server value.
                if (!connectionServerInfo.hasOwnProperty(server)) {
                    connectionServerInfo[server] = {};
                }
                
                retrieveServerVersion(server);
                retrieveServerFeatures(server);
            } else {
                updateServerVersion('');
                updateServerFeatures([]);
            }
        }

        var VERSION_DIAGNOSTIC_ACTION = 'Retrieve ICWS version';
        
        /**
         * Retrieves the specified server's version information and displays it.
         * @param {String} server The ICWS server.
         */
        function retrieveServerVersion(server) {
            var utilities = icwsDirectUsageExample.utilities;
            var diagnostics = icwsDirectUsageExample.diagnostics;
            var session = icwsDirectUsageExample.session;
            var serverInfo, payload, serverVersion;
            
            serverInfo = connectionServerInfo[server];
            if (!serverInfo.versionCached) {
                diagnostics.reportInformationalMessage(VERSION_DIAGNOSTIC_ACTION, 'Retrieve the ICWS server version information for server "' + server + '".');
                
                // Applications can use ICWS version information to determine broadly if the application's needs
                // are supported by a given ICWS server.
                payload = {};
                mostRecentVersionCorrelationId = session.sendSessionlessRequest(server, 'GET', '/connection/version', payload, function(status, jsonResponse, correlationId) {
                    if (utilities.isSuccessStatus(status)) {
                        serverVersion = jsonResponse.majorVersion + '.' + jsonResponse.minorVersion + ' SU ' + jsonResponse.su;
                    } else {
                        serverVersion = '';
                    }
                    
                    serverInfo.version = serverVersion;
                    serverInfo.versionCached = true;
                    
                    // Ignore results for an older request.
                    if (mostRecentVersionCorrelationId === correlationId) {
                        diagnostics.reportInformationalMessage(VERSION_DIAGNOSTIC_ACTION, 'Reporting (and caching) results for server "' + server + '".');
                        updateServerVersion(serverVersion);
                    } else {
                        diagnostics.reportInformationalMessage(VERSION_DIAGNOSTIC_ACTION, 'Ignoring (but caching) results for server "' + server + '".');
                    }
                });
            } else {
                diagnostics.reportInformationalMessage(VERSION_DIAGNOSTIC_ACTION, 'Using cached ICWS server version information for server "' + server + '".');
                
                mostRecentVersionCorrelationId = 0;
                
                updateServerVersion(serverInfo.version);
            }
        }
        
        var FEATURES_DIAGNOSTIC_ACTION = 'Retrieve ICWS features';
        
        /**
         * Retrieves the specified server's features information and displays it.
         * @param {String} server The ICWS server.
         */
        function retrieveServerFeatures(server) {
            var utilities = icwsDirectUsageExample.utilities;
            var diagnostics = icwsDirectUsageExample.diagnostics;
            var session = icwsDirectUsageExample.session;
            var serverInfo, payload, serverFeatures;
            
            serverInfo = connectionServerInfo[server];
            if (!serverInfo.features) {
                diagnostics.reportInformationalMessage(FEATURES_DIAGNOSTIC_ACTION, 'Retrieve the ICWS server features information for server "' + server + '".');
                
                // Applications can use ICWS feature versions to determine if an ICWS feature that the application needs
                // is supported by a given ICWS server that the application is connected to.  Each ICWS request's documention
                // describes the feature and version required for that request or property.
                payload = {};
                mostRecentFeaturesCorrelationId = session.sendSessionlessRequest(server, 'GET', '/connection/features', payload, function(status, jsonResponse, correlationId) {
                    if (utilities.isSuccessStatus(status)) {
                        serverFeatures = jsonResponse.featureInfoList;
                    } else {
                        serverFeatures = {};
                    }

                    serverInfo.features = serverFeatures;
                    
                    // Ignore results for an older request.
                    if (mostRecentFeaturesCorrelationId === correlationId) {
                        diagnostics.reportInformationalMessage(FEATURES_DIAGNOSTIC_ACTION, 'Reporting (and caching) results for server "' + server + '".');
                        updateServerFeatures(serverFeatures);
                    } else {
                        diagnostics.reportInformationalMessage(FEATURES_DIAGNOSTIC_ACTION, 'Ignoring (but caching) results for server "' + server + '".');
                    }
                });
            } else {
                diagnostics.reportInformationalMessage(FEATURES_DIAGNOSTIC_ACTION, 'Using cached ICWS server features information for server "' + server + '".');
                
                mostRecentFeaturesCorrelationId = 0;
                
                updateServerFeatures(serverInfo.features);
            }
        }
        
        /**
         * Updates the display with a server version.
         * @param {String} serverVersion The server version.
         */
        function updateServerVersion(serverVersion) {
            var serverVersionElement = document.getElementById(SERVER_VERSION_ELEMENT_ID);
            serverVersionElement.innerHTML = serverVersion;
        }
        
        /**
         * Updates the display with server features.
         * @param {object} serverFeatures The server features.
         * @param {String} serverFeatures.featureId The feature ID.
         * @param {Number} serverFeatures.version The feature version.
         */
        function updateServerFeatures(serverFeatures) {
            var utilities = icwsDirectUsageExample.utilities;
            var applicationModel = icwsDirectUsageExample.applicationModel;
            var serverFeaturesAreaElement, serverFeaturesContentsElement, i, j,
                feature, featureEntry, featureIdPart, featureIdTextElement,
                versionPart, versionTextElement;
            
            serverFeaturesAreaElement = document.getElementById(SERVER_FEATURES_AREA_ELEMENT_ID);
            
            if (serverFeatures.length) {
                serverFeaturesContentsElement = serverFeaturesAreaElement.tBodies[0];

                while (serverFeaturesContentsElement.hasChildNodes()) {
                    serverFeaturesContentsElement.removeChild(serverFeaturesContentsElement.lastChild);
                }

                for (i=0, j=serverFeatures.length; i<j; i++){
                    feature = serverFeatures[i];

                    featureEntry = document.createElement('tr');
                    featureEntry.className = 'feature-item';

                    featureIdPart = document.createElement('td');
                    featureIdPart.className = 'feature-id';
                    featureIdTextElement = document.createTextNode(feature.featureId);
                    featureIdPart.appendChild(featureIdTextElement);
                    featureEntry.appendChild(featureIdPart);

                    versionPart = document.createElement('td');
                    versionPart.className = 'feature-version';
                    versionTextElement = document.createTextNode(feature.version);
                    versionPart.appendChild(versionTextElement);
                    featureEntry.appendChild(versionPart);

                    serverFeaturesContentsElement.appendChild(featureEntry);
                }
                
                utilities.removeClass(serverFeaturesAreaElement, applicationModel.CSS_CLASS_HIDDEN);
            } else {
                utilities.addClass(serverFeaturesAreaElement, applicationModel.CSS_CLASS_HIDDEN);
            }
        }
        
        // Register this application page, with the page functions wired up where they are needed.
        applicationExports.applicationModel.registerApplicationPage({
            // The HTML element ID of the page, which is also used as the page ID.
            pageId: 'version-page',
        
            // The label under which to publish this page for selection.
            pageLabel: 'Version / Features Example',

            // Called when the page is shown.
            // Update the server version/features when the page is shown
            show: retrieveVersionInfo
        });
        
        return exports;
    } (applicationExports.versionPage || {}));

    return applicationExports;
} (icwsDirectUsageExample || {}));