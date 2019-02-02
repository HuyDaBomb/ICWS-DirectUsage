var icwsDirectUsageExample = (function (applicationExports) {
    'use strict';

    //
    // IC Recordings page implementation
    // 
    // Demonstrates usage of the Recordings ICWS API
    //
    applicationExports.recordingsPage = (function (exports) {
        // Element IDs used in this file.
        var API_SELECTION_ELEMENT_ID = 'recording-api-selection';

        var STATION_FORM_ELEMENT_ID = 'station-form';
        var STATION_STATUS_ELEMENT_ID = 'station-status';

        var RECORDING_STATUS_ELEMENT_ID = 'recording-status';
        var RECORDING_ID_ELEMENT_ID = 'recording-id';

        var RECORDING_EXPORT_ELEMENT_ID = 'recording-export';

        var RECORDING_PLAY_STATION_ELEMENT_ID = 'recording-play-station';
        var RECORDING_STOP_STATION_ELEMENT_ID = 'recording-stop-station';

        var RECORDING_GET_ATTRIBUTES_ELEMENT_ID = 'recording-get-attributes';
        var RECORDING_ATTR_TABLE_ELEMENT_ID = 'recording-attrs-table';
        var RECORDING_ATTRS_ELEMENT_ID = 'recording-attrs';
        var RECORDING_ATTR_NAME_ELEMENT_ID = 'new-attr-name';
        var RECORDING_ATTR_VALUE_ELEMENT_ID = 'new-attr-value';
        var RECORDING_ATTR_ADD_ELEMENT_ID = 'recording-attr-add';

        var RECORDING_GET_TAGS_ELEMENT_ID = 'recording-get-tags';
        var RECORDING_TAGS_TABLE_ELEMENT_ID = 'recording-tags-table';
        var RECORDING_TAGS_ELEMENT_ID = 'recording-tags';
        var RECORDING_TAG_NAME_ELEMENT_ID = 'new-tag';
        var RECORDING_TAG_ADD_ELEMENT_ID = 'recording-tag-add';

        var RECORDING_SEND_AS_EMAIL_ID = 'recording-send-email';
        var RECORDING_EMAIL_TO_ID = 'recording-email-to';

        var utilities = icwsDirectUsageExample.utilities;
        var applicationModel = icwsDirectUsageExample.applicationModel;
        var session = icwsDirectUsageExample.session;
        var diagnostics = icwsDirectUsageExample.diagnostics;

        // Define the columns that should be displayed in the attributes and tags tables.
        var RECORDING_ATTRS_CONTENTS_COLUMNS = [
            { displayName: 'Name', property: 'attributeName' },
            { displayName: 'Value', property: 'attributeValue' }
        ];

        var RECORDING_TAGS_CONTENTS_COLUMNS = [
            { displayName: 'Name', property: 'tags' }
        ];

        var stationAudioPlaybackRequestId = null;
        var stationAudioPlaybackInteractionId = null;
        var stationQueueMonitorId = null;

        var registeredApis = {};

        function onInitialize() {

            // Register API views
            registeredApis['recording-export-api'] = { displayName: 'Export Recording' };
            registeredApis['recording-attributes-api'] = { displayName: 'Recording Attributes', reset: resetAttributesView };
            registeredApis['recording-tags-api'] = { displayName: 'Recording Tags', reset: resetTagsView };
            registeredApis['recording-station-playback-api'] = { displayName: 'Station Audio Playback', reset: resetStationAudioPlaybackView };
            registeredApis['recording-send-as-email'] = { displayName: 'Send Recording as Email' };

            var apiSelectionElement = document.getElementById(API_SELECTION_ELEMENT_ID);
            for (var apiId in registeredApis) {
                if (registeredApis.hasOwnProperty(apiId)) {
                    var apiOptions = registeredApis[apiId];

                    // Create an application page selection control option for this page.
                    var optionElement = document.createElement('option');
                    optionElement.text = apiOptions.displayName;
                    optionElement.value = apiId;
                    apiSelectionElement.add(optionElement);
                }
            }

            // Hook up event handlers.
            utilities.bindEvent(document.getElementById(API_SELECTION_ELEMENT_ID), 'change', changeSelectedApi);
            utilities.bindEvent(document.getElementById(RECORDING_ID_ELEMENT_ID), 'input', resetAllViews);

            utilities.bindEvent(document.getElementById(RECORDING_EXPORT_ELEMENT_ID), 'click', exportUri);

            utilities.bindEvent(document.getElementById(STATION_FORM_ELEMENT_ID), 'submit', stationLogin);
            utilities.bindEvent(document.getElementById(RECORDING_PLAY_STATION_ELEMENT_ID), 'click', playStationAudio);
            utilities.bindEvent(document.getElementById(RECORDING_STOP_STATION_ELEMENT_ID), 'click', stopStationAudio);

            utilities.bindEvent(document.getElementById(RECORDING_GET_ATTRIBUTES_ELEMENT_ID), 'click', function () { loadAttributes(); });
            utilities.bindEvent(document.getElementById(RECORDING_ATTR_ADD_ELEMENT_ID), 'click', addAttribute);

            utilities.bindEvent(document.getElementById(RECORDING_GET_TAGS_ELEMENT_ID), 'click', function () { loadTags(); });
            utilities.bindEvent(document.getElementById(RECORDING_TAG_ADD_ELEMENT_ID), 'click', addTag);

            utilities.bindEvent(document.getElementById(RECORDING_SEND_AS_EMAIL_ID), 'click', sendAsEmail);

            // Subscribe to the async messages for handling station audio playback
            // This message is received when audio playback has started.
            session.registerMessageCallback('urn:inin.com:recordings:startStationAudioPlaybackCompletedMessage', stationAudioStarted);

            // This message is received when an interaction in a monitored queue is changed. This will be used to monitor for playback interaction states.
            session.registerMessageCallback('urn:inin.com:queues:queueContentsMessage', stationQueueUpdated);

            // Build the tables
            buildEditableTable(RECORDING_ATTR_TABLE_ELEMENT_ID, RECORDING_ATTRS_CONTENTS_COLUMNS);
            buildEditableTable(RECORDING_TAGS_TABLE_ELEMENT_ID, RECORDING_TAGS_CONTENTS_COLUMNS);

            // Force the default API view to load.
            changeSelectedApi();
        }

        function buildEditableTable(tableId, columnContents) {
            // Dynamically populate the table elements.
            var headerColumnText, headerCellElement;
            var tableHeaderRowElement = document.createElement('tr');

            // Add the column headers to match the application's planned display.
            for (var i = 0; i < columnContents.length; ++i) {
                var columnDefinition = columnContents[i];
                headerColumnText = document.createTextNode(columnDefinition.displayName);
                headerCellElement = document.createElement('th');
                headerCellElement.appendChild(headerColumnText);
                tableHeaderRowElement.appendChild(headerCellElement);
            }

            // Add an extra column for row operations
            headerColumnText = document.createTextNode('');
            headerCellElement = document.createElement('th');
            headerCellElement.appendChild(headerColumnText);
            tableHeaderRowElement.appendChild(headerCellElement);

            // Add the header to the table element.
            var tableElement = document.getElementById(tableId);
            var tableHeaderElement = tableElement.tHead;
            tableHeaderElement.appendChild(tableHeaderRowElement);
            tableElement.appendChild(tableHeaderElement);
        }

        function setStationStatusMessage(opt_message) {
            setStatusMessage(STATION_STATUS_ELEMENT_ID, opt_message);
        }

        function setRecordingStatusMessage(opt_message) {
            setStatusMessage(RECORDING_STATUS_ELEMENT_ID, opt_message);
        }

        function setStatusMessage(elementId, opt_message) {
            var statusElement;

            statusElement = document.getElementById(elementId);

            // Display the status message, if provided.
            if (opt_message) {
                statusElement.innerHTML = utilities.escapeHtml(opt_message);
                hideElement(false, elementId);

                // Report new status in the history sidebar
                diagnostics.reportInformationalMessage('Recordings Management', opt_message);
            } else {
                statusElement.innerHTML = '';
                hideElement(true, elementId);
            }
        }

        function getCurrentApiId() {
            // Retrieve the selection from the api selection control
            var apiSelectionElement = document.getElementById(API_SELECTION_ELEMENT_ID);
            return apiSelectionElement.options[apiSelectionElement.selectedIndex].value;
        }

        function changeSelectedApi() {

            // Show the currently selected page, hide the others
            var selectedApiId = getCurrentApiId();
            if (!selectedApiId) {
                setRecordingStatusMessage('Error: Unknown page selected.');
                return;
            }

            hideElement(false, selectedApiId);

            for (var apiId in registeredApis) {
                if (apiId !== selectedApiId) {
                    hideElement(true, apiId);
                }
            }

            // Reset the view
            resetView(selectedApiId);
        }

        function resetView(viewId) {
            if (registeredApis[viewId] && registeredApis[viewId].reset) {
                registeredApis[viewId].reset();
            }
            else {
                // Reset the status by default
                setRecordingStatusMessage();
            }
        }

        function resetAllViews() {
            for (var viewId in registeredApis) {
                if (registeredApis.hasOwnProperty(viewId)) {
                    resetView(viewId);
                }
            }
        }

        function resetAttributesView() {
            hideElement(true, RECORDING_ATTRS_ELEMENT_ID);
            setRecordingStatusMessage();
        }

        function resetTagsView() {
            hideElement(true, RECORDING_TAGS_ELEMENT_ID);
            setRecordingStatusMessage();
        }

        function resetStationAudioPlaybackView() {
            stationAudioPlaybackRequestId = null;
            stationAudioPlaybackInteractionId = null;
            showPlaybackStopButton(false);
            setRecordingStatusMessage();
        }

        function onConnect() {
            resetAllViews();
            setRecordingStatusMessage();
            checkForEffectiveStation();
        }

        function onDisconnect() {
            resetAllViews();
            setRecordingStatusMessage();
            setStationStatusMessage();
        }

        function getRecordingId() {
            // Retrieve the currently specified recording ID and displays an error if one is not set.
            var recordingId = document.getElementById(RECORDING_ID_ELEMENT_ID).value;
            if (!recordingId) {
                setRecordingStatusMessage('Error: Must specify a Recording ID.');
            }
            return recordingId;
        }

        // Hides or shows a given element on the page
        function hideElement(hide, elementId) {
            var elem = document.getElementById(elementId);
            if (hide) {
                utilities.addClass(elem, applicationModel.CSS_CLASS_HIDDEN);
            }
            else {
                utilities.removeClass(elem, applicationModel.CSS_CLASS_HIDDEN);
            }
        }

        // Checks if the user has an effective station. 
        // Displays it if so, otherwise displays the station login dialog.
        function checkForEffectiveStation() {
            var effectiveStation = session.getEffectiveStation();
            if (effectiveStation) {
                // Hide the station login form
                hideElement(true, STATION_FORM_ELEMENT_ID);
                // Monitor the effective station queue
                startStationQueueWatch(effectiveStation);
                // Display the station
                setStationStatusMessage('Logged into effective station ' + effectiveStation);
            }
            else {
                // Show the login form
                hideElement(false, STATION_FORM_ELEMENT_ID);
                setStationStatusMessage();
            }
        }

        function startStationQueueWatch(stationId) {
            // Start watches for the station's queue updates. This can be used to track station playback interactions.
            // Updates are handled in stationQueueUpdated when they match the subscriptionId that we provide.
            stationQueueMonitorId = 'example-app-station-' + stationId;
            var stationQueue = { queueType: 3/*=Station queue*/, queueName: stationId };
            var payload = { queueIds: [stationQueue], attributeNames: ['Eic_State'] };
            session.sendRequest('PUT', '/messaging/subscriptions/queues/' + stationQueueMonitorId, payload, function (status, jsonResponse) {
                if (!utilities.isSuccessStatus(status)) {
                    setStationStatusMessage('[Error ' + status + ', ' + jsonResponse.message + ']');
                }
            });
        }

        function stationLogin(e) {
            var stationId, payload;

            // Override the html form processing, since it is fully handled in this function.
            if (e.preventDefault) {
                e.preventDefault();
            }

            // Retrieve the station ID form value
            stationId = document.getElementById(STATION_FORM_ELEMENT_ID).stationId.value;

            // Attempt to log into the specified station
            payload = { __type: 'urn:inin.com:connection:workstationSettings', workstation: stationId };
            session.sendRequest('PUT', '/connection/station', payload, function (status, jsonResponse) {
                if (!utilities.isSuccessStatus(status)) {
                    setStationStatusMessage('[Error ' + status + ', ' + jsonResponse.message + ']');
                    return;
                }

                startStationQueueWatch(stationId);

                setStationStatusMessage('Successfully logged into station \'' + stationId + '\'');
            });
        }

        function exportUri() {
            var payload;

            var recordingId = getRecordingId();
            if (!recordingId) {
                return;
            }

            // Request the Export URI. This can be used to download the recording.
            session.sendRequest('GET', '/recordings/' + recordingId + '/export-uri', payload, function (status, jsonResponse) {
                if (!utilities.isSuccessStatus(status)) {
                    setRecordingStatusMessage('[Error ' + status + ', ' + jsonResponse.message + ']');
                    return;
                }

                // Successfully retrieved the export URI. Start the download.
                window.open(jsonResponse.uri);

                setRecordingStatusMessage('Successfully exported recording.');
            });
        }

        function playStationAudio() {
            var payload;
            var recordingId = getRecordingId();
            if (!recordingId) {
                return;
            }

            // Verify we haven't already started playback
            if (stationAudioPlaybackRequestId) {
                setRecordingStatusMessage('Station audio playback already in progress.');
                return;
            }

            // Switch to the stop button
            showPlaybackStopButton(true);

            // Send POST request to start station audio playback of a given recording ID. 
            // Notice that no station is sent with the request as the API will use the user's effective station.
            session.sendRequest('POST', '/recordings/play/station-audio/start/' + recordingId, payload, function (status, jsonResponse) {
                if (!utilities.isSuccessStatus(status)) {
                    resetStationAudioPlaybackView();
                    setRecordingStatusMessage('[Error ' + status + ', ' + jsonResponse.message + ']');
                    return;
                }

                // Station audio playback accepted. The response contains a message ID to correlate with the async response handled in stationAudioStarted
                stationAudioPlaybackRequestId = jsonResponse.requestId;

                setRecordingStatusMessage('Starting station audio playback...');
            });

        }

        function stationAudioStarted(jsonMessage) {
            if (jsonMessage.requestId !== stationAudioPlaybackRequestId) {
                return;
            }

            // This event corresponds to the current playback request. Check for an error first.
            if (jsonMessage.error) {
                resetStationAudioPlaybackView();
                setRecordingStatusMessage('[Error ' + jsonMessage.error.message + ']');
                return;
            }

            // The interaction ID sent with this message can be used to track the playback interaction and to stop it.
            // Otherwise the interaction will disconnect when the playback ends and stationQueueUpdated will handle it.
            stationAudioPlaybackInteractionId = jsonMessage.interactionId;

            setRecordingStatusMessage('Station audio playback started.');
        }

        function stationQueueUpdated(jsonMessage) {
            if (jsonMessage.subscriptionId !== stationQueueMonitorId) {
                return;
            }

            if (stationAudioPlaybackInteractionId) {
                // Playback is currently active
                // Check for playback interaction to disconnect so the client can be notified that playback has stopped.
                for (var i = 0; i < jsonMessage.interactionsChanged.length; ++i) {
                    if (jsonMessage.interactionsChanged[i].interactionId === stationAudioPlaybackInteractionId) {
                        var state = jsonMessage.interactionsChanged[i].attributes['Eic_State'];
                        if (state === 'I' || state === 'E') {
                            // Playback interaction disconnected.
                            onStationAudioStopped();
                        }
                    }
                }
            }
        }

        function stopStationAudio() {
            var payload;

            if (!stationAudioPlaybackInteractionId) {
                setRecordingStatusMessage('Station audio playback not yet started.');
                return;
            }

            setRecordingStatusMessage('Requesting station audio playback stop...');

            // Send a request to stop the station audio playback. 
            // This will cause the interaction to disconnect, and the station queue event handler will handle reporting this to the user.
            session.sendRequest('POST', '/recordings/play/station-audio/stop/' + stationAudioPlaybackInteractionId, payload, function (status, jsonResponse) {
                if (!utilities.isSuccessStatus(status)) {
                    setStationStatusMessage('[Error ' + status + ', ' + jsonResponse.message + ']');
                    return;
                }
            });
        }

        function onStationAudioStopped() {
            resetStationAudioPlaybackView();
            setRecordingStatusMessage('Station audio playback stopped.');
        }

        function showPlaybackStopButton(show) {
            if (show) {
                // Show the stop button and hide the play button
                hideElement(false, RECORDING_STOP_STATION_ELEMENT_ID);
                hideElement(true, RECORDING_PLAY_STATION_ELEMENT_ID);
            }
            else {
                // Hide the stop button and show the play button
                hideElement(true, RECORDING_STOP_STATION_ELEMENT_ID);
                hideElement(false, RECORDING_PLAY_STATION_ELEMENT_ID);
            }
        }

        function loadTags(onCompleteMsg) {
            var payload, cellElement;

            var recordingId = getRecordingId();
            if (!recordingId) {
                return;
            }

            // Request the tags for the recording and display them in a table.
            session.sendRequest('GET', '/recordings/' + recordingId + '/tags', payload, function (status, jsonResponse) {
                if (!utilities.isSuccessStatus(status)) {
                    setRecordingStatusMessage('[Error ' + status + ', ' + jsonResponse.message + ']');
                    hideElement(true, RECORDING_TAGS_ELEMENT_ID);
                    return;
                }

                // Succesfully retrieved recording tags.
                var tagsTable = document.getElementById(RECORDING_TAGS_TABLE_ELEMENT_ID);

                // Clear the current table
                var tableBody = tagsTable.tBodies[0];
                while (tableBody.rows.length > 0) {
                    tableBody.deleteRow(0);
                }

                // Clear the add tag name input field
                document.getElementById(RECORDING_TAG_NAME_ELEMENT_ID).value = '';

                // Display the new tags. These are returned as an array of strings.
                hideElement(false, RECORDING_TAGS_ELEMENT_ID);

                function createDeleteHandler(tagName) {
                    return function () {
                        deleteTag(recordingId, tagName);
                    };
                }

                for (var i = 0; i < jsonResponse.tags.length; ++i) {
                    var tag = jsonResponse.tags[i];
                    var tableRowElement = tableBody.insertRow(-1);

                    // Add a cell for the tag
                    var columnTextElement = document.createTextNode(tag);
                    cellElement = tableRowElement.insertCell(-1);
                    cellElement.appendChild(columnTextElement);

                    // Add delete button to last column
                    var columnDeleteElement = document.createElement('a');
                    columnDeleteElement.setAttribute('href', '#');
                    columnDeleteElement.appendChild(document.createTextNode('Delete'));

                    cellElement = tableRowElement.insertCell(-1);
                    cellElement.appendChild(columnDeleteElement);

                    utilities.bindEvent(columnDeleteElement,
                                        'click',
                                        createDeleteHandler(tag));
                }

                setRecordingStatusMessage(onCompleteMsg || 'Successfully retrieved recording tags.');
            });
        }

        function addTag() {
            var payload;
            var recordingId = getRecordingId();
            if (!recordingId) {
                return;
            }

            var nameInput = document.getElementById(RECORDING_TAG_NAME_ELEMENT_ID);
            if (!nameInput.value) {
                setRecordingStatusMessage('Error: Must specify a tag name.');
                return;
            }

            // Send the tag in an array in the JSON body.
            payload = { tags: [nameInput.value] };
            session.sendRequest('PUT', '/recordings/' + recordingId + '/tags', payload, function (status, jsonResponse) {
                if (!utilities.isSuccessStatus(status)) {
                    setRecordingStatusMessage('[Error ' + status + ', ' + jsonResponse.message + ']');
                    return;
                }

                // Succesfully added recording attribute. Load them again
                loadTags('Added tag \'' + nameInput.value + '\'');
            });
        }

        function deleteTag(recordingId, tagName) {
            var payload;

            // Specify the name of the tag to delete in the URL request parameters.
            // Be sure to encode the tag as it could contain special characters.
            session.sendRequest('DELETE', '/recordings/' + recordingId + '/tags?tag=' + encodeURIComponent(tagName), payload, function (status, jsonResponse) {
                if (!utilities.isSuccessStatus(status)) {
                    setRecordingStatusMessage('[Error ' + status + ', ' + jsonResponse.message + ']');
                    return;
                }

                // Succesfully deleted recording attribute. Load them again
                loadTags('Deleted tag \'' + tagName + '\'');
            });
        }

        function loadAttributes(onCompleteMsg) {
            var payload, cellElement;

            var recordingId = getRecordingId();
            if (!recordingId) {
                return;
            }

            // Request the attributes for the recording and display them in a table.
            session.sendRequest('GET', '/recordings/' + recordingId + '/attributes', payload, function (status, jsonResponse) {
                if (!utilities.isSuccessStatus(status)) {
                    setRecordingStatusMessage('[Error ' + status + ', ' + jsonResponse.message + ']');
                    hideElement(true, RECORDING_ATTRS_ELEMENT_ID);
                    return;
                }

                // Succesfully retrieved recording attributes.
                var attrTable = document.getElementById(RECORDING_ATTR_TABLE_ELEMENT_ID);

                // Clear the current table
                var tableBody = attrTable.tBodies[0];
                while (tableBody.rows.length > 0) {
                    tableBody.deleteRow(0);
                }

                // Clear the add/update input fields
                document.getElementById(RECORDING_ATTR_NAME_ELEMENT_ID).value = '';
                document.getElementById(RECORDING_ATTR_VALUE_ELEMENT_ID).value = '';

                // Display the new attribute values. These are returned as an array of name/value pairs.
                hideElement(false, RECORDING_ATTRS_ELEMENT_ID);

                function createDeleteHandler(atributeName) {
                    return function () {
                        deleteAttribute(recordingId, atributeName);
                    };
                }

                for (var i = 0; i < jsonResponse.attributesValues.length; ++i) {
                    var attrValue = jsonResponse.attributesValues[i];
                    var tableRowElement = tableBody.insertRow(-1);

                    // Add a cell for each column that should be displayed, getting the property value from the object.
                    for (var j = 0; j < RECORDING_ATTRS_CONTENTS_COLUMNS.length; ++j) {
                        var columnDefinition = RECORDING_ATTRS_CONTENTS_COLUMNS[j];
                        var propertyValue = attrValue[columnDefinition.property];

                        var columnTextElement = document.createTextNode(propertyValue);
                        cellElement = tableRowElement.insertCell(-1);
                        cellElement.appendChild(columnTextElement);
                    }

                    // Add delete button to last column
                    var columnDeleteElement = document.createElement('a');
                    columnDeleteElement.setAttribute('href', '#');
                    columnDeleteElement.appendChild(document.createTextNode('Delete'));

                    cellElement = tableRowElement.insertCell(-1);
                    cellElement.appendChild(columnDeleteElement);

                    utilities.bindEvent(columnDeleteElement,
                                        'click',
                                        createDeleteHandler(attrValue.attributeName));
                }

                setRecordingStatusMessage(onCompleteMsg || 'Successfully retrieved recording attributes.');
            });
        }

        function addAttribute() {
            var payload;
            var recordingId = getRecordingId();
            if (!recordingId) {
                return;
            }

            var nameInput = document.getElementById(RECORDING_ATTR_NAME_ELEMENT_ID);
            if (!nameInput.value) {
                setRecordingStatusMessage('Error: Must specify an attribute name.');
                return;
            }

            var valueInput = document.getElementById(RECORDING_ATTR_VALUE_ELEMENT_ID);
            if (!valueInput.value) {
                setRecordingStatusMessage('Error: Must specify an attribute value.');
                return;
            }

            // Specify the attribute as an array of attribute name/value pairs in the JSON body.
            // If the attributeName already exists, the existing attributeValue will be replaced with the new value.
            payload = { attributesValues: [{ attributeName: nameInput.value, attributeValue: valueInput.value}] };
            session.sendRequest('PUT', '/recordings/' + recordingId + '/attributes', payload, function (status, jsonResponse) {
                if (!utilities.isSuccessStatus(status)) {
                    setRecordingStatusMessage('[Error ' + status + ', ' + jsonResponse.message + ']');
                    return;
                }

                // Succesfully added recording attribute. Load them again
                loadAttributes('Set attribute \'' + nameInput.value + '\' to \'' + valueInput.value + '\'');
            });
        }

        function deleteAttribute(recordingId, attrName) {
            var payload;

            // Specify the name of the attribute to delete in the URL request parameters.
            // Be sure to encode the attribute name as it could contain special characters.
            session.sendRequest('DELETE', '/recordings/' + recordingId + '/attributes?attributeName=' + encodeURIComponent(attrName), payload, function (status, jsonResponse) {
                if (!utilities.isSuccessStatus(status)) {
                    setRecordingStatusMessage('[Error ' + status + ', ' + jsonResponse.message + ']');
                    return;
                }

                // Succesfully deleted recording attribute. Load them again
                loadAttributes('Deleted attribute \'' + attrName + '\'');
            });
        }

        function sendAsEmail() {
            var recordingIds = getRecordingId();
            if (!recordingIds) {
                return;
            }

            var toInput = document.getElementById(RECORDING_EMAIL_TO_ID);
            if (!toInput.value) {
                setRecordingStatusMessage('Error: Must specify at least one to address.');
                return;
            }

            // Support multiple recording IDs separated by a comma
            var recordingIdArray = recordingIds.split(',');

            // Build the email address recipient list. 
            var parsedToAddresses = toInput.value.split(',');
            var toEmailParameters = [];
            for (var i = 0; i < parsedToAddresses.length; ++i) {
                toEmailParameters.push({
                    displayName: 'John Doe ' + i, // Typically this would be the real name of the email recipient
                    address: parsedToAddresses[i]
                });
            }

            // Define the email that will be sent with the attached recording ID(s).
            var parameters = {
                toParticipants: { emailAddresses: toEmailParameters },
                replyToAddress: 'test@example.com',
                ccParticipants: { emailAddresses: [] },
                emailSubject: 'ICWS Example App',
                emailBody: 'This is a recording email sent by the ICWS Example App.',
                priority: 1
            };

            if (recordingIdArray.length > 1) {
                // Send using the bulk API
                sendMultipleRecordings(recordingIdArray, parameters);
            }
            else {
                // Send using the individual API
                sendSingleRecording(recordingIdArray[0], parameters);
            }

        }

        function sendSingleRecording(recordingId, parameters) {
            // Send request to the individual recording API
            session.sendRequest('PUT', '/recordings/' + recordingId + '/send-as-email', parameters, function (status, jsonResponse) {
                if (!utilities.isSuccessStatus(status)) {
                    setRecordingStatusMessage('[Error ' + status + ', ' + jsonResponse.message + ']');
                    return;
                }

                // Succesfully sent the recording to the specified email
                setRecordingStatusMessage('Successfully sent recording as an email.');
            });
        }

        function sendMultipleRecordings(recordingIds, parameters) {
            // Send request to the bulk recording API
            var payload = {
                recordings: { recordingIds: recordingIds },
                parameters: parameters
            };

            session.sendRequest('PUT', '/recordings/send-as-email', payload, function (status, jsonResponse) {
                if (!utilities.isSuccessStatus(status)) {
                    setRecordingStatusMessage('[Error ' + status + ', ' + jsonResponse.message + ']');
                    return;
                }

                // Succesfully sent the recordings to the specified email
                setRecordingStatusMessage('Successfully sent multiple recordings as an email.');
            });
        }

        // Register this application page, with the page functions wired up where they are needed.
        applicationExports.applicationModel.registerApplicationPage({
            // The HTML element ID of the page, which is also used as the page ID.
            pageId: 'recordings-page',

            // The label under which to publish this page for selection.
            pageLabel: 'Recordings',

            // Performs one time page initialization.
            initialize: onInitialize,

            // Performs initialization for a new session.
            connect: onConnect,

            // Performs cleanup due to a disconnected session.
            disconnect: onDisconnect
        });

        return exports;
    } (applicationExports.recordingsPage || {}));

    return applicationExports;
} (icwsDirectUsageExample || {}));