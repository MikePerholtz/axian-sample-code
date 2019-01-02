/**
 * activitySpin_And_BlockUI.js
 * mPerholtz
 */
//This displays a progress spinner indicating to the user that activity is happening.
//The activity spinner is javascript by spin.js and can be customized with a graphical UI here>>> http://fgnass.github.com/spin.js/
//The blockUI jquery plugin backs the progress spinner and overlays the entire screen 
//blocking the user from interfacing with any buttons etc. in the background while the server is processing the request.
//BlockUI has more info here >>>> http://jquery.malsup.com/block/

//Compass = Compass || {};
//Compass.progressSpinner = new ProgressSpinner();

var progressSpinner = new ProgressSpinner();


(function ($) {
    $(document).ready(function () {
        progressSpinner.initialize();
    });
})(jQuery);

ProgressSpinner.prototype.initialize = function() {
    //initialize ajax event handlers
    progressSpinner.prm.add_initializeRequest(this.ajaxProgressBegin);
    progressSpinner.prm.add_endRequest(this.ajaxProgressEnd);
}

ProgressSpinner.prototype.ajaxProgressBegin = function () {
    ////console.log("AjaxProgressBegin");
    //wait a few milliseconds to show the spinner as some operations will execute quickly and 
    //flickering a spinner on the screen could get annoying.
    progressSpinner.waitUntilProgressSpinnerDisplay = window.setTimeout(progressSpinner.go, 420);
    
    progressSpinner.blockTimeout = window.setTimeout(progressSpinner.ajaxProgressEnd, 69000); //Set spinner timout max display time: 69 seconds
}

ProgressSpinner.prototype.ajaxProgressEnd = function () {
    $.unblockUI();
    clearTimeout(progressSpinner.blockTimeout);
    clearTimeout(progressSpinner.waitUntilProgressSpinnerDisplay);
}

ProgressSpinner.prototype.blockUI = function() {
    $.blockUI({
        message: progressSpinner.$progressLoadWrapper,
        css: { border: 'none' },
        overlayCSS: { backgroundColor: '#efefef', opacity: .4 },
        //baseZ: 2000000000, //this value interfered with the Infragistics Server Side Calendar Control
        baseZ: 1999889,
        fadeIn: 200,
        fadeOut: 200,
        onBlock: progressSpinner.showSpinner,
        onUnblock: progressSpinner.hideSpinner
    });
}

ProgressSpinner.prototype.showSpinner = function () {

    progressSpinner.$spinnerContainer.fadeIn(250).toggleClass("displayNone", false);

    var target = document.getElementById('activityLoad');

    // Instances of spinner (spin.js) can build up when consecutive back to back 
    // calls are made to activitySpin_And_BlockUi.js > "activityLoad()".  
    if ($("div.BT18261_Main").length !== 0) {
        $("div.spinner").remove();
    }

    progressSpinner.spinner.spin(target);
}

ProgressSpinner.prototype.hideSpinner = function () {

    //$("div#ProgressLoadContainer .spinner").remove();
    if (typeof progressSpinner.spinner === "undefined" || progressSpinner.spinner === null) {
        //spinner is not defined because the page loaded fast enough that showSpinner() was never called
    }
    else {
        progressSpinner.spinner.stop();
    }

    progressSpinner.$spinnerContainer.toggleClass("displayNone", true).removeAttr("style");
    
}


ProgressSpinner.prototype.go = function () {
    //console.log("activityLoad() - Begin");
    
    if (progressSpinner.$progressLoadWrapper.length === 0) { //does not exist - can get deleted by blockui
        progressSpinner.$progressLoadContainer.html(progressSpinner.$progressLoadReference.data('progressLoad'));
    }

    progressSpinner.blockUI();
    

    /* * Important * */
    //  Copy the div.progressLoadWrapper and store it as jquery.data() inisde the div element "StoreProgressLoadReferenceHere"
    //  which is located on the master page markup.  The reason for this is that BlockUI can delete the element passed as the 
    //  "message" option if multiple BlockUI's get called consecutively. If the "message" element does get deleted by BlockUI, 
    //  we can then restore the copy from backup.
    progressSpinner.$progressLoadReference.data("progressLoad", progressSpinner.$progressLoadContainer.html());

    
};


function ProgressSpinner() {

    this.prm = Sys.WebForms.PageRequestManager.getInstance();
    this.blockTimeout = null; //
    this.waitUntilProgressSpinnerDisplay = null;

    this.$progressLoadWrapper = $("div.progressLoadWrapper")[0];
    this.$progressLoadReference = $("#StoreProgressLoadReferenceHere");
    
    /* * Important * */
    //  Copy the div.progressLoadWrapper and store it as jquery.data() inisde the div element "StoreProgressLoadReferenceHere"
    //  which is located on the master page markup.  The reason for this is that BlockUI can delete the element passed as the 
    //  "message" option if multiple BlockUI's get called consecutively. If the "message" element does get deleted by BlockUI, 
    //  we can then restore the copy from backup.
    this.$progressLoadContainer = $("#ProgressLoadContainer");
    this.$progressLoadReference.data("progressLoad", this.$progressLoadContainer.html());

    this.$spinnerContainer = $(".spinnerContainer");

    /* Set Options for spin.js progress spinner*/
    this.spinnerOptions = {
        lines: 13, // The number of lines to draw
        length: 0, // The length of each line
        //width: 11, // The line thickness
        //radius: 21, // The radius of the inner circle
        width: 10, // The line thickness
        radius: 20, // The radius of the inner circle
        corners: 1, // Corner roundness (0..1)
        rotate: 32, // The rotation offset
        color: '#ffffff', // #rgb or #rrggbb
        speed: 0.8, // Rounds per second
        trail: 75, // Afterglow percentage
        shadow: false, // Whether to render a shadow
        hwaccel: true, // Whether to use hardware acceleration
        className: 'spinner', // The CSS class to assign to the spinner
        zIndex: 2e8, // The z-index (defaults to 2000000000)
        top: 'auto', // Top position relative to parent in px
        left: 'auto' // Left position relative to parent in px
    };

    this.spinner = new Spinner(this.spinnerOptions);  //Create the spinner rom spin.js

}


 
