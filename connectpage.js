var icwsDirectUsageExample = (function (applicationExports) {
    'use strict';

    //
    // Connect page implementation
    // 
    // Provides a basic ICWS login dialog.
    //
    applicationExports.connectPage = (function (exports) {
        var ICWS_EXAMPLE_APPLICATION_NAME = 'ICWS JavaScript Direct Usage Example';

        // Element IDs of special pages needed for basic application behavior.    
        exports.CONNECT_PAGE_ID = 'connect-page';

        // Element IDs used in this file.
        var CONNECTION_FORM_ELEMENT_ID = 'connection-form';
        var CONNECTION_FORM_REMEMBER_ELEMENT_ID = 'server-remember';
        var CONNECTION_WORKING_ELEMENT_ID = 'connect-working';
        var CONNECTION_MESSAGE_ELEMENT_ID = 'connect-message';

        /**
         * Initializes html event handlers and initial page for the application.
         */
        function initialize() {
            var utilities = icwsDirectUsageExample.utilities;
            var connectionForm;

            // Hook up event handlers.
            connectionForm = document.getElementById(CONNECTION_FORM_ELEMENT_ID);
            utilities.bindEvent(connectionForm, 'submit', connect);

            // When the page is unloaded, attempt to let ICWS know that the session is no longer needed.
            utilities.bindEvent(window, 'beforeunload', onPageUnload);

            // Initialize the fields in the connection form.
            initializeConnectionForm();
        }

        /**
         * Verifies that there is a current ICWS session and activates the connection page if not.
         */
        function validateAuthentication() {
            var session = icwsDirectUsageExample.session;
            var applicationModel = icwsDirectUsageExample.applicationModel;

            // If the application is not currently connected to ICWS, change to the connect application page.
            if (!session.isConnected()) {
                applicationModel.showApplicationPage(exports.CONNECT_PAGE_ID);
            }
        }

        /**
         * Initializes the fields in the connection form.
         */
        function initializeConnectionForm() {
            var utilities = icwsDirectUsageExample.utilities;
            var applicationModel = icwsDirectUsageExample.applicationModel;
            var connectionRememberElement, connectionFormValues, connectionForm;

            // Clear the connection status message.
            setConnectionStatusMessage(false, '');

            // For improved user experience, retrieve persisted connection form values, if available.
            connectionFormValues = retrieveConnectionFormValues();

            // Apply the persisted values, or default values.
            connectionForm = document.getElementById(CONNECTION_FORM_ELEMENT_ID);
            connectionForm.remember.checked = connectionFormValues.remember;
            if (connectionFormValues.icwsServer) {
                connectionForm.server.value = connectionFormValues.icwsServer;
            }
            if (connectionFormValues.icwsUser) {
                connectionForm.userId.value = connectionFormValues.icwsUser;
            }

            // If there is no localStorage, then don't offer to persist (i.e. 'remember') connection form values.
            if (!localStorage) {
                connectionRememberElement = document.getElementById(CONNECTION_FORM_REMEMBER_ELEMENT_ID);
                utilities.addClass(connectionRememberElement, applicationModel.CSS_CLASS_HIDDEN);
            }
        }

        /**
         * Performs a connection using the specified connection form's values.
         * @param {Object} e The submit event args.
         */
        function connect(e) {
            var session = icwsDirectUsageExample.session;
            var connectionForm, server, userId, password, remember;

            // Override the html form processing, since it is fully handled in this function.
            if (e.preventDefault) {
                e.preventDefault();
            }

            // Inform user of the connection attempt.
            setConnectionStatusMessage(true, 'Connecting...');

            // Retrieve the connection form values.
            connectionForm = document.getElementById(CONNECTION_FORM_ELEMENT_ID);
            server = connectionForm.server.value;
            userId = connectionForm.userId.value;
            password = connectionForm.password.value;
            remember = connectionForm.remember.checked;

            // For improved user experience, persist the connection form values, if requested.
            storeConnectionFormValues(server, userId, remember);

            // Perform the actual ICWS connection attempt.
            session.icwsConnect(ICWS_EXAMPLE_APPLICATION_NAME, server, userId, password, connectCallback, disconnectCallback);

            // Return false to prevent the default form behavior.
            return false;
        }

        /**
         * Callback to process the result of the connection attempt.
         * @param {Boolean} success Indicates whether the connection attempt was successful.
         * @param {Object} result If successful, an object containing ICWS session details; otherwise, an object containing error information.
         *   @param {String} result.icwsCsrfToken If successful, the ICWS CSRF token.
         *   @param {String} result.icwsSessionId If successful, the ICWS session ID.
         *   @param {Number} result.status If not successful, the http status code for the connection failure.
         *   @param {String} result.responseText If not successful, a description of the error, if available.
         * @see connect
         */
        function connectCallback(success, result) {
            var applicationModel = icwsDirectUsageExample.applicationModel;
            var message, connectionForm;

            if (success) {
                message = 'Connected. token=' + result.icwsCsrfToken + ', sessionId=' + result.icwsSessionId;

                // Clear the password once the session is successfully connected, to require that the password
                // be re-entered for the next connection, providing the user with some comfort of increased
                // security.
                connectionForm = document.getElementById(CONNECTION_FORM_ELEMENT_ID);
                connectionForm.password.value = '';

                // Notify application model pages that a new ICWS connection has been made.
                applicationModel.connect();

            } else {
                message = 'Failed. status=' + result.status + ', payload=' + result.responseText;
            }

            setConnectionStatusMessage(false, message);


            //subscribe to handler sent response after login
            var session = icwsDirectUsageExample.session;
            var notificationData = {
                "headers": [{
                    "__type": "urn:inin.com:system:handlerSentNotificationsSubscription",
                    "objectId": "addinHandler",
                    "eventIds": ["sayHelloResponse"]
                }]
            }
            session.sendRequest('PUT', '/messaging/subscriptions/system/handler-sent-notifications', notificationData, function () {
                console.warn('Notification Subscribed.');
   
            });
        }

        /**
         * When the page is unloading, disconnect the current ICWS session, if any, quickly so that the page can unload.
         */
        function onPageUnload() {
            var session = icwsDirectUsageExample.session;

            session.immediateDisconnect();
        }

        /**
         * Disconnects the current ICWS session, if any, clears any ICWS session credentials, and moves to the connect page.
         */
        exports.disconnect = function () {
            var session = icwsDirectUsageExample.session;

            // Perform the actual ICWS disconnect operation.
            session.icwsDisconnect();

            // If a disconnect was requested, don't display connection status.
            setConnectionStatusMessage(false, '');

            validateAuthentication();
        };

        /**
         * Connection state changed message processing callback.
         * @param {String} reason The reason for the disconnect.
         */
        function disconnectCallback(reason) {
            var applicationModel = icwsDirectUsageExample.applicationModel;

            // Notify application model pages that the ICWS connection was lost.
            applicationModel.disconnect();

            // Update the display to show a reason for the disconnect.
            setConnectionStatusMessage(false, reason);

            // Switch to the connect application page.
            applicationModel.showApplicationPage(exports.CONNECT_PAGE_ID);
        }

        /**
         * Updates the interface to reflect the current connection attempt state.
         * @param {Boolean} isWorking Indicates whether to show that the connection is in progress.
         * @param {String} [opt_message] A message to display for the connection state.
         */
        function setConnectionStatusMessage(isWorking, opt_message) {
            var utilities = icwsDirectUsageExample.utilities;
            var applicationModel = icwsDirectUsageExample.applicationModel;
            var workingElement, messageElement;

            workingElement = document.getElementById(CONNECTION_WORKING_ELEMENT_ID);
            messageElement = document.getElementById(CONNECTION_MESSAGE_ELEMENT_ID);

            // For user experience, show a working indicator, if requested.
            if (!isWorking) {
                utilities.addClass(workingElement, applicationModel.CSS_CLASS_HIDDEN);
            } else {
                utilities.removeClass(workingElement, applicationModel.CSS_CLASS_HIDDEN);
            }

            // Display a connection status message, if provided.
            if (opt_message) {
                messageElement.innerHTML = utilities.escapeHtml(opt_message);
                utilities.removeClass(messageElement, applicationModel.CSS_CLASS_HIDDEN);
            } else {
                messageElement.innerHTML = '';
                utilities.addClass(messageElement, applicationModel.CSS_CLASS_HIDDEN);
            }
        }

        //
        // Persist connection form values.
        //

        var STORAGE_SETTING_REMEMBER = 'ININ-ICWS-DIRECT-USAGE-EXAMPLE-CONNECTIONFORM-REMEMBER';
        var STORAGE_SETTING_SERVER_NAME = 'ININ-ICWS-DIRECT-USAGE-EXAMPLE-CONNECTIONFORM-SERVER';
        var STORAGE_SETTING_USER_ID = 'ININ-ICWS-DIRECT-USAGE-EXAMPLE-CONNECTIONFORM-USER';

        /**
         * Stores connection form values for later use.
         * @param {String} icwsServer The server name where ICWS is available.
         * @param {String} icwsUser The IC user name with which to connect.
         * @param {Boolean} remember Indicates whether to persist the values across browser sessions.
         */
        function storeConnectionFormValues(icwsServer, icwsUser, remember) {
            if (!!localStorage) {
                localStorage[STORAGE_SETTING_REMEMBER] = remember;

                // If the user chose to 'remember' the connection form server and user values,
                // persist the values to localStorage; otherwise, use sessionStorage and clear
                // out any previously persisted localStorage values.
                if (remember) {
                    localStorage[STORAGE_SETTING_SERVER_NAME] = icwsServer;
                    localStorage[STORAGE_SETTING_USER_ID] = icwsUser;
                } else {
                    sessionStorage[STORAGE_SETTING_SERVER_NAME] = icwsServer;
                    sessionStorage[STORAGE_SETTING_USER_ID] = icwsUser;

                    localStorage.removeItem(STORAGE_SETTING_SERVER_NAME);
                    localStorage.removeItem(STORAGE_SETTING_USER_ID);
                }
            }
        }

        /**
         * The result of {@link retrieveConnectionFormValues}.
         * @private
         * @typedef connectionFormValues
         * @type {Object}
         * @property {Boolean} remember true if the connection form server/user values should be remembered.
         * @property {String} icwsServer The connection form server value.
         * @property {String} icwsUser The connection form user value.
         */

        /**
         * Retrieves connection form values, if any were stored.
         * @returns {connectionFormValues} The connection form values.
         */
        function retrieveConnectionFormValues() {
            var rememberValue, icwsServerValue, icwsUserValue;

            if (!!localStorage) {
                // Attempt to get persisted values from localStorage first,
                // then fallback to sessionStorage.
                rememberValue = localStorage[STORAGE_SETTING_REMEMBER] === 'true';

                icwsServerValue = localStorage[STORAGE_SETTING_SERVER_NAME];
                icwsUserValue = localStorage[STORAGE_SETTING_USER_ID];
                if (icwsServerValue === undefined || icwsServerValue === '') {
                    icwsServerValue = sessionStorage[STORAGE_SETTING_SERVER_NAME];
                    icwsUserValue = sessionStorage[STORAGE_SETTING_USER_ID];
                }
            }

            return {
                remember: rememberValue,
                icwsServer: icwsServerValue,
                icwsUser: icwsUserValue
            };
        }

        // Register this application page, with the page functions wired up where they are needed.
        applicationExports.applicationModel.registerApplicationPage({
            // The HTML element ID of the page, which is also used as the page ID.
            pageId: exports.CONNECT_PAGE_ID,

            // This page should not be published to the page list.
            shouldBePublished: false,

            // Performs one time page initialization.
            initialize: initialize
        });

        return exports;
    }(applicationExports.connectPage || {}));

    return applicationExports;
}(icwsDirectUsageExample || {}));