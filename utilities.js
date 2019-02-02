var icwsDirectUsageExample = (function (applicationExports) {
    'use strict';
    
    //
    // Namespace providing common utility operations.
    // 
    // This example application does not rely on any framework (e.g. jQuery), which would usually
    // provide this sort of functionality.  These simple implementations are sufficient to support
    // this example application, but not generally resilient across a wide variety of browser verions.
    //
    applicationExports.utilities = (function (exports) {
        /**
         * Escapes text to make it safe for embedding in HTML.
         * @param {String} text The HTML to escape.
         * @returns {String} The escaped text.
         */
        exports.escapeHtml = function(text) {
            return text.replace(/&/g, '&amp;')
                       .replace(/</g, '&lt;')
                       .replace(/>/g, '&gt;')
                       .replace(/"/g, '&quot;')
                       .replace(/'/g, '&#039;');
        };
        
        /**
         * Determines whether an element has the specified CSS class.
         * @param {Object} element The element to test.
         * @param {String} name The CSS class to test.
         * @returns {Boolean} true if the element has the specified CSS class; otherwise, false.
         */
        exports.hasClass = function(element, name) {
            return new RegExp('(\\s|^)' + name + '(\\s|$)').test(element.className);
        };
        
        /**
         * Adds the specified CSS class to the element, if not already present.
         * @param {Object} element The element to modify.
         * @param {String} name The CSS class to add.
         */
        exports.addClass = function(element, name) {
            if (!exports.hasClass(element, name)) {
                element.className += (element.className ? ' ' : '') + name;
            }
        };

        /**
         * Removes the specified CSS class from the element, if present.
         * @param {Object} element The element to modify.
         * @param {String} name The CSS class to remove.
         */
        exports.removeClass = function(element, name) {
            if (exports.hasClass(element, name)) {
                element.className = element.className.replace(new RegExp('(\\s|^)' + name + '(\\s|$)'),' ').replace(/^\s+|\s+$/g, '');
            }
        };
        
        /**
         * Determines whether an http status code is in the successful range (200-299).
         * @param {Number} statusCode The status code to check.
         * @returns {Boolean} true if the statusCode represents a success.
         */
        exports.isSuccessStatus = function(statusCode){
            return ((statusCode >= 200) && (statusCode <= 299));
        };
        
        /**
         * Adds an event listener to the specified element.
         * @param {Object} element The element to which to add an event listener.
         * @param {String} eventName The name of the event, without the 'on' prefix.
         * @param {Object} eventHandler The event handling function.
         */
        exports.bindEvent = function(element, eventName, eventHandler) {
            if (element.addEventListener) {
                element.addEventListener(eventName, eventHandler, false); 
            } else if (element.attachEvent) {
                element.attachEvent('on' + eventName, eventHandler);
            }
        };

        /**
         * Finds all elements with the specified class.
         * @param {String} className The name of the class to search for matching elements.
         * @returns {Object} Array of matching elements.
         */
        exports.getElementsByClassName = function(className) {
            var result, elements, i, j;
            
            if (document.getElementsByClassName) {
                result = document.getElementsByClassName(className);
            } else {
                if (document.all) {
                    elements = document.all;
                } else {
                    elements = document.getElementsByTagName('*');
                }
             
                result = [];
                for (i = 0, j = elements.length; i < j; i++) {
                    if (exports.hasClass(elements[i], className)) {
                        result.push(elements[i]);
                    }
                }
            }
            
            return result;
        };

        /**
         * Determines whether the specified object has any properties.  Can be used to see if an map collection is empty.
         * @param {Object} object The JSON to be syntax highlighted.
         * @returns {Boolean} true if the object has properties; otherwise, false.
         */
        exports.hasProperties = function(object) {
            var property;
            
            for (property in object) {
                if (object.hasOwnProperty(property)) {
                    return true;
                }
            }
            
            return false;
        };
        
        /**
         * Merges the properties of {@param object2} into {@param object1}.
         * @param {Object} object1 The object to be updated.
         * @param {Object} object2 The object whose properties should be merged into {@param object1}.
         */
        exports.applyObjectChanges = function(object1, object2) {
            var property;
            
            for (property in object2) {
                if (object2.hasOwnProperty(property)) {
                    object1[property] = object2[property];
                }
            }
        };
        
        /**
         * Performs simple syntax highlighting for the provided JSON.
         * @param {Object|String} json The JSON to be syntax highlighted.
         * @returns {String} The highlighted text.
         */
        exports.syntaxHighlight = function(json) {
            var cls;
            
            if (typeof json !== 'string') {
                 json = JSON.stringify(json, null, 2);
            }
            json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
                cls = 'json-number';
                if (/^"/.test(match)) {
                    if (/:$/.test(match)) {
                        cls = 'json-key';
                    } else {
                        cls = 'json-string';
                    }
                } else if (/true|false/.test(match)) {
                    cls = 'json-boolean';
                } else if (/null/.test(match)) {
                    cls = 'json-null';
                }
                return '<span class="' + cls + '">' + match + '</span>';
            });
        };
        
        return exports;
    } (applicationExports.utilities || {}));

    return applicationExports;
} (icwsDirectUsageExample || {}));