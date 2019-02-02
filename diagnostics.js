var icwsDirectUsageExample = (function (applicationExports) {
    'use strict';
    
    //
    // Namespace providing a basic callback registration/invocation abstraction for diagnostic messages.
    // 
    // For this example application, this model supports separation of diagnostic reporting of the
    // underlying ICWS interactions from the higher application-level diagnostic control that displays them.
    //
    applicationExports.diagnostics = (function (exports) {
        //
        // Informational message abstraction.
        // 
        // For this example application, this is used to publish and subscribe to application-level operations
        // where it's illustrative to clarify interface element behavior (e.g. using a cached value instead of making
        // an ICWS).
        //
        
        /**
         * The callback for receiving informational diagnostic messages {@link registerInformationalMessageCallback}.
         * @callback diagnosticInformationalMessageCallback
         * @param {String} action The short description of the action that is being reported.
         * @param {String} [opt_message] The message for the action.
         * @see icwsDirectUsageExample.diagnostics.registerInformationalMessageCallback
         */
     
        // Callback for processing diagnostic messages.
        // Type: diagnosticInformationalMessageCallback
        var informationalMessageCallback = null;
        
        /**
         * Sets a callback to be invoked for informational diagnostic messages.
         * @param {diagnosticInformationalMessageCallback} diagnosticCallback The callback to invoke with diagnostic information.
         * @throws {Error} The diagnosticCallback was undefined.
         * @throws {Error} A callback is already registered for the specified messageType.
         * @see icwsDirectUsageExample.diagnostics.reportInformationalMessage
         */
        exports.registerInformationalMessageCallback = function(diagnosticCallback) {
            if (diagnosticCallback === undefined) {
                throw new Error('Invalid argument "diagnosticCallback".');
            }
            
            if (!informationalMessageCallback) {
                informationalMessageCallback = diagnosticCallback;
            } else {
                throw new Error('Diagnostic callback already registered for informational messages.');
            }
        };
        
        /**
         * Reports informational diagnostic messages.
         * @param {String} action The short description of the action that is being reported.
         * @param {String} [opt_message] The message for the action.
         * @see icwsDirectUsageExample.diagnostics.registerInformationalMessageCallback
         */
        exports.reportInformationalMessage = function(action, opt_message) {
            if (!!informationalMessageCallback) {
                informationalMessageCallback(action, opt_message);
            }
        };
        
        //
        // Request/response abstraction.
        //
        // For this example application, this is used to publish and subscribe to ICWS web service calls to
        // display request/response details.
        //
        
        /**
         * The callback for receiving diagnostic information about requests/responses {@link registerRequestResponseCallback}.
         * @callback diagnosticRequestResponseCallback
         * @param {String} action The action that is being reported. (eg: 'request' or 'response')
         * @param {String} actionDetail Detail about the action. (eg: 'GET' or 200)
         * @param {String} correlationId A correlation ID to associate diagnostic messages.
         * @param {String} target The target of the action, if any. (eg: {the uri})
         * @param {object|string} message The message for the action, as a string or JSON.
         * @see icwsDirectUsageExample.diagnostics.registerRequestResponseCallback
         */
     
        // Callback for processing diagnostic messages.
        // Type: diagnosticRequestResponseCallback
        var requestResponseCallback = null;
        
        /**
         * Sets a callback to be invoked for diagnostic information about requests/responses.
         * @param {diagnosticRequestResponseCallback} diagnosticCallback The callback to invoke with diagnostic information.
         * @throws {Error} The diagnosticCallback was undefined.
         * @throws {Error} A callback is already registered for the specified messageType.
         * @see icwsDirectUsageExample.diagnostics.reportRequestResponse
         */
        exports.registerRequestResponseCallback = function(diagnosticCallback) {
            if (diagnosticCallback === undefined) {
                throw new Error('Invalid argument "diagnosticCallback".');
            }
            
            if (!requestResponseCallback) {
                requestResponseCallback = diagnosticCallback;
            } else {
                throw new Error('Diagnostic callback already registered for request/response operations.');
            }
        };
        
        /**
         * Reports diagnostic information about requests/responses.
         * @param {String} action The action that is being reported. (eg: 'request' or 'response')
         * @param {String} actionDetail Detail about the action. (eg: 'GET' or 200)
         * @param {Number} correlationId A correlation ID to associate diagnostic messages.
         * @param {String} target The target of the action, if any. (eg: {the uri})
         * @param {object|string} message The message for the action, as a string or JSON.
         * @see icwsDirectUsageExample.diagnostics.registerRequestResponseCallback
         */
        exports.reportRequestResponse = function(action, actionDetail, correlationId, target, message) {
            if (!!requestResponseCallback) {
                requestResponseCallback(action, actionDetail, correlationId, target, message);
            }
        };
        
        return exports;
    } (applicationExports.diagnostics || {}));
    
    return applicationExports;
} (icwsDirectUsageExample || {}));