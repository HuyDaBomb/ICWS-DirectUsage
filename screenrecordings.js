var icwsDirectUsageExample = (function (applicationExports) {
    'use strict';

    //
    // IC Screen Recordings page implementation
    // 
    // Demonstrates usage of the Screen Recordings ICWS API
    //
    applicationExports.screenRecordingsPage = (function (exports) {
        // Element IDs used in this file.
        var API_SELECTION_ELEMENT_ID = 'screen-recording-api-selection';
        
        var SCREEN_RECORDING_STATUS_ELEMENT_ID = 'screen-recording-status';
        var SCREEN_RECORDING_RECORDING_IDS_ELEMENT_ID = 'screen-recording-recording-ids';
        var SCREEN_RECORDING_USER_ID_ELEMENT_ID = 'screen-recording-user-id';
        
        var SCREEN_RECORDING_START_RECORDING_ELEMENT_ID = 'screen-recording-start';
        var SCREEN_RECORDING_STOP_RECORDING_ELEMENT_ID = 'screen-recording-stop';
        var SCREEN_RECORDING_PAUSE_RECORDING_ELEMENT_ID = 'screen-recording-pause';
        var SCREEN_RECORDING_RESUME_RECORDING_ELEMENT_ID = 'screen-recording-resume';
        
        var utilities = icwsDirectUsageExample.utilities;
        var applicationModel = icwsDirectUsageExample.applicationModel;
        var session = icwsDirectUsageExample.session;
        var diagnostics = icwsDirectUsageExample.diagnostics;

        var startScreenRecordingRequestId = null;
        var stopScreenRecordingRequestId = null;
        var pauseScreenRecordingRequestIds = [];
        var resumeScreenRecordingRequestIds = [];

        var registeredApis = {};

        function onInitialize() {

            // Register API views
            registeredApis['screen-recording-record'] = { displayName: 'Record', reset: resetRecordView };

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
            utilities.bindEvent(document.getElementById(SCREEN_RECORDING_USER_ID_ELEMENT_ID), 'input-user-id', resetAllViews);
            utilities.bindEvent(document.getElementById(SCREEN_RECORDING_RECORDING_IDS_ELEMENT_ID), 'input-recording-id', resetAllViews);
            
            utilities.bindEvent(document.getElementById(SCREEN_RECORDING_START_RECORDING_ELEMENT_ID), 'click', startScreenRecording);
            utilities.bindEvent(document.getElementById(SCREEN_RECORDING_STOP_RECORDING_ELEMENT_ID), 'click', stopScreenRecording);
            utilities.bindEvent(document.getElementById(SCREEN_RECORDING_PAUSE_RECORDING_ELEMENT_ID), 'click', pauseScreenRecording);
            utilities.bindEvent(document.getElementById(SCREEN_RECORDING_RESUME_RECORDING_ELEMENT_ID), 'click', resumeScreenRecording);
            
            // Initialize the states of the buttons so only start is available
            setButtonStatesRecordingNotStarted();

            // Subscribe to the async messages for handling screen recording
            session.registerMessageCallback('urn:inin.com:recordings:startScreenRecordingCompletedMessage', startScreenRecordingCompleted);
            session.registerMessageCallback('urn:inin.com:messaging:asyncOperationCompletedMessage', stopScreenRecordingCompleted);
            session.registerMessageCallback('urn:inin.com:recordings:pauseScreenRecordingCompletedMessage', pauseScreenRecordingCompleted);
            session.registerMessageCallback('urn:inin.com:recordings:resumeScreenRecordingCompletedMessage', resumeScreenRecordingCompleted);
            
            // Force the default API view to load.
            changeSelectedApi();
        }

        function setScreenRecordingStatusMessage(opt_message) {
            setStatusMessage(SCREEN_RECORDING_STATUS_ELEMENT_ID, opt_message);
        }
        
        function setStatusMessage(elementId, opt_message) {
            var statusElement;

            statusElement = document.getElementById(elementId);

            // Display the status message, if provided.
            if (opt_message) {
                statusElement.innerHTML = utilities.escapeHtml(opt_message);
                hideElement(false, elementId);

                // Report new status in the history sidebar
                diagnostics.reportInformationalMessage('Screen Recordings Management', opt_message);
            } else {
                statusElement.innerHTML = '';
                hideElement(true, elementId);
            }
        }

        function setButtonStatesRecordingStarted() {
            // Activate all the buttons except for start, so that only 1 recording can be started at a time
            document.getElementById(SCREEN_RECORDING_START_RECORDING_ELEMENT_ID).disabled = true;
            document.getElementById(SCREEN_RECORDING_STOP_RECORDING_ELEMENT_ID).disabled = false;
        }

        function setButtonStatesRecordingNotStarted() {
            // Deactivate all buttons except for start since no recording is currently in progress
            document.getElementById(SCREEN_RECORDING_START_RECORDING_ELEMENT_ID).disabled = false;
            document.getElementById(SCREEN_RECORDING_STOP_RECORDING_ELEMENT_ID).disabled = true;
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
                setScreenRecordingStatusMessage('Error: Unknown page selected.');
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
                setScreenRecordingStatusMessage();
            }
        }

        function resetAllViews() {
            for (var viewId in registeredApis) {
                if (registeredApis.hasOwnProperty(viewId)) {
                    resetView(viewId);
                }
            }
        }
        
        function resetRecordView() {
            startScreenRecordingRequestId = null;
            stopScreenRecordingRequestId = null;
            pauseScreenRecordingRequestIds = [];
            resumeScreenRecordingRequestIds = [];
            setButtonStatesRecordingNotStarted();
            setScreenRecordingStatusMessage();
            // Clear out the recording ids text box
            document.getElementById(SCREEN_RECORDING_RECORDING_IDS_ELEMENT_ID).value = '';
        }

        function onConnect() {
            resetAllViews();
        }

        function onDisconnect() {
            resetAllViews();
        }

        function getRecordingIds() {
            // Retrieve the currently specified recording IDs and displays an error if no recordings are specified.
            var recordingIds = document.getElementById(SCREEN_RECORDING_RECORDING_IDS_ELEMENT_ID).value;
            if (!recordingIds) {
                setScreenRecordingStatusMessage('Error: Must specify a Recording ID.');
            }
            return recordingIds;
        }

        function getUserId() {
            // Retrieve the currently specified recording ID and displays an error if text box is empty.
            var userId = document.getElementById(SCREEN_RECORDING_USER_ID_ELEMENT_ID).value;
            if (!userId) {
                setScreenRecordingStatusMessage('Error: Must specify a User ID.');
            }
            return userId;
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

        function startScreenRecordingCompleted(jsonMessage) {
            if (jsonMessage.requestId !== startScreenRecordingRequestId) {
                return;
            }

            if (jsonMessage.error) {
                resetRecordView();
                setScreenRecordingStatusMessage('[Error ' + jsonMessage.error.message + ']');
                return;
            }

            // The recording IDs sent with this message can be used to stop the recordings.
            var recordings = [];
            for (var i = 0; i < jsonMessage.recordingIdList.recordingIds.length; i++)
            {
                recordings.push(jsonMessage.recordingIdList.recordingIds[i]);
            }

            // Update button states and reset stop request id.
            setButtonStatesRecordingStarted();
            stopScreenRecordingRequestId = null;

            // Place the ids of the returned recordings into the text box so they can be stopped.
            document.getElementById(SCREEN_RECORDING_RECORDING_IDS_ELEMENT_ID).value = recordings;

            setScreenRecordingStatusMessage('Successfully started screen recordings.');
        }

        function stopScreenRecordingCompleted(jsonMessage) {
            if (jsonMessage.requestId !== stopScreenRecordingRequestId) {
                return;
            }

            // Set the state of the view back to a pre-started state
            resetRecordView();

            if (jsonMessage.error) {
                setScreenRecordingStatusMessage('[Error ' + jsonMessage.error.message + ']');
                return;
            }
            
            setScreenRecordingStatusMessage('Successfully stopped screen recording.');
        }

        function pauseScreenRecordingCompleted(jsonMessage) {
            var index = pauseScreenRecordingRequestIds.indexOf(jsonMessage.requestId);
            if (index === -1) {
                return;
            }

            // Remove the found request id from the array
            pauseScreenRecordingRequestIds = pauseScreenRecordingRequestIds.splice(index, 1);

            if (jsonMessage.error) {
                resetRecordView();
                setScreenRecordingStatusMessage('[Error ' + jsonMessage.error.message + ']');
                return;
            }
            
            setScreenRecordingStatusMessage('Successfully paused screen recordings.');
        }

        function resumeScreenRecordingCompleted(jsonMessage) {
            var index = resumeScreenRecordingRequestIds.indexOf(jsonMessage.requestId);
            if (index === -1) {
                return;
            }

            // Remove the found request id from the array
            resumeScreenRecordingRequestIds = resumeScreenRecordingRequestIds.splice(index, 1);

            if (jsonMessage.error) {
                resetRecordView();
                setScreenRecordingStatusMessage('[Error ' + jsonMessage.error.message + ']');
                return;
            }
            
            setScreenRecordingStatusMessage('Successfully resumed screen recordings.');
        }

        function startScreenRecording() {
            var payload;
            var userId = getUserId();
            if (!userId) {
                return;
            }

            // Verify we haven't already started a screen recording
            if (startScreenRecordingRequestId) {
                setScreenRecordingStatusMessage('Screen recording already in progress.');
                return;
            }
            
            // Send POST request to start screen recordings for a given user ID. The user must have the screen capture client installed
            // and properly configured in order for the screen to be recorded. Multiple screen recordings will be made if the user is
            // logged into multiple screen capture client instances.
            session.sendRequest('POST', '/screenrecordings/record/start/' + userId, payload, function (status, jsonResponse) {
                if (!utilities.isSuccessStatus(status)) {
                    resetRecordView();
                    setScreenRecordingStatusMessage('[Error ' + status + ', ' + jsonResponse.message + ']');
                    return;
                }

                // Start screen recording request accepted. The response contains a message ID to correlate with
                // the async response handled in startScreenRecordingCompleted.
                startScreenRecordingRequestId = jsonResponse.requestId;

                setScreenRecordingStatusMessage('Starting screen recording...');
            });
        }

        function stopScreenRecording() {
            var userId = getUserId();
            if (!userId) {
                return;
            }

            var recordingIds = getRecordingIds();
            if (!recordingIds) {
                return;
            }

            // Verify a screen recording is in progress
            if (!startScreenRecordingRequestId) {
                setScreenRecordingStatusMessage('Screen recording not in progress.');
                return;
            }

            var parameters = {
                recordingIds: []
            };

            // Support multiple recording IDs separated by a comma
            var recordingIdArray = recordingIds.split(',');

            for (var i = 0; i < recordingIdArray.length; i++)
            {
                parameters.recordingIds.push(recordingIdArray[i]);
            }
                        
            // Send POST request to stop screen recordings for a given user ID. The user must have the screen capture client installed
            // and properly configured in order for the screen to be recorded. Multiple screen recordings will be stopped if more than
            // one recording ID is specified.
            session.sendRequest('POST', '/screenrecordings/record/stop/' + userId, parameters, function (status, jsonResponse) {
                if (!utilities.isSuccessStatus(status)) {
                    resetRecordView();
                    setScreenRecordingStatusMessage('[Error ' + status + ', ' + jsonResponse.message + ']');
                    return;
                }

                // Stop screen recording request accepted. The response contains a message ID to correlate with
                // the async response handled in stopScreenRecordingCompleted.
                stopScreenRecordingRequestId = jsonResponse.requestId;

                setScreenRecordingStatusMessage('Stopping screen recordings...');
            });
        }

        function pauseScreenRecording() {
            var payload;
            var userId = getUserId();
            if (!userId) {
                return;
            }

            // Send POST request to pause screen recordings for a given user ID. The user must have the screen capture client installed
            // and properly configured in order for the screen to be recorded. All screen recordings in progress for the user will be paused.
            session.sendRequest('POST', '/screenrecordings/record/pause/' + userId, payload, function (status, jsonResponse) {
                if (!utilities.isSuccessStatus(status)) {
                    resetRecordView();
                    setScreenRecordingStatusMessage('[Error ' + status + ', ' + jsonResponse.message + ']');
                    return;
                }

                // Pause screen recording request accepted. The response contains a message ID to correlate with
                // the async response handled in pauseScreenRecordingCompleted.
                pauseScreenRecordingRequestIds.push(jsonResponse.requestId);

                setScreenRecordingStatusMessage('Pausing screen recordings...');
            });
        }

        function resumeScreenRecording() {
            var payload;
            var userId = getUserId();
            if (!userId) {
                return;
            }
            
            // Send POST request to resume screen recordings for a given user ID. The user must have the screen capture client installed
            // and properly configured in order for the screen to be recorded. All paused screen recordings for the user will be resumed.
            session.sendRequest('POST', '/screenrecordings/record/resume/' + userId, payload, function (status, jsonResponse) {
                if (!utilities.isSuccessStatus(status)) {
                    resetRecordView();
                    setScreenRecordingStatusMessage('[Error ' + status + ', ' + jsonResponse.message + ']');
                    return;
                }

                // Resume screen recording request accepted. The response contains a message ID to correlate with
                // the async response handled in resumeScreenRecordingCompleted.
                resumeScreenRecordingRequestIds.push(jsonResponse.requestId);

                setScreenRecordingStatusMessage('Resuming screen recordings...');
            });
        }
        
        // Register this application page, with the page functions wired up where they are needed.
        applicationExports.applicationModel.registerApplicationPage({
            // The HTML element ID of the page, which is also used as the page ID.
            pageId: 'screen-recordings-page',

            // The label under which to publish this page for selection.
            pageLabel: 'Screen Recordings',

            // Performs one time page initialization.
            initialize: onInitialize,

            // Performs initialization for a new session.
            connect: onConnect,

            // Performs cleanup due to a disconnected session.
            disconnect: onDisconnect
        });

        return exports;
    } (applicationExports.screenRecordingsPage || {}));

    return applicationExports;
} (icwsDirectUsageExample || {}));