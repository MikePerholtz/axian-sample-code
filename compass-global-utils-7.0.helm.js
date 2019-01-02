if (typeof Compass === "undefined") {
    Compass = {};
}
Compass.Global = Compass.Global || {};
Compass.Global.Xhr = Compass.Global.Xhr || {};
Compass.Utils = Compass.Utils || {};
Compass.Lookup = Compass.Lookup || {};

window.location.hash = window.location.hash;

(function (compass, $, window, undefined) {
    
    // * local scope namespacing and decrease verbosity of code
    var global = Compass.Global;
    var utils = Compass.Utils;
    var lookup = Compass.Lookup;  //store hashtables and dictionary (Keyvalue, pair).
    

    
    /* * * P R I V A T E    P R O P E R T I E S * * */
    var errorList = [];
    
    
    /* * * P U B L I C   P R O P E R T I E S * * */

    global.isDOMLoaded = false; //If true, then $(document).ready must have already fired.

    

    global.saveOnErrorSettings = null; //Save default (Original) javascipt window.onerror settings in this property.

    // * This generic object will store the to be sent to Compass.Global.Xhr.post
    // * to post Xhr request to webservice
    global.Xhr.getNewSendRequest = function() {
        return {
            url: null,
            //data: null, -- Cannot use data as a property name for xhr, it get's erased
            xhrData: null,
            callingFunction: null,
            showProgress: false,
            redirectAfterProgressComplete: false,
            failureCallBackFunction: null
        }
    }
  

    /* * *  P R I V A T E   M E T H O D S * * */

    // * More than one error may occur
    function getErrorInfoObject() {
        return {
            Message: "A JavaScript error has occured inside Compass.",
            UserId: null,
            LoanSkey: null,
            FileName: null,
            LineNo: null,
            ColNo: null,
            XhrUrl: null,
            XhrData: null,
            Error: null,
            ExceptionType: null,
            StackTrace: null,
            CallingFunction: null,
            Misc: null,
            isXhrError: false, // Error source is Xhr (ie. jquery ajax) or JavaScript (ie. window onerror)
            BrowserInfo: null,
            Url: null
        }
    }

    // * Check if browser is ie7 by looking for the specific element with class ie7_DocMode (see RMCompassMasterPage)
    function isThisBrowserIE7() {
        return $("#IE7_DocMode").length > 0 ? true : false;
    }

    function getLoanSkey() {
        return $("#LoanSkeyWrapper_global input[type='hidden']").val();
    }

    function getUserId() {
        return $("#UserIDWrapper_global input[type='hidden']").val();
    }

    function getParentUserId() {
        return $("#ParentUserIDWrapper_global input[type='hidden']").val();
    }

    function getBrowserInfo() {
        return $("#BrowserInfoWrapper_global input[type='hidden']").val();
    }

    function getIsReadyOnlyMode() {
        var readOnly = $("#ReadOnlyWrapper_global input[type='hidden']").val().toLowerCase();
        try {
            readOnly = eval(readOnly);
        }
        catch (e) {
            readOnly = false;  //read only mode is off by default
        }
        return readOnly;
    }

    function getIsInternetExplorer() {
        var isIE = $("#IsInternetExplorerWrapper_global input[type='hidden']").val();
        return isIE === "True";

    }

    // * Return true if loan selected.  Certain parts of the helm do not need to waste resources
    // * loading based on this value.
    function loanSelected() {
        var isLoanSel = null;
        var loanSkey = getLoanSkey();
        if (typeof loanSkey === "undefined" || loanSkey === null || isNaN(loanSkey) || parseInt(loanSkey) <= 0) {
            isLoanSel = false;
        } else {
            isLoanSel = true;
        }

        return isLoanSel;
    }


    // * 
    function logAnyExistingJavaScriptErrors() {
        for (var i = 0; i < errorList.length; i++) {
            if (errorList[i] !== null) {
                global.Xhr.logError(errorList[i]);
            }
        }

    }

    /* * *  P U B L I C   M E T H O D S * * */

    // * Send error info to the server for database and/or email logging *//
    global.Xhr.logError = function (JsError) {
        var success = true;
        var helmRequestComplete = new $.Deferred();
        
        JsError.UserId = global.userId;
        JsError.LoanSkey = global.loanSkey;
        JsError.BrowserInfo = global.browserInfo;

        var xhr_postData = "{'jsError':" + JSON.stringify(JsError) + "}";
        
        var xhr_url = "/Webservice/Helm.asmx/JavaScriptError_Log";

        $.ajax({
            type: "POST",
            url: xhr_url,
            headers: { 'CurrentUrl': '' + document.URL + '' },
            data: xhr_postData,
            contentType: "application/json; charset=utf-8",
            dataType: "json"
        }).fail(function (result, errorType, exception) {

            success = false;
        }); //

        helmRequestComplete.resolve(success);
        
        return helmRequestComplete;

    }

    // * global handling of JavaScript's window.onerror event *//
    global.jsWindowOnError = function (message, filename, lineno, colno, error) {

        
        var Error = getErrorInfoObject(); //get a fresh clean error object to populate and toss on the error list array.
        Error.Message = message;
        Error.FileName = filename;
        Error.LineNo = lineno;
        Error.ColNo = colno;
        Error.Url = document.URL;
        

        //not available in IE < 11
        if (typeof error !== 'undefined' && error !== null) {
            Error.Error = error.message;
            Error.StackTrace = error.stack;
        } else {
            Error.Error = "Not available in ie7 ECMAScript 3.";
            Error.StackTrace = "Not available in ie7 ECMAScript 3.";
        }

        if (global.isDOMLoaded) {  //When the DOM Is loaded we know the userId, browserInfo, etc. from the hidden fields on master pages.
            global.Xhr.logError(Error);  
        } else {
            errorList.push(Error);  //DOM Is not loaded so temporarily store the error until the DOM is loaded.
            
        }

        //Compass.Global.Xhr.logError();

    }

    global.saveOnErrorSettings = window.onerror;

    window.onerror = global.jsWindowOnError;

    // * Generic jQuery XMLHttpRequest function with some extras like disable/enable Compass progress spinner during request.
    global.Xhr.post = function (xhr) {

        return $.ajax({
            type: "POST",
            url: xhr.url,
            headers: { 'CurrentUrl': '' + document.URL + '' },
            data: xhr.xhrData,
            contentType: "application/json; charset=utf-8",
            dataType: "json",
            beforeSend: function () {
                if (xhr.showProgress) {
                    progressSpinner.ajaxProgressBegin();
                }
            }
        })
        .always(function () {
            if (xhr.showProgress && !xhr.redirectAfterProgressComplete) {
                //MP: Because of the response.redirect for ex. after selecting recently viewed loans, the progress spinnner
                //would disappear too soon.  Keep the progress spinner up there until the redirect is complete. 
                //That is why redirectAfterProgressComplete is implemented, to prevent the progress spinner from
                //disappearing too soon.
                progressSpinner.ajaxProgressEnd();
            }
        })
        .fail(function (result, errorType, exception) {
            
            var Error = getErrorInfoObject(); //get a fresh clean error object to populate and toss on the error list array.
            var isErrorLoggedSuccessfully = false;
            Error.CallingFunction = xhr.callingFunction;
            Error.XhrUrl = xhr.url;
            Error.XhrData = xhr.xhrData;
            Error.isXhrError = true;

            try {

                var response = jQuery.parseJSON(result.responseText);
                Error.ExceptionType = response.ExceptionType;
                Error.StackTrace = response.StackTrace;
                Error.Message = response.Message;
                global.Xhr.logError(Error).promise().done(function (isSuccess) {
                    // * execute a callback function to further customize the way the error is handled.
                    isErrorLoggedSuccessfully = isSuccess;
                });
            } catch (ex) {
                /*  either their was an error parsing the JSON response to the Xhr request 
                    or their was an javascript error inside global.Xhr.logError();  We
                    could handle the error further here by displaying the details to the
                    user to read to customer support since no email (logged) exception exists.
                    Perhpase a "to do" item.  
                */
                // * execute a callback function to further customize the way the error is handled.
                if (xhr.failureCallBackFunction !== null) {
                    xhr.failureCallBackFunction(isErrorLoggedSuccessfully, Error, ex);
                    xhr.failureCallBackFunction = null;  //ensure we don't call the failure callback function again in the finally {} block 
                    
                }
            } finally {
                // * execute a callback function to further customize the way the error is handled.
                if (xhr.failureCallBackFunction !== null) {
                    xhr.failureCallBackFunction(isErrorLoggedSuccessfully, Error, null);
                }
            }
        });
    }


    // * FUNCTION: global.Xhr.responseHandler 
    // * The XMLHttpRequest (XHR) Jquery Ajax functions from the Browser (client) communicate with
    // * C# webservices (.asmx) and [WebMethod]'s.  I created an Xhr Response object which holds the 
    // * server side result of the commnication. This response object gets sent back back down to the 
    // * client browser where it can be processed here in this responseHanlder function.  Usually, the 
    // * response indicates wether the request was successful and if not holds the messages of any 
    // * failed validations.  As of 2/19/2016 this response object used to hold any exception/error info.
    // * but that has since been replaced with a custom error handling routing that was created in this js 
    // * library during the construction of new dashboard (aka helm).
    global.Xhr.responseHandler = function (xhrResponse) {
        var deferred = new $.Deferred();
        /* * * *  2015_07_07 MP - Disable custom handling of exceptions until dashboard  is complete.  Below code 
                             commented.
        * */
        
        
        if (!xhrResponse.Success) {
            var invalidMsgHTML = "";
            //var validationElement = $("#SomeElementDivUsedToDisplayItems");
              //ResetValidation();
        //    if (xhrResponse.IsException) {
        //        $(xhrResponse.ExceptionResults).each(function (i, ExceptionItem) {
        //            invalidMsgHTML = '<span class="failureMsg">{0}</option>';
        //            invalidMsgHTML = invalidMsgHTML.replace('{0}', ExceptionItem.Message);
        //            $(validationElement).append(invalidMsgHTML);
        //        });
        //    }
            if (xhrResponse.IsValid === false) {

                $(xhrResponse.ValidationResults).each(function(i, InvalidItem) {
                    invalidMsgHTML = '<span class="failureMsg">{0}</option>';
                    invalidMsgHTML = invalidMsgHTML.replace('{0}', InvalidItem.Description);
                    //$(validationElement).append(invalidMsgHTML);
                });
            }
        }

        //make sure user can see the failed validation messages
        //ShowValidation(true);
        deferred.resolve();
        return deferred.promise();
    }
    /* * * * */


    /* Set the value of an Infragistics Ignite UI igCombo.  Pass the jquery object reference to igcombo and "skey" or "value") */
    utils.igCombo_SetByValue = function ($igComboCtrl, value) {
        //2015_02_05 MP : When igCombo nullText option was set to show "required" watermaek (to indicated required field to user),
        //just setting the "value" by typeSkey caused the selected "text" to appear like the watermark CSS style (italic light grey)
        //until the combo recevied the focus.  To fix I incorported the method which doubly sets the combo, first by typeskey (value),
        //then by "index".

        if ($igComboCtrl.length > 0) {
            if (typeof value == 'undefined' || value === null) {
                value = -1; //set combo to nothing selected 
                $igComboCtrl.igCombo("selectedIndex", value);  //set the selected index to itself.
            }
            else {
                $igComboCtrl.igCombo("value", value);
                var index = $igComboCtrl.igCombo("selectedIndex");
                $igComboCtrl.igCombo("selectedIndex", index);  //set the selected index to itself.
            }
        }
    };

    /* Get the value of an Infragistics Ignite UI igCombo.  Pass the jquery object reference to igcombo and "skey" or "value") */
    utils.igCombo_GetByValue = function(igComboCtrlId) {
        var index, item, itemValue;  //aka The Key

        if (typeof igComboCtrlId !== 'undefined' && igComboCtrlId != null) {
            var igComboCtrlIdFormatted = "#" + igComboCtrlId;
            var $igComboCtrl = $(igComboCtrlIdFormatted);
            

            if ($igComboCtrl.length > 0) {  //was the ctrl found in DOM
                index = $igComboCtrl.igCombo("selectedIndex");
                if (index !== -1) {
                    item = $igComboCtrl.igCombo("itemByIndex", index); //get the selected item object using the index
                    itemValue = item.value;
                }
            }
        }

        return (typeof itemValue === typeof undefined) ? null : itemValue;
    }

    // * pass in the jquery tab id (string without "# and get back it's index.  This rely's on the 
    // * global compass class ".displayNone" to be present as how the jquery tab was hidden.
    utils.jQueryTabs_GetTabIndex = function(tabToSearchForId, tabGroupToSearchId ) {
        var index = null;
        var tabNotFoundConst = -1;
        var $tabToSearchFor = $("#" + tabToSearchForId);
        var $tabGroupToSearch = $("#" + tabGroupToSearchId + " .ui-tabs-nav");
        if ($tabToSearchFor.length > 0 && $tabGroupToSearch.length > 0) {
            index = $tabGroupToSearch.children().index($tabToSearchFor);
        }
        return index; //null if tabId does not exist and -1 if it was not visible;
    }

    // * Users with Read Only roll assigned, should have certain  
    // * Controls available to them. By giving the control a custom attribute name
    // * of compass-read-only-ignore="true", the read onlyness will be gone.
    utils.readOnlyIgnore_SetControls = function() {
        if (global.isReadOnlyMode) {
            setTimeout(function() {  //a slight delay will ensure the control is enabled and not overriden by subsequently executed code that disables the control. 
                var $controlsToIgnore = $("[compass-read-only-ignore=true]");
                $controlsToIgnore.each(function () {
                    if ($(this).is("span")) {
                        // asp.net radio buttons are placed within span elements when rendered.  
                        // The read only span element gets the ignore read only mode attribute when rendered.
                        // Drill down to get the input type radio and ensure it is not disabled.
                        $(this).find('input:radio').attr("disabled", false);
                    }
                    else {
                        $(this).attr("disabled", false);
                    }
                });
            });
        }
    };
    
    // * NOTE: by setting below properties to return value of a function() 
    // * the function only needs to execute once.
    global.isDOMLoaded = true;
    global.isThisBrowserIE7 = isThisBrowserIE7();
    global.isLoanSelected = loanSelected();
    global.loanSkey = (global.isLoanSelected) ? getLoanSkey() : null;
    global.userId = getUserId();
    global.parentUserId = getParentUserId();
    global.browserInfo = getBrowserInfo();
    global.isInternetExplorer = getIsInternetExplorer();
    global.isReadOnlyMode = getIsReadyOnlyMode();


    /* * * * L o o k u p   T a b l e: BEGIN * * */

    lookup.BorrowerType = {
        Borrower: { key: 10, value: "Borrower" },
        CoBorrower: { key: 20, value: "CoBorrower" },
        AlternateContact: { key: 30, value: "AlternateContact" },
        EligibleNonBorrowingSpouse: { key: 190, value: "EligibleNonBorrowingSpouse" },
        IneligibleNonBorrowingSpouse : { key: 240, value: "IneligibleNonBorrowingSpouse" },
        NonBorrowingHouseholdMember : { key: 230, value: "NonBorrowingHouseholdMember" },
        NotSet: { key: 0, value: "NotSet" }
    };

    /* * * * L o o k u p   T a b l e: END * * */
        
    logAnyExistingJavaScriptErrors();

    // * * * * * DOM READY EVENT * * * * * * //
    $(document).ready(function () {
        Sys.Application.add_load(ajax_load);
        utils.readOnlyIgnore_SetControls();
    });

    function ajax_load() {
        
        if (global.isInternetExplorer === false) {
            //addCustomTextAreaPasteEventHandler();
        }

        utils.readOnlyIgnore_SetControls();
    }

    

})(Compass, jQuery, window);


//// * * * POLYFILL (provide some newer ECMAScript functionality to old Legacy IE)

//Array Filter() is not available pre ECMA 5 so build our own if filter does not exists
if (!Array.prototype.filter) {
    Array.prototype.filter = function (fun /*, thisp */) {
        "use strict";

        if (this == null) {
            throw new TypeError();
        }
        var t = Object(this);
        var len = t.length >>> 0;
        if (typeof fun != "function")
            throw new TypeError();

        var res = [];
        var thisp = arguments[1];
        for (var i = 0; i < len; i++) {
            if (i in t) {
                var val = t[i]; // in case fun mutates this
                if (fun.call(thisp, val, i, t))
                    res.push(val);
            }
        }

        return res;
    };
}

// Production steps of ECMA-262, Edition 5, 15.4.4.14
// Reference: http://es5.github.io/#x15.4.4.14
if (!Array.prototype.indexOf) {
    Array.prototype.indexOf = function(searchElement, fromIndex) {

        var k;

        // 1. Let o be the result of calling ToObject passing
        //    the this value as the argument.
        if (this == null) {
            throw new TypeError('"this" is null or not defined');
        }

        var o = Object(this);

        // 2. Let lenValue be the result of calling the Get
        //    internal method of o with the argument "length".
        // 3. Let len be ToUint32(lenValue).
        var len = o.length >>> 0;

        // 4. If len is 0, return -1.
        if (len === 0) {
            return -1;
        }

        // 5. If argument fromIndex was passed let n be
        //    ToInteger(fromIndex); else let n be 0.
        var n = +fromIndex || 0;

        if (Math.abs(n) === Infinity) {
            n = 0;
        }

        // 6. If n >= len, return -1.
        if (n >= len) {
            return -1;
        }

        // 7. If n >= 0, then Let k be n.
        // 8. Else, n<0, Let k be len - abs(n).
        //    If k is less than 0, then let k be 0.
        k = Math.max(n >= 0 ? n : len - Math.abs(n), 0);

        // 9. Repeat, while k < len
        while (k < len) {
            // a. Let Pk be ToString(k).
            //   This is implicit for LHS operands of the in operator
            // b. Let kPresent be the result of calling the
            //    HasProperty internal method of o with argument Pk.
            //   This step can be combined with c
            // c. If kPresent is true, then
            //    i.  Let elementK be the result of calling the Get
            //        internal method of o with the argument ToString(k).
            //   ii.  Let same be the result of applying the
            //        Strict Equality Comparison Algorithm to
            //        searchElement and elementK.
            //  iii.  If same is true, return k.
            if (k in o && o[k] === searchElement) {
                return k;
            }
            k++;
        }
        return -1;
    };
}

// * * * Array.prototype.find()
if (!Array.prototype.find) {
    Array.prototype.find = function (predicate) {
        if (this === null) {
            throw new TypeError('Array.prototype.find called on null or undefined');
        }
        if (typeof predicate !== 'function') {
            throw new TypeError('predicate must be a function');
        }
        var list = Object(this);
        var length = list.length >>> 0;
        var thisArg = arguments[1];
        var value;

        for (var i = 0; i < length; i++) {
            value = list[i];
            if (predicate.call(thisArg, value, i, list)) {
                return value;
            }
        }
        return undefined;
    };
}

// * * * Array.prototype.findIndex()
if (!Array.prototype.findIndex) {
    Array.prototype.findIndex = function (predicate) {
        if (this === null) {
            throw new TypeError('Array.prototype.findIndex called on null or undefined');
        }
        if (typeof predicate !== 'function') {
            throw new TypeError('predicate must be a function');
        }
        var list = Object(this);
        var length = list.length >>> 0;
        var thisArg = arguments[1];
        var value;

        for (var i = 0; i < length; i++) {
            value = list[i];
            if (predicate.call(thisArg, value, i, list)) {
                return i;
            }
        }
        return -1;
    };
}
