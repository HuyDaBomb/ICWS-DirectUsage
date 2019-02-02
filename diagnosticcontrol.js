var icwsDirectUsageExample = (function (applicationExports) {
    'use strict';
    
    //
    // Diagnostic control implementation
    // 
    // This sidebar displays diagnostic information about what the application is doing, to help correlate
    // user interface operations with ICWS API operations.
    //
    applicationExports.diagnosticControl = (function (exports) {
        // Element IDs used in this file.
        var DIAGNOSTIC_CONTENTS_ELEMENT_ID = 'diagnostic-contents';
        var DIAGNOSTIC_CLEAR_ELEMENT_ID = 'diagnostic-clear';
        
        /**
         * Initializion operations for this control.
         */
        function initialize() {
            var utilities = icwsDirectUsageExample.utilities;
            var diagnostics = icwsDirectUsageExample.diagnostics;
            
            // Register callbacks with the diagnostics abstraction module to receive informational
            // and web service request/response details from other components.
            diagnostics.registerInformationalMessageCallback(diagnosticInformationalMessageCallback);
            diagnostics.registerRequestResponseCallback(diagnosticRequestResponseCallback);
            
            // Hook up event handlers.
            utilities.bindEvent(document.getElementById(DIAGNOSTIC_CLEAR_ELEMENT_ID), 'click', clearDiagnostics);
        }
        
        /**
         * Callback to display informational diagnostic messages.
             * @param {String} action The short description of the action that is being reported.
             * @param {String} [opt_message] The message for the action.
         * @see icwsDirectUsageExample.diagnostics.registerInformationalMessageCallback
         */
        function diagnosticInformationalMessageCallback(action, opt_message) {
            var utilities = icwsDirectUsageExample.utilities;
            var childElements, actionPart, actionTextElement, formattedMessage, messagePart;
            
            // Create elements for the diagnostic control entry.
            childElements = [];
            
            // Create an element for the information 'action' text.
            actionPart = document.createElement('span');
            actionPart.className = 'diagnostic-action';
            actionTextElement = document.createTextNode(action);
            actionPart.appendChild(actionTextElement);
            childElements.push(actionPart);

            // Create an element for the informational message text, if any.
            if (opt_message) {
                // For improved user experience, perform basic syntax highlighting
                // of the message text.
                formattedMessage = utilities.syntaxHighlight(opt_message);
                
                messagePart = document.createElement('span');
                messagePart.className = 'diagnostic-message';
                messagePart.innerHTML = formattedMessage;
                childElements.push(messagePart);
            }
            
            // Add a diagnostic control entry with the created elements.
            addDiagnosticEntry(childElements);
        }
        
        /**
         * Callback to display diagnostic information about requests/responses.
         * @param {String} action The action that is being reported. (eg: 'request' or 'response')
         * @param {String} actionDetail Detail about the action. (eg: 'GET' or 200)
         * @param {String} correlationId A correlation ID to associate diagnostic messages.
         * @param {String} [opt_target] The target of the action, if any. (eg: {the uri})
         * @param {object|string} [opt_message] The message for the action, as a string or JSON.
         * @see icwsDirectUsageExample.diagnostics.registerRequestResponseCallback
         */
        function diagnosticRequestResponseCallback(action, actionDetail, correlationId, opt_target, opt_message) {
            var utilities = icwsDirectUsageExample.utilities;
            var childElements, actionPart, actionTextElement, actionDetailPart, actionDetailTextElement,
                correlationIdPart, correlationIdTextElement, formattedTarget, targetPart,
                formattedMessage, messagePart;
            
            // Create elements for the diagnostic control entry.
            childElements = [];
            
            // Create an element for the request/response 'action' text.
            // For this application, this is the ICWS werb service operation that was performed.
            actionPart = document.createElement('span');
            actionPart.className = 'diagnostic-action';
            actionTextElement = document.createTextNode(action);
            actionPart.appendChild(actionTextElement);
            childElements.push(actionPart);

            // Create an element for the request/response 'action detail' text.
            // For this application, this is the web service method type.
            actionDetailPart = document.createElement('span');
            actionDetailPart.className = 'diagnostic-action-detail';
            actionDetailTextElement = document.createTextNode(actionDetail);
            actionDetailPart.appendChild(actionDetailTextElement);
            childElements.push(actionDetailPart);

            // Create an element for the request/response 'correlation ID'.
            // For this application, this is a numeric value used to visually associate
            // a request with its response in the diagnostic control display.
            correlationIdPart = document.createElement('span');
            correlationIdPart.className = 'diagnostic-action-detail';
            correlationIdTextElement = document.createTextNode('Correlation=' + correlationId);
            correlationIdPart.appendChild(correlationIdTextElement);
            childElements.push(correlationIdPart);

            // Create an element for the request/response 'target' text.
            // For this application, this is the web service uri that was invoked.
            if (opt_target) {
                // For improved user experience, de-emphasize the target root URI.
                formattedTarget = highlightTarget(opt_target);
                
                targetPart = document.createElement('span');
                targetPart.className = 'diagnostic-target';
                targetPart.innerHTML = formattedTarget;
                childElements.push(targetPart);
            }

            // Create an element for the request/response 'message' text, if any.
            if (opt_message) {
                // For improved user experience, perform basic syntax highlighting
                // of the message text.
                formattedMessage = utilities.syntaxHighlight(opt_message);
                
                messagePart = document.createElement('span');
                messagePart.className = 'diagnostic-message';
                messagePart.innerHTML = formattedMessage;
                childElements.push(messagePart);
            }
            
            // Add a diagnostic control entry with the created elements.
            addDiagnosticEntry(childElements);
        }
        
        /**
         * Adds a diagnostic control entry containing the specified child elements.
         * @param {Array<Object>} childElements An array of elements around which to create a diagnostic control entry.
         */
        function addDiagnosticEntry(childElements) {
            var diagnosticItem, timePart, timeElement, i, j, diagnosticArea, atBottom;
            
            diagnosticItem = document.createElement('div');
            diagnosticItem.className = 'diagnostic-item';
            
            // Create an element for the diagnostic entry time stamp.
            timePart = document.createElement('span');
            timePart.className = 'diagnostic-time';
            timeElement = document.createTextNode(getDiagnosticTime());
            timePart.appendChild(timeElement);
            diagnosticItem.appendChild(timePart);

            // Add the provided child elements.
            for (i=0, j=childElements.length; i<j; i++) {
                diagnosticItem.appendChild(childElements[i]);
            }
            
            diagnosticArea = document.getElementById(DIAGNOSTIC_CONTENTS_ELEMENT_ID);
            // If we're near the bottom of the scroll area, then auto-scroll; otherwise, don't
            // This allows the user to scroll the diagnostic control up to view entries without
            // the list jumping to the bottom with each new entry.
            atBottom = (diagnosticArea.scrollTop >= (diagnosticArea.scrollHeight - diagnosticArea.clientHeight) - 10);
            diagnosticArea.appendChild(diagnosticItem);
            if (atBottom) {
                diagnosticArea.scrollTop = diagnosticArea.scrollHeight - diagnosticArea.clientHeight;
            }
        }
        
        /**
         * Clears the diagnostics display.
         */
        function clearDiagnostics() {
            var diagnosticArea = document.getElementById(DIAGNOSTIC_CONTENTS_ELEMENT_ID);
            
            while (diagnosticArea.hasChildNodes()) {
                diagnosticArea.removeChild(diagnosticArea.lastChild);
            }
        }

        /**
         * Gets the current time for diagnostic item display.
         * @returns {String} The current time display.
         */
        function getDiagnosticTime()
        {
            var localTime, year, month, date, hours, minutes, seconds, milliseconds;

            // Create a nice date/time display for the diagnostic entries.
            // hh:mm:ss.SSS MM/DD/YYYY
            localTime = new Date();
            year = localTime.getFullYear();
            month = localTime.getMonth() + 1;
            date = localTime.getDate();
            hours = localTime.getHours();
            minutes = localTime.getMinutes();
            seconds = localTime.getSeconds();
            milliseconds = localTime.getMilliseconds();

            return hours + ':' + minutes + ':' + seconds + '.' + milliseconds + ' ' + month + '/' + date + '/' + year;
        }
        
        /**
         * Performs simple highlighting for the provided diagnostic target.
         * @param {String} target The diagnostic target to be highlighted.
         * @returns {String} The highlighted text.
         */
        function highlightTarget(target) {
            return target.replace(/(http|https):\/\/[\w-]+(\.[\w-]+)*(:\d+)?\/icws(\/\d+)?\//g, function (match) {
                return '<span class="diagnostic-target-prefix">' + match + '</span>';
            });
        }
        
        // Register the application toolbar control, with the control functions wired up where they are needed.
        applicationExports.applicationModel.registerApplicationControl({
            // The control ID.
            controlId: 'diagnosticControl',
        
            // Performs one time control initialization.
            initialize: initialize
        });
        
        return exports;
    } (applicationExports.diagnosticControl || {}));

    return applicationExports;
} (icwsDirectUsageExample || {}));