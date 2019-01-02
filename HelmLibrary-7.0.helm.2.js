//set our Libarary Namespace
//var Compass = Compass || {};
Compass.Helm = Compass.Helm || {};


(function(helm, window, $, undefined) { ////ensure ECMA Script 3 (IE7) undefined is really undefined

    /* * *  P R I V A T E   P R O P E R T I E S * * */

    var $auditTrackingDataDetached,
        $auditTrackingDataContainer,
        $loanDetailsDataContainer,
        $loanDetailsDataDetached;


    /* Lookup for Loan Contact Type */
    //var myArray = [
    //    { id: 10, contactType: 'Borrower' },
    //    { id: 20, contactType: 'Co-Borrower' },
    //    { id: 30, contactType: 'Alternate Contact' },
    //    { id: 40, contactType: 'Eligble Non-Borrowing Spouse' }

    //];

    /* * *  P U B L I C  P R O P E R T I E S * * */
    helm.xhr = helm.xhr || {}; //create a namespace for xhr requests to web services
    helm.LoanContacts = {};

    helm.igGrid_Intervals = {};
    helm.igGrid_Intervals.Audit = {};
    helm.ProgressSpinner = {};
    helm.ProgressSpinner.Spinners = [];
    helm.ProgressSpinner.Options = {
        lines: 13, // The number of lines to draw
        length: 0, // The length of each line
        //width: 11, // The line thickness
        //radius: 21, // The radius of the inner circle
        width: 10, // The line thickness
        radius: 20, // The radius of the inner circle
        corners: 1, // Corner roundness (0..1)
        rotate: 32, // The rotation offset
        color: '#67686D', // #rgb or #rrggbb
        speed: 0.8, // Rounds per second
        trail: 55, // Afterglow percentage
        shadow: false, // Whether to render a shadow
        hwaccel: true, // Whether to use hardware acceleration
        className: 'spinner_helm', // The CSS class to assign to the spinner
        zIndex: 0,
        top: 'auto', // Top position relative to parent in px
        left: 'auto' // Left position relative to parent in px
    }
    
    helm.HasAuditTrackingData = false;
    helm.HasRecentlyViewedData = false;
    helm.HasLoanDetailsData = false;
    helm.LoanDetailsData = null; //This will hold loan details data from xhr request to web service.
    helm.AuditTrackingData = null;
    helm.RecentlyViewedData = null;
    helm.QuickSearchOptionsData = null;
    helm.RefreshHelmDataAfterUpdatePanelPostBack = true;
    helm.LoanSubStatusWasJustChanged = false; //This flag is used to enusre the greenAlert background color for Loan Substatus Changed/Saved will show for the user after the alerthelpbubbles are reset.
    

    helm.quickSearchAllOrgsByDefault = null;
    helm.alreadyInitialized = false; //When we first bind ajax add_load eventhandler to handle update panel refreshes for helm, it fires the ajax_load event right away.  This switch prevents the helm ajax_load function from firing the helm.initilize event twice.
    helm.ActiveTabId = "";
    helm.DisplayMode = $("#DisplayModeWrapper_helm input[type='hidden']");

    helm.LoanContactsListWidth = $("#LoanContactsListContainer_helm").css("width");

    // * * * Q u i c k  S e a r c h  * * * * //
    helm.QuickSearch = (function() {

        //* * constructor
        function QuickSearch(searchText, stateAbbreviation, subStatusTypeSkey, searchAllOrgs) {
            this.currentSearch = _getQuickSearchObject();
            this.currentSearch.searchText = searchText;
            this.currentSearch.stateAbbreviation = stateAbbreviation;
            this.currentSearch.subStatusTypeSkey = subStatusTypeSkey;
            this.currentSearch.searchAllOrgs = searchAllOrgs;
         
            _init();

        }

        //* * private variables * * * //
       
        //* the following manages the recent quick searches tha
        var recentSearches = {
            all: [],
            forCurrentUser: [],
            maxRecentSearchesToStore: 10,  //store only this number of recent searches per parent user in cookie
            // * Get recentSearches for all corresponding users (parent and sso users) from the browser 
            // * cookies (if any).  If there is not cookies for saved quick searches, then start fresh.
            getAll: function() {
                var recentQuickSearches = Cookies.get('recentQuickSearches');
                //if (recentQuickSearches === null || typeof recentQuickSearches === 'undefined') {
                //    recentQuickSearches = [];
                //}
                return (recentQuickSearches) ? JSON.parse(recentQuickSearches) : [];
            },
            // * Look for parent user id inside the top level array that was restored from cookies
            // * if there is none, then then the current user (or if applicable, parent user of current user)
            // * has no saved recent quick searches
            getForCurrentUser: function() {
                var currentUsersRecentSearches = recentSearches.getByUserId(Compass.Global.parentUserId);
                return currentUsersRecentSearches;
            },
            //* Search the top level array of recent quick searches for the parent user
            //  return the result array, otherwise (if no searches exist for this user) 
            //  return an new empty top level user array object.
            getByUserId: function(parentUserId) {
                var result = recentSearches.all.find(function(searchItem) {
                    return searchItem.parentUserId === parentUserId;
                });

                return result ? result : recentSearches.getUserSearchObject();
            },
            getUserSearchObject: function() {
                return {
                    parentUserId: Compass.Global.parentUserId, //saved recent quick searches are specific to the parentuserid of user who is logged in
                    QuickSearches: [] //This will hold array of recent quick search objects
                }
            },

            //make sure the current quick search is not already in the stored recent searches under the parent user account.
            removeDuplicateEntries: function (searchToDeDup) {

                var thisUsersSearches = recentSearches.forCurrentUser.QuickSearches;
               
                for (var i = 0, len = thisUsersSearches.length; i < len; i++) {
                    if (thisUsersSearches[i] !== null && typeof thisUsersSearches[i] !== 'undefined') {
                        if (thisUsersSearches[i].searchText === searchToDeDup.searchText &&
                            thisUsersSearches[i].stateAbbreviation === searchToDeDup.stateAbbreviation &&
                            thisUsersSearches[i].searchAllOrgs === searchToDeDup.searchAllOrgs &&
                            thisUsersSearches[i].subStatusTypeSkey === searchToDeDup.subStatusTypeSkey) {
                            //this is a duplicate; remove it.
                            thisUsersSearches.splice(i, 1);
                            //i--;
                        }
                    }
                }

                return thisUsersSearches;
            },
            findIndexOfParentUsersRecentSearches: function(parentUserId) {
                recentSearches.all.findIndex(function(searchItem) {
                    return searchItem.parentUserId == parentUserId;
                });
            },
            save: function() {  //privately scoped save recent quick search
                //if we called this function with js .apply or .call 
                //  (for ex.quickSearch.recentQuickSearchs.save().call(quickSearch))
                //then "this" keyword would scope the QuickSearch object itself otherwise this would scope 
                //to this object
                recentSearches.removeDuplicateEntries(this.currentSearch);
                recentSearches.forCurrentUser.QuickSearches.splice(0, 0, this.currentSearch); //remove needless past recent searches that match this recent search and then insert this recent search at the top of the list as it is the most recent.
                //var indexOfParentUsersRecentSearches = recentSearches.findIndexOfParentUsersRecentSearches(Compass.Global.parentUserId);

                var indexOfParentUsersRecentSearches = recentSearches.all.findIndex(function (searchItem) {
                    return searchItem.parentUserId == Compass.Global.parentUserId;
                });

                if (indexOfParentUsersRecentSearches > -1) { //found parent users recent searches, overwrite it
                    recentSearches.all.splice(indexOfParentUsersRecentSearches, 1);
                    recentSearches.all.push(recentSearches.forCurrentUser);
                } else {
                    recentSearches.all.push(recentSearches.forCurrentUser);
                }

                //keep looping and removing older recent serach items until the max number of recent searches is reached.
                for (; recentSearches.forCurrentUser.QuickSearches.length > recentSearches.maxRecentSearchesToStore; recentSearches.forCurrentUser.QuickSearches.pop()) { }
                
                helm.QuickSearch.recentSearchIndex = 1;  //reset the counter so the next time user wants to restore previous search criteria, it will start with the one previous to  this current search that was just added to the top of the array.

                Cookies.set('recentQuickSearches', JSON.stringify(recentSearches.all), { expires: 365 });

            }

        }
        
        ////* * private methods * * * //
        
        function _init() {
            recentSearches.all = recentSearches.getAll();
            recentSearches.forCurrentUser = recentSearches.getForCurrentUser();
            //Store users current search criteria (the search critera they just keyed in) 
            //so it can be saved to cookies
        }

        function _getQuickSearchObject() {
            return {
                userId: Compass.Global.userId,
                searchText: "",
                stateAbbreviation: null,
                searchAllOrgs: false,
                subStatusTypeSkey: null
            }
        }

        QuickSearch.prototype = {
            // * These properties are applicable to Json stringify > xhr requests
            toJSON: function() {
                return {
                    "UserId": Compass.Global.userId,
                    "SearchText": this.currentSearch.searchText,
                    "StateAbbreviation": this.currentSearch.stateAbbreviation,
                    "SubStatusTypeSkey": this.currentSearch.subStatusTypeSkey,
                    "SearchAllOrgs": this.currentSearch.searchAllOrgs
                }
            },
            recentSearches: {
                save: function() {
                    recentSearches.save.call(this); //call private method and appy context of "this"

                },
                getPrevious: function () {  //user just hit back button next to quick search search text box.  Restore previous quick search criteria (if any).
                    //console.log(recentSearches.all);
                    var recentQuickSearches = recentSearches.forCurrentUser.QuickSearches;
                    var quickSearchToRestore = null;
                    if (typeof recentQuickSearches != "undefined" &&
                               recentQuickSearches.length > 0) {
                        var i = helm.QuickSearch.recentSearchIndex;
                        helm.QuickSearch.recentSearchIndex = (i >= recentQuickSearches.length-1) ? 0 : i + 1;
                        
                        quickSearchToRestore = _getQuickSearchObject();
                        quickSearchToRestore.searchText = recentQuickSearches[i].searchText;
                        quickSearchToRestore.stateAbbreviation = recentQuickSearches[i].stateAbbreviation;
                        quickSearchToRestore.subStatusTypeSkey = recentQuickSearches[i].subStatusTypeSkey;
                        quickSearchToRestore.searchAllOrgs = recentQuickSearches[i].searchAllOrgs;
                        
                    }
                    return quickSearchToRestore;
                },
                currentIndex: 0 //current index of the recent quick search that was previously restored
            }
        }

        return QuickSearch;

    })();

    helm.QuickSearch.recentSearchIndex = 0;  //static variable counter for storing the index of the previously restored recent search in the array of recent quick searches.
    
    
    /* * *  P R I V A T E   M E T H O D S * * */

    // * The user has selected a different jquery tab in the helm
    var jQueryTabs_TabSelect = function(event, ui) {

        helm.hideHelpPopOvers();

        helm.ActiveTabId = ui.newTab.attr("id");

        if (helm.ActiveTabId !== null) {
            switch (helm.ActiveTabId) {
                case "RecentlyViewedTab_helm":
                    //* Lazy Load the Recently Viewed Data.  
                    // * Only get/display the Recently Viewed data when the user clicks on the Recently Viewed tab.
                    if (!helm.HasRecentlyViewedData) {

                        //Note: per ie7 choppy rendering, the progress spinner was pre-started and is already running
                        helm.xhr.getRecentlyViewedLoans().promise().done(function(success) {
                            if (success) {

                                if (helm.RecentlyViewedData.RecentlyViewedLoans != null && helm.RecentlyViewedData.RecentlyViewedLoans.length > 0) {
                                    helm.recentlyViewed_igGrid_DataBind(helm.RecentlyViewedData.RecentlyViewedLoans);
                                    $("#RecentlyViewedListContainer_helm").toggleClass("displayNone", false);
                                    $("#RecentlyViewedNoResultsWrapper_helm").toggleClass("displayNone", true);
                                } else {
                                    helm.recentlyViewed_NoResultsDisplay();
                                }

                                helm.HasRecentlyViewedData = true;

                                // * If browser not IE7 Hack: 
                                // * iggrid readjusts height when rendering the recently viewed data which causes annoying flicker
                                // * Force setting the height before the rendering and iggrid makes it's final adjustsment
                                $(".BT18261_Main #RecentlyViewedTabContent_helm .ui-iggrid-scrolldiv").css("height", "225px");

                                showProgressSpinner(false, "#RecentlyViewedTabContent_helm");
                                
                            }
                        });

                        
                    }
                    
                    

                    if (Compass.Global.isLoanSelected && helm.DisplayMode !== "QuickSearchRecentlyViewedOnly") { //a setting/check for is in iquote mode would be better here.
                        helm.showBasicLoanDetailsInPageHeader(true);
                    }
                    break;
                case "AuditTrackingTab_helm":
                    //* Lazy Load the Audit Tracking Data.  
                    // * Only get/display the Audit Track data when the user clicks on the audit tracking tab.
                    if (!helm.HasAuditTrackingData) {
                        //Note: per ie7 choppy rendering, the progress spinner was pre-started and is already running
                        helm.xhr.getAuditTracking().promise().done(function(success) {
                            if (success) {
                                helm.HasAuditTrackingData = true;
                                //$(".consoleLogOutput").append('<div class="consoleLog_helm">xhresponse success = true;</div>');
                                //Is there any audit tracking data to display?
                                if (helm.AuditTrackingData.AuditTrackingList != null && helm.AuditTrackingData.AuditTrackingList.length > 0) {
                                    //$(".consoleLogOutput").append('<div class="consoleLog_helm">Audit Tracking Data Exists in client.</div>');
                                    helm.auditTracking_igGrid_DataBind(helm.AuditTrackingData.AuditTrackingList);
                                    //$(".consoleLogOutput").append('<div class="consoleLog_helm">Audit Tracking Grid DataBind Completed.</div>');
                                    $("#AuditTrackingResultsListContainer_helm").toggleClass("displayNone", false);
                                    $("#AuditTrackingNoResultsWrapper_helm").toggleClass("displayNone", true);

                                } else {
                                    helm.auditTracking_NoResultsDisplay();
                                }
                                // * If browser is NOT IE7 Hack: 
                                // * iggrid readjusts height when rendering the audit tracking data which causes annoying flicker
                                // * Force setting the height before the rendering and iggrid makes it's final adjustsment
                                $(".BT18261_Main #AuditTrackingContentTab_helm .ui-iggrid-scrolldiv").css("height", "205px");

                                helm.showMoreData_Initialize();

                                showProgressSpinner(false, "#AuditTrackingContentTab_helm");
                            }
                        });

                    }

                    //if ($auditTrackingDataDetached != null) {
                    //    $auditTrackingDataDetached.appendTo($auditTrackingDataContainer).promise().done(function() {
                    //        $auditTrackingDataDetached = null;
                    //    });
                    //    helm.showMoreData_Initialize();
                    //}
                    helm.showBasicLoanDetailsInPageHeader(true);
                    break;
                case "LoanDetailsTab_helm":
                    if ($loanDetailsDataDetached != null) {
                        $loanDetailsDataDetached.appendTo($loanDetailsDataContainer).promise().done(function() {
                            $loanDetailsDataDetached = null;
                        });
                    }
                    helm.showBasicLoanDetailsInPageHeader(false);
                    break;
                case "QuickSearchRecentlyViewedOnly":

                    if (Compass.Global.isLoanSelected && helm.DisplayMode !== "QuickSearchRecentlyViewedOnly") { //a setting/check for is in iquote mode would be better here.
                        helm.showBasicLoanDetailsInPageHeader(true);
                    }
                    break;
            }
        }
    }

    //assign individual helm help bubble html templates
    var setHelpContentByElementID = function() {
        var helpElement = $(this);
        var $helpElement = $("#" + helpElement.attr('id') + "_template");
        var html = "";
        if ($helpElement.length !== 0) {
            html = $helpElement[0].outerHTML;
        } else {
            //$(".consoleLogOutput").append('<div class="consoleLog_helm">#' + helpElement.attr('id') + '_template not found!!.</div>');
        }

        return html;

    }

    // * The user has just selected a Loan from the Quick Search Results List
    // * This function is shared between the pagetabs that use iggrid to display
    //*  a list of loans (ie Quick Search and Recently Viewed)
    var loanSelect = function(evt, ui) {
        var loanSkey = ui.rowKey;

        //get the iggrid entire selected loan record object of the currently active page tab.
        var selectedLoanRecord = {};
        if (helm.ActiveTabId === "QuickSearchResultsTab_helm") {
            selectedLoanRecord = $("#QuickSearchResults_igGrid").igGrid("findRecordByKey", loanSkey);
        } else if (helm.ActiveTabId === "RecentlyViewedTab_helm") {
            selectedLoanRecord = $("#RecentlyViewed_igGrid").igGrid("findRecordByKey", loanSkey);
        }

        //go select the loan by packinging up the important info about the selected loan
        //and forcing a postback to asp.net helm.ascx.cs codebehind
        if (typeof selectedLoanRecord !== 'undefined' && selectedLoanRecord != null) {

            var postData = "{'userId':" + JSON.stringify(selectedLoanRecord.UserId) +
                ",'loanSkey':" + JSON.stringify(selectedLoanRecord.LoanSkey) +
                "}";


            //$(".consoleLogOutput").append('<div class="userHitBackButton">User Hit Back Button</div><br />');
            $("#UserHitBackButtonWrapper_helm input[type='hidden']").val("true");

            progressSpinner.ajaxProgressBegin();
            __doPostBack('QuickSearchLoan_Click', postData);
        }
    }

    // * Event handler that is called when update panel finishes firing.  We need
    // * to refresh the data on the helm and rebind the jquery events when this happens.
    function ajax_Load() {
        //$(".consoleLogOutput").append('<div class="consoleLog_helm">ajax_Load() event starting.</div>');
        
        if (helm.alreadyInitialized && helm.RefreshHelmDataAfterUpdatePanelPostBack) {
            helm.jQueryBindEvents();
            helm.Initialize(true); //true -> because this is after ajax request
        } else {
            //reset the refresh overrides
            helm.alreadyInitialized = true;
            helm.RefreshHelmDataAfterUpdatePanelPostBack = true;
        }
    
    }

    // * Show or hide the helm by toggle fading an opaque light gray overlay 
    // * that spans the width and height of the entire helm
    function helm_show(show) {

        //var helmRequestComplete = new $.Deferred();

        var $blockTheWholeHelm = $("#HelmContent_BlockUI");
        var $helmWrapper = $("#HelmWrapper");

        if (show) {
            //Fade Helm Into by fading out a opaque gray div that overlays the entire helm.

            $blockTheWholeHelm.fadeOut(420, function() {
                //$helmWrapper.toggleClass("helmSetHeight", false);
            });

        } else { //hide
            $blockTheWholeHelm.fadeIn(420, function() {
                //$helmWrapper.toggleClass("helmSetHeight", true);
            });
        }

        //helmRequestComplete.resolve();
        //return helmRequestComplete.promise();

    }


    function intializeHelpPopOverItems() {
        // * * Initialize Infragistics Popover based Click Me For Help
        // Check to see if already initialized or a javascript error will occur if trying to 
        //reinitialize.  Had to use this for update panel end request after partial post back.
        var $igPopOvers = $('#HelmContainer .clickMeForHelp_helm');
        if (typeof $igPopOvers.data("igPopover") === 'undefined' ||
            $igPopOvers.data("igPopover") === null) {

            $igPopOvers.igPopover({
                direction: "auto",
                position: "start",
                maxWidth: "350px",
                maxHeight: "400px",
                animationDuration: 150,
                contentTemplate: setHelpContentByElementID,
                headerTemplate: {
                    closeButton: true
                },
                showOn: "click",
                showing: customizeQuickSearchHelpBubble /*More IE7 hacks to get help bubble contents looking good  */
            });
        }

    }

    function customizeQuickSearchHelpBubble(evt, ui) {
        if (Compass.Global.isThisBrowserIE7) {
            $(".helpBubbleBulletedList.helm").css("margin", "5px, 0px, 5px, 15px ");
            $("#QuickSearchHelpBubbleIcon_helm").css("margin-left", "50px");
        }
        if (helm.QuickSearchOptionsData.ShowAllOrgsQuickSearchOption) {
            $("#QuickSearchAllOrgsHelpBubbleArea").toggleClass("displayNone", false);
        }
    }

    //* This will reset the Alert Help Bubbles By Hiding them all first and then showing the ones we need.
    //* This was for when the update panel finshed refresh and the alert help bubbles may have changed 
    // * since they were last rendered.
    function alertHelpBubbles_DisableAll() {
        $("#HelmContainer .alertPopover_helm").toggleClass("displayNone", true);
        $("#HelmContainer .redAlert").toggleClass("redAlert", false);
        $("#HelmContainer .yellowAlert").toggleClass("yellowAlert", false);

        ////////////////
        $("#HelmContainer .greenAlert").toggleClass("greenAlert", false);
        // mPerholtz: A Green alert is shown in the loan substatus row when loan substatus is changed by the user in helm.
        //            Then a refresh of the helm is called for loan substatus change to check if  we should show the mail envelope 
        //            next to messages for new mail related to substatus change.  Since greenAlerts are only shown for loan substatus and loan 
        //            status change, then there is no need to reset them here because it will just erase the green alert for loan
        //            sub status change which we need to the user to see so they are aware that the substatus was changed successfully.
        if (helm.LoanSubStatusWasJustChanged) {
            $("#ChangeLoanSubstatus_helm").toggleClass("greenAlert", true);
            helm.LoanSubStatusWasJustChanged = false; //reset this flag
        }
        ///////////////
        
        $("#HelmContainer .yellowredAlert").toggleClass("yellowredAlert", false);
    }

    function showQuickSearchArea() {
        //Once the quick search feature is initialized and ready to display, then show it.
        //Otherwise unattractive empty elements appear when the page loads, so these are 
        //kept hidden until it's ready for display.
        $("#QuickSearch_BlockUI_helm").toggleClass("displayNone", true);
        $("#QuickSearchHelpPopover_helm").toggleClass("displayNone", false);

    }

    function initializeQuickSearch() {
        //$(".consoleLogOutput").append('<div class="consoleLog_helm">initializeQuickSearch() starting.</div>');
        //Show clear button to clear search text except if IE7. IE has it's own built in clear text button inside textbox. We disable this for IE
        var helmRequestComplete = new $.Deferred();
        var searchTextButtonType = Compass.Global.isThisBrowserIE7 ? null : "clear";

        $("#QuickSearchTextBox_helm").igTextEditor({
            nullText: "Loan Quick Search",
            keydown: quickSearchTextBox_KeyDown,
            button: searchTextButtonType,
            width: 395 //#IE7_DocMode #QuickSearchTextBoxWrapper_helm in Helm.css must reflect this value for ie7
        });

        $("#QuickSearchSubStatusCombo_helm").igCombo({
            nullText: "All Loan Sub-Status",
            dataSource: helm.QuickSearchOptionsData.LoanSubStatuses,
            valueKey: "LoanSubStatusSkey",
            textKey: "LoanSubStatusDesc",
            dropDownAsChild: true,
            dropDownOnFocus: true, /* Show drop down options when the ignite ui combo gets focus */
            width: 140,
            height: 18
        });

        $("#QuickSearchStateCombo_helm").igCombo({
            nullText: "All U.S. States",
            dataSource: helm.QuickSearchOptionsData.States,
            valueKey: "Key",
            textKey: "Value",
            dropDownAsChild: true,
            dropDownOnFocus: true, /* Show drop down options when the ignite ui combo gets focus */
            height: 18
        });

        var $AllOrgsCombo = $("#QuickSearchOrgCombo_helm");
        $AllOrgsCombo.igCombo({
            nullText: "My Org",
            dataSource: helm.QuickSearchOptionsData.OrgFilters,
            valueKey: "Key",
            textKey: "Value",
            dropDownAsChild: true,
            autoComplete: false,
            dropDownOnFocus: true, /* Show drop down options when the ignite ui combo gets focus */
            mode: "dropdown", //disable search on the fly dropdown for small number of list items
            enableActiveItem: true,
            enableClearButton: false, //Bug where clearing the value does not properly work with helm.saveQuickSearchOrgsValue()
            width: 70,
            height: 18,
            selectionChanged: helm.saveQuickSearchOrgsValue
            //button: searchTextButtonType,
            //focus: quickSearchTextBoxFocusEvent_helm,
            //blur: quickSearchTextBoxBlurEvent_helm
        });

        //Users with only one user account (no SSO accounts) are not able to 
        //sees the all orgs quicksearch combo option
        var $AllOrgsComboArea = $("#QuickSearchOrgComboArea_helm");
        if (helm.QuickSearchOptionsData.ShowAllOrgsQuickSearchOption) {
            //show the All Orgs combo and restore the default setting from cookies (if exists)
            $AllOrgsComboArea.toggleClass("displayNone", false);
            helm.setQuickSearchOrgsComboValueToDefault();
        } else {
            $AllOrgsComboArea.toggleClass("displayNone", true);
            Compass.Utils.igCombo_SetByValue($AllOrgsCombo, false);
            helm.quickSearchAllOrgsByDefault = false;
        }


        helmRequestComplete.resolve(true);
        return helmRequestComplete.promise();

    }

    // * show/hide the correct page tabs depending on the screen and if the user is in a loan 
    function pageTabs_helm_set(mode) {

        var defaultTab = "";

        if (mode === "loanDetails") {
            $("#RecentlyViewedTab_helm").toggleClass("displayNone", false);
            $("#LoanDetailsTab_helm").toggleClass("displayNone", false);
            $("#AuditTrackingTab_helm").toggleClass("displayNone", false);
            $("#AdvancedSearchTab_helm").toggleClass("displayNone", true);
            defaultTab = "LoanDetailsTab_helm";
        } else if (mode === "search") {
            $("#RecentlyViewedTab_helm").toggleClass("displayNone", false);
            $("#AdvancedSearchTab_helm").toggleClass("displayNone", false);
            $("#LoanDetailsTab_helm").toggleClass("displayNone", true);
            $("#AuditTrackingTab_helm").toggleClass("displayNone", true);
            defaultTab = "AdvancedSearchTab_helm";
        }
        else if (mode === "recentlyViewedMinimized") {
            //only show recently viewed tab and disable the tab selected appearance and give it a neutral look.
            $("#RecentlyViewedTab_helm").toggleClass("displayNone", false).toggleClass("ui-state-active", false);
            $("#AdvancedSearchTab_helm").toggleClass("displayNone", true);
            $("#LoanDetailsTab_helm").toggleClass("displayNone", true);
            $("#AuditTrackingTab_helm").toggleClass("displayNone", true);
        }
        helm.ActiveTabId = defaultTab; //store the active tab in js property that will be accessible to other functions

        var $helmTabs = $("#Tabs_helm");
        $helmTabs.tabs({
        //    //active: Compass.Utils.jQueryTabs_GetTabIndex(defaultTab, "Tabs_helm"), //Activate Loan Details Tab
        //    //beforeActivate: optimizeIE7Rendering,
              activate: jQueryTabs_TabSelect
        });

        //set active jquery page tab to helm default tab.
        var activeTabIndex = Compass.Utils.jQueryTabs_GetTabIndex(defaultTab, "Tabs_helm");
        $helmTabs.tabs({ active: activeTabIndex });
        $("#Tabs_HtmlList_helm").toggleClass("displayNone", false);
        
        // All Tab Content Area Div's had to be hidden initially otherwise
        // the screen would jumble around during rendering until the jquery 
        // page tabs could be intialized. Unhide the tab content with this next line of code.
        $(".jqPageTabsContent_helm").toggleClass("displayNone", false);
    }

    // * Show the custom progress spinner specific to the helm region
    function quickSearchResults_NoResultsDisplay() {
        $("#QuickSearchResultsListContainer_helm").toggleClass("displayNone", true);
        $("#QuickSearchNoResultsWrapper_helm").toggleClass("displayNone", false);
    }


    //* ABOUT THE HELM PROGRESS SPINNER:
    //* Some panels in the helm need their own progress spinner (ie. lazy loading the 
    //* the audit tracking data once the user clicks on the corresponding jquery tab)
    //* To facilitate this, an array of progress spinner objects is created and assigned 
    //* a string id based on the parent css selector and the progress spinner objects.
    
    function getSpinnerObject() {
        return {
            id: null,
            Spinner: {}
        }
    }

    function getSpinnerById(id) {
        var result = helm.ProgressSpinner.Spinners.filter(function(spinner) {
            return spinner.id == id;
        });

        return result ? result[0] : null;  
    }

    // * Show the custom progress spinner specific to the helm region
    function showProgressSpinner(show, targetJqueryTabId) {
        var $targetTab = $(targetJqueryTabId);
        var $progressArea = $($targetTab).find(".progressArea_helm");
        var $progressSpinner = $($targetTab).find(".spinner_helm");
        //find spinner in array for this helm jquery page tab
        var SpinnerObj = getSpinnerById(targetJqueryTabId);
        if (show) {
            //find spinner in array for this helm jquery page tab
            
            $progressSpinner.remove(); //remove any peviously defined spinners in this page tab
            
            if (SpinnerObj == null) {
                //spinner for this tab not created yet so create it a
                //and add it to the array of spinners
                SpinnerObj = getSpinnerObject();
                SpinnerObj.id = targetJqueryTabId;
                SpinnerObj.Spinner = new Spinner(helm.ProgressSpinner.Options).spin();
                helm.ProgressSpinner.Spinners.push(SpinnerObj);

            } else {
                SpinnerObj.Spinner.spin();
            }

            $progressArea.append(SpinnerObj.Spinner.el);
            $progressArea.fadeIn(420);

        } else { //hide spinner and unblock helm ui
            $progressArea.fadeOut(420); 
            if (SpinnerObj === null) {

            } else {
                SpinnerObj.Spinner.stop();
            }
            setThemeColors();//Elements are not visible to jquery and company skin/theme color can't be set until they are.
        }
    }
    
    //showProgressSpinner(true, "#HelmContent_BlockUI");

    // * Gather All Quick Search Options specified by user and place 
    // * inside our QuickSearchOptions_helm js object
    function quickSearchOptions_GetUserDefinedValues() {

        //Gather Quick Search Options
        var searchText = $("#QuickSearchTextBox_helm").igTextEditor("text").trim();
        var stateAbbreviation = Compass.Utils.igCombo_GetByValue("QuickSearchStateCombo_helm");
        var subStatusTypeSkey = Compass.Utils.igCombo_GetByValue("QuickSearchSubStatusCombo_helm");

        //If the user has access to search all orgs then get their filter criteria from 
        //the quick search all orgs drop down.  Otherwise, do not search all orgs.
        var allOrgs = false;
        if (helm.QuickSearchOptionsData.ShowAllOrgsQuickSearchOption) {
            allOrgs = Compass.Utils.igCombo_GetByValue("QuickSearchOrgCombo_helm");
        }
        /* */

        var searchAllOrgs = (allOrgs == null) ? false : allOrgs; //if null default to false

        return new helm.QuickSearch(searchText, stateAbbreviation, subStatusTypeSkey, searchAllOrgs);

    }

    function quickSearchResults_show(show) {
        var $searchResultsTab = $("#QuickSearchResultsTab_helm");
        var isResultsAlreadyVisible = $searchResultsTab.is(":visible");
        if (show) {
            $searchResultsTab.toggleClass("displayNone", false);
            $("#Tabs_helm").tabs("option", "active", Compass.Utils.jQueryTabs_GetTabIndex("QuickSearchResultsTab_helm", "Tabs_helm"));
        } else {
            $searchResultsTab.toggleClass("displayNone", true);
        }
    }

    // * The user has just clicked the quick search button to conduct a search
    function quickSearchButton_click() {
        //Begin Search Animation
        var $quickSearchResultsListWrapper = $("#QuickSearchResultsListWrapper_helm");
        var $quickSearchProgressLoaderWrapper = $("#QuickSearchProgressLoaderWrapper_helm");
        quickSearchResults_show(true);
        showProgressSpinner(true, "#QuickSearchResultsContentTab_helm");
        var quickSearch = quickSearchOptions_GetUserDefinedValues();  //Gather the search options specified by user and package them in QuickSearchOptions_helm javascript object
        quickSearch.recentSearches.save.call(quickSearch);  //save the quick search in recent quick searches
        //
        helm.xhr.getQuickSearchResults(quickSearch.toJSON()).promise().done(function() {
            showProgressSpinner(false,"#QuickSearchResultsContentTab_helm");
        });
        if (Compass.Global.isLoanSelected && helm.DisplayMode !== "QuickSearchRecentlyViewedOnly") { //a setting/check for is in iquote mode would be better here.
            helm.showBasicLoanDetailsInPageHeader(true);
        }
    }

    // * The user hit the back button next to the quick search box.
    // * Restore the previous quick search critera from quick search history
    function recentQuickSearchBackButton_click() {
        var quickSearch = new helm.QuickSearch();
        var restoreSearch = quickSearch.recentSearches.getPrevious.call(quickSearch);
        if (restoreSearch != null) {
            var $QuickSearchTextBox_helm = $("#QuickSearchTextBox_helm");

            //Infragistics igniteUI igTextEditor text box displays the recent Quick Search text as faded gray - italic.  Fix This here.
            $QuickSearchTextBox_helm.toggleClass("ui-igedit-nullvalue", false); 
            

            $QuickSearchTextBox_helm.igTextEditor("text", restoreSearch.searchText);
            Compass.Utils.igCombo_SetByValue($("#QuickSearchStateCombo_helm"), restoreSearch.stateAbbreviation);
            Compass.Utils.igCombo_SetByValue($("#QuickSearchSubStatusCombo_helm"), restoreSearch.subStatusTypeSkey);
            Compass.Utils.igCombo_SetByValue($("#QuickSearchOrgCombo_helm"), restoreSearch.searchAllOrgs);
        }

        
    }
   

    function quickSearchTextBox_KeyDown(evt, ui) {
        if (ui.key === 13) { //enter key
            quickSearchButton_click();
        }
    };

    /* Drop css class indicators on the first and last cells so the
       rows can be highlighted cleaner by applying colored borders to the left of the first
       cell and the right of the last cell. */
    function cssLabelFirstAndLastCellsInDataRow() {
        $("table.helm_data tr.data_R0w td:first-child").toggleClass("firstCell", true);
        $("table.helm_data tr.data_R0w td:last-child").toggleClass("lastCell", true);
    }

    function setThemeColors() {
        //$("#HelmContainer .ui-iggrid-headertext").toggleClass("pwHeaderLabel", true);
        $("#HelmContainer .ui-iggrid-header").toggleClass("HeaderBackGround", true);
    }

    /*
    * /* * * M a l i h u   j Q u e r y   C u s t o m   C o n t e n t   S c r o l l e r : BEGIN * * */
    function setCustomScrollBars() {
        /* * * M a l i h u   j Q u e r y   C u s t o m   C o n t e n t   S c r o l l e r : BEGIN * * */
        /*http://manos.malihu.gr/jquery-custom-content-scroller/*/
        //$(".consoleLogOutput").append('<div class="consoleLog_helm">$(window).load() event starting.</div>');
        if (Compass.Global.isInternetExplorer === false) {
            $("#LoanDatesPanelContent_helm").mCustomScrollbar({
                theme: "dark",
                alwaysShowScrollbar: 0, //Disable scrolll bar when there’s nothing to scroll.
                //scrollbarPosition: "outside",
                snapAmount: 26,
                snapOffset: 3,
                mouseWheel: {
                    deltaFactor: 28,
                    normalizeDelta: false
                },
                callbacks: {
                    onScrollStart: function () {
                        Compass.Helm.hideHelpPopOvers();
                    }
                },
                scrollInertia: 500

            });
            $("#LoanContactsListContainer_helm").mCustomScrollbar({
                theme: "dark",
                alwaysShowScrollbar: 0, //Disable scrolll bar when there’s nothing to scroll.
                //scrollbarPosition: "outside",
                snapAmount: 26,
                snapOffset: 3,
                mouseWheel: {
                    deltaFactor: 28,
                    normalizeDelta: false
                },
                scrollInertia: 500

            });
        }
        /*  * * M a l i h u   j Q u e r y   C u s t o m   C o n t e n t   S c r o l l e r : END * * */
    }

    //Add a class called showAltRowColors to a table and the row colors will 
    //alternate with the below function if the <tr> elements have a .data_R0w class.
    function alternateRowColorsForDataGrids() {

        var deferred = $.Deferred();

        var tablesToalternateRowColor = $("#HelmContainer table.helm_data.showAltRowColors");
        // var dataRowsToAlt = $("#FAContainer table.fa_data tr.data_R0w");
        var dataRowsToAlt;
        //var rowCount = 1;
        var useAltColor = false;  //false: do not alternate color first row. Start on #2

        tablesToalternateRowColor.each(function () {
            useAltColor = false;  //reset the row color when starting on a new table.
            dataRowsToAlt = $(this).find("tr.data_R0w");
            //dataRowsToAlt = $(this).attr("id")+" tr.data_R0w";
            dataRowsToAlt.each(function () {
                if (useAltColor) {
                    $(this).toggleClass("alternateRowColor", true);
                    useAltColor = false;
                }
                else {
                    useAltColor = true;
                }

            });
        });

        return deferred.promise();

    }

    // * Return true if on the compass home screen.  
    // * This also affects what helm panels will load.
    function isUserAtHomeScreen() {
        var $homeScreenContainer = $("#HomeScreenContainer");
        var isHomeScreen = null;
        if ($homeScreenContainer.length === 0) {
            isHomeScreen = false;
        } else {
            isHomeScreen = true;
        }

        return isHomeScreen;
    }

    function optimizeIE7Rendering(event, ui) {

        //$(".consoleLogOutput").append('<div class="consoleLog_helm">Optimize IE7 Rendering </div>');

        if (Compass.Global.IsBrowserIE7) {

            //ui will contain data if a new tab is selected by user
            //otherwise this is just initializing the optimization
            if (typeof ui !== "undefined" && ui != null) {
                var oldTabId = ui.oldPanel.attr("id"); //The old Tab User is currently on
                //var newTabId = ui.newPanel.attr("id"); //The new Tab User is switching to

                switch (oldTabId) {
                    case "AuditTrackingContentTab_helm":
                        $auditTrackingDataDetached = $auditTrackingDataContainer.children().detach();
                    case "LoanDetailsTabContent_helm":
                        $loanDetailsDataDetached = $loanDetailsDataContainer.children().detach();
                }
            } else { //initilizing ie7 tab optimiziation
                if (Compass.Global.isloanSelected) {
                    $auditTrackingDataContainer = $("#AuditTrackingResultsListContainer_helm");
                    $auditTrackingDataDetached = $auditTrackingDataContainer.children().detach();
                    $loanDetailsDataContainer = $("#LoanDetailsWrapper_Helm");

                    // * No need to detach loan details content (code below) because it is the active tab
                    // * when a loan is selected and the page first loads.
                    // * $loanDetailsDataDetached = $loanDetailsDataContainer.children().detach();
                }
            }

        }


    }

    /* * *  P U B L I C   M E T H O D S * * */

    // * The user has selected wether or not to filter all orgs or my orgs when conducting a loan quick search.
    // * Save The value they selected in a cookie
    helm.saveQuickSearchOrgsValue = function() {
        helm.quickSearchAllOrgsByDefault = Compass.Utils.igCombo_GetByValue("QuickSearchOrgCombo_helm"); //This igCombo is programmed to store true / false values to indiciate wether or not to (searchAllOrgs?)
        Cookies.set('quickSearchAllOrgsByDefault', helm.quickSearchAllOrgsByDefault, { expires: 365 }); //Create an expiring cookie, valid to the path of the current page:
    }

    helm.showBasicLoanDetailsInPageHeader = function(show) {
        var $loanHeaderInfo = $("#tbLoanInfo");
        if (show) {
            $loanHeaderInfo.fadeIn(200);
        } else {
            $loanHeaderInfo.fadeOut(200);
        }
    }

    // * Set the quick search My Orgs value to the default boolean value.  
    // * First, We will look in the cookies for the saved setting (which
    // * was the value that the user had selected last).  If there
    // * is no cookie then create one and initialize it to system default.
    helm.setQuickSearchOrgsComboValueToDefault = function() {
        if (helm.quickSearchAllOrgsByDefault === null) { //if null then we have not set the helm.quickSearchAllOrgsByDefault value yet.
            helm.quickSearchAllOrgsByDefault = true;  //All Orgs is the default
            var allOrgs = Cookies.get('quickSearchAllOrgsByDefault');
            if (allOrgs !== null && typeof allOrgs !== 'undefined') {
                //helm.quickSearchAllOrgsByDefault = (allOrgs == "true" ) ? true : false;
                helm.quickSearchAllOrgsByDefault = allOrgs;
            } else { //Cookie does not exist, create one
                Cookies.set('quickSearchAllOrgsByDefault', helm.quickSearchAllOrgsByDefault, { expires: 365 }); //Create an expiring cookie, valid to the path of the current page:
            }
            Compass.Utils.igCombo_SetByValue($("#QuickSearchOrgCombo_helm"), helm.quickSearchAllOrgsByDefault); //show "Alls Org" as default for Org Filter.  This igCombo is programmed to store true / false values to indiciate wether or not to (searchAllOrgs?)
        }
    }
   
    // * Hide all lingering help popovers after switching page tabs, etc.
    helm.hideHelpPopOvers = function () {
        //make sure popovers exist first before attempting to hide
        if (typeof $('.clickMeForHelp_helm').data("igPopover") !== 'undefined' &&
            $('.clickMeForHelp_helm').data("igPopover") !== null) {
            $(".clickMeForHelp_helm").igPopover("hide");
        }
    }

    // * Custom Error Handling for failed XMLHttpRequest attempts
    // * Note: compass-global-utils.js first handles the error, attempts
    // * to log it, then callbacks this function for final customized error
    // * handling where we would need to indicate to the user that they
    //* are not able to see the dashboard because of a general failure.
    helm.handleXhrFailureCustom = function (isErrorLoggedSuccessfully, jsErrorDetails, logFailureDetails) {

        var failMessage = "The Compass dashboard did not load because a failure occured while accessing the server.  " +
            "Refreshing the page may solve the issue, however if the problem persists please contact Technical Support " +
            "by email at support@rmcompass.com or by phone (561) 623-1083. 8am to 8pm (EST) M-F.  ";

        
            
        if (isErrorLoggedSuccessfully) {
            failMessage += "The details of the error were logged successfully and sent to Technical Support.";
        } else {
            failMessage += "An unsuccessful attempt was made to log the details of the error. Contacting Technical Support is advised. ";
            // Show basic javascript details occured.  logFailureDetails is the try catch block exception
            if (typeof logFailureDetails !== "undefined" && logFailureDetails !== null) {
                //var logFailureMessage = "<br /><br />The reason the error was not logged was:<br /><br />" + logFailureDetails.message;
                //"<br /><br />The error Message was :<br /><br />" + jsErrorDetails.Message;
            }
           
        }

        var $errorArea = $(".jsFailureArea_helm");
        var $errorText = $(".jsFailureArea_helm .failText_helm");
        $errorText.text(failMessage);
        $errorArea.toggleClass("displayNone", false);
    }

    // * Format a jquery objects value so it can be displayed correctly
    // * ex. => set null values to display empty text not "null";
    helm.formatText = function (value) {
        value = (value === '1/1/0001') ? "" : value; //if this date shows up, it is the default date in asp.net when the code does not account for dbnull.  
        return $.trim(value); //set null values to display empty text not "null";
    }

    // * Initilize Show more or less list based data by expanding/shrinking helm height => i.e. Audit Tracking
    helm.showMoreData_Initialize = function(evt, ui) {
        var $igGridScroller = $("#AuditTrackingResultsListWrapper_helm .ui-iggrid-scrolldiv");
        var $showMoreDataButton = $("#AuditTrackingExpand_Helm");
        var rowCount = $("#AuditTrackingResults_igGrid tr").length;
        var viewPortRowCount = 8; //max number of rows visilble to user when helm height is at default state
        if (rowCount > viewPortRowCount) {
            $showMoreDataButton.toggleClass("displayNone", false);
        } else {
            $showMoreDataButton.toggleClass("displayNone", true);
        }
    }

    //helm.refresh = function () {}

    // *  Get Helm setup and ready for action
    helm.Initialize = function (isAfterAjaxRequest) {
        //$(".consoleLogOutput").append('<div class="consoleLog_helm">InitializeHelm() Starting.</div>');
        //if (!isAfterAjaxRequest) showProgressSpinner(true, "#HelmContent_BlockUI");
        
        if (Compass.Global.isLoanSelected) {
            //$(".consoleLogOutput").append('<div class="consoleLog_helm">Initialize Help Popovers Completed.</div>');
            alertHelpBubbles_DisableAll();
            //$(".consoleLogOutput").append('<div class="consoleLog_helm">Disable Help Bubbles Completed.</div>');
            
            /* Setup Quick Search */
            if (isAfterAjaxRequest === false) { //if Not an asp.net updatepanel refresh

                // * * See the helm user control C# code comments the use of this hidden field
                var $hdnLoanData = $("#LoanDataWrapper_helm input[type='hidden']");
                var loanData = JSON.parse($hdnLoanData.val());
                helm.QuickSearchOptionsData = loanData;
                $hdnLoanData.val("");  //Important:  once we extract the data from this field we need to remove it otherwise asp.net throws cross site scripting security exception during post back.
                // * * 

                if (helm.DisplayMode === "QuickSearchRecentlyViewedOnly") {
                    pageTabs_helm_set("recentlyViewedMinimized");
                    helm.showBasicLoanDetailsInPageHeader(true);
                } else {
                    pageTabs_helm_set("loanDetails");
                    helm.LoanDetailsData = loanData;
                    helm.populateLoanDetailsPanel();
                    alternateRowColorsForDataGrids();
                    cssLabelFirstAndLastCellsInDataRow();
                    setCustomScrollBars();
                }

                initializeQuickSearch().promise().done(showQuickSearchArea);

                //Preload the "Audit Tracking" & "Recently Viewed" progress spinner because ie7 renders it really slow and choppy for that page tab.
                showProgressSpinner(true, "#AuditTrackingContentTab_helm"); //Preload the "Audit Tracking" progress spinner because ie7 renders it really slow and choppy for that page tab.
                showProgressSpinner(true, "#RecentlyViewedTabContent_helm");

                //Wait until data access is complete to add the folllwing ajax request load handler
                //if this data refresh was from update panel ajax request then 
                //no need to reinitialize
                Sys.Application.add_load(ajax_Load);
            }
            else {  ///update panel refresh. 
                
                Sys.Application.remove_load(ajax_Load);
                helm.xhr.getLoanDetails().promise().done(function (success) {
                    helm.populateLoanDetailsPanel();
                    alternateRowColorsForDataGrids();
                    cssLabelFirstAndLastCellsInDataRow();
                    Sys.Application.add_load(ajax_Load);
                });
                
            }
            intializeHelpPopOverItems();
            // * This below code is for testing screen flicker problem on ie7
            //window.setTimeout(function() {
            //    window.location.href = document.URL;
            //},2000);
            //*
                

        } else { //loan is not selected
            if (isAfterAjaxRequest === false) { //if Not an asp.net updatepanel refresh
                if (helm.DisplayMode === "QuickSearchRecentlyViewedOnly") {
                    pageTabs_helm_set("recentlyViewedMinimized");
                } else {
                    pageTabs_helm_set("search");
                }
                var loanData = JSON.parse($("#LoanDataWrapper_helm input[type='hidden']").val());
                helm.QuickSearchOptionsData = loanData;
                initializeQuickSearch().promise().done(showQuickSearchArea);
                //showProgressSpinner(false, "#HelmContent_BlockUI");
                showProgressSpinner(true, "#RecentlyViewedTabContent_helm"); //even though this spinner is not visible start it up now because of ie7 choppy display when switch page tabs and displaying new tabs content.
                Sys.Application.add_load(ajax_Load);
                intializeHelpPopOverItems();
                // optimizeIE7Rendering();
            }
        }

        if (isAfterAjaxRequest === false) {
            setThemeColors();
        }
    }

    helm.recentlyViewed_igGrid_DataBind = function(recentlyViewed) {

        $("#RecentlyViewed_igGrid").igGrid({
            autoGenerateColumns: false,
            enableHoverStyles: true,
            primaryKey: "LoanSkey",
            showHeader: true,
            width: "1260px",
            height: Compass.Global.isThisBrowserIE7 ? 230 : 260, //good ol ie7 renders iggrid taller vertically
            columns:
            [
                { width: "10px", headerText: "&nbsp;", key: "LeftIndent", unbound: true, dataType: "number", format: "number" },
                { width: "50px", headerText: "Loan <br /> Skey #", key: "LoanSkey", dataType: "string" },
                { width: "115px", headerText: "Loan #", key: "LoanNumber", dataType: "string" },
                { width: "165px", headerText: "Organization", key: "OrgName", dataType: "string", template: $("#Helm_RecentlyViewed_Organization_Col")[0].outerHTML },
                { width: "90px", headerText: "Last Name", key: "LastName", dataType: "string" },
                { width: "85px", headerText: "First Name", key: "FirstName", dataType: "string" },
                { width: "115px", headerText: "City", key: "City", dataType: "string" },
                { width: "42px", headerText: "State", key: "State", dataType: "string" },
                { width: "42px", headerText: "Zip", key: "Zip", dataType: "string" },
                { width: "70px", headerText: "Create <br /> Date", key: "LoanCreatedDateFormatted", dataType: "date", format: "MM/dd/yyyy", template: $("#Helm_RecentlyViewed_CreateDate_Col")[0].outerHTML },
                { width: "130px", headerText: "Sub-Status", key: "LoanSubStatus", dataType: "string" },
                { width: "60px", headerText: "Status", key: "LoanStatus", dataType: "string" },
                { width: "115px", headerText: "Originator", key: "Originator", dataType: "string", template: $("#Helm_RecentlyViewed_Originator_Col")[0].outerHTML },
                { width: "140px", headerText: "Group", key: "GroupName", dataType: "string" },
                { width: "165px", headerText: "UserName", key: "UserName", dataType: "string", hidden: true },
                { width: "165px", headerText: "UserId", key: "UserId", dataType: "string", hidden: true }

            ],
            dataSource: recentlyViewed,
            /* dataRendered: function (evt, ui) {
                /*align column header text*/
            /*ui.owner.element.find("thead tr th:nth-child(2)").css("text-align", "center"); /*Amount
            }*/
            //cellClick: helm.xhr.recentlyViewedLoans_Select
            dataRendered: function (evt, ui) {
                /*align column header text*/
                ui.owner.element.find("#RecentlyViewed_igGrid_LoanCreatedDate").css("text-align", "center");
            },
            cellClick: loanSelect
        });
    }

    helm.quickSearch_igGrid_DataBind = function(results) {

        $("#QuickSearchResults_igGrid").igGrid({
            autoGenerateColumns: false,
            enableHoverStyles: true,
            showHeader: true,
            //virtualization: false,
            //virtualizationMode: "fixed",
            primaryKey: "LoanSkey",
            //avgRowHeight: "30px",
            width: "1260px",
            height: Compass.Global.isThisBrowserIE7 ? 230 : 260,
            columns:
            [
                { width: "10px", headerText: "&nbsp;", key: "LeftIndent", unbound: true, dataType: "number", format: "number" },
                { width: "50px", headerText: "Loan <br /> Skey #", key: "LoanSkey", dataType: "string" },
                { width: "115px", headerText: "Loan #", key: "LoanNumber", dataType: "string" },
                { width: "165px", headerText: "Organization", key: "OrgName", dataType: "string", template: $("#Helm_QuickSearch_Organization_Col")[0].outerHTML },
                { width: "90px", headerText: "Last Name", key: "LastName", dataType: "string" },
                { width: "85px", headerText: "First Name", key: "FirstName", dataType: "string" },
                { width: "115px", headerText: "City", key: "City", dataType: "string" },
                { width: "42px", headerText: "State", key: "State", dataType: "string" },
                { width: "42px", headerText: "Zip", key: "Zip", dataType: "string" },
                { width: "70px", headerText: "Create <br /> Date", key: "LoanCreatedDateFormatted", dataType: "string", template: $("#Helm_QuickSearch_CreateDate_Col")[0].outerHTML },
                { width: "130px", headerText: "Sub-Status", key: "LoanSubStatus", dataType: "string" },
                { width: "60px", headerText: "Status", key: "LoanStatus", dataType: "string" },
                { width: "115px", headerText: "Originator", key: "Originator", dataType: "string", template: $("#Helm_QuickSearch_Originator_Col")[0].outerHTML },
                { width: "140px", headerText: "Group", key: "GroupName", dataType: "string" },
                { width: "165px", headerText: "UserName", key: "UserName", dataType: "string", hidden: true },
                { width: "115px", headerText: "UserId", key: "UserId", dataType: "string", hidden: true }

            ],
            dataSource: results,
            dataRendered: function (evt, ui) {
                /*align column header text*/
                ui.owner.element.find("#QuickSearchResults_igGrid_LoanCreatedDate").css("text-align", "center");
            },
            cellClick: loanSelect
        });

    }

    // *  Bind events to helm elements using jquery
    helm.jQueryBindEvents = function() {
        //To prevent duplicate binding and firing of change events use the "off" function to unbind any existing events first.
        if (Compass.Global.isLoanSelected) {
            helm.jQueryBindEventsWhenLoanSelected();
        }
        $("#QuickSearchButton_helm").off("click").click(quickSearchButton_click);
        $("#RecentSearchBackButton_helm").off("click").click(recentQuickSearchBackButton_click);
        //$(".onEnterKeySubmit").keypress(function (e) {
        //    var key = e.which;
        //    if (key == 13) {
        //        var activeElementID = $(this).attr("id");
        //        var targetElementToClick = $(".enterKeyFireClick." + activeElementID);
        //        targetElementToClick.click();
        //    }
        //});
    }

    // *  Prevent the user from hitting the back button after 
    // *  selecting a loan from quick search  
    helm.didUserHitTheBackButtonOrCachedPage = function() {

        var helmRequestComplete = new $.Deferred();

        if ($("#UserHitBackButtonWrapper_helm input[type='hidden']").val() === "true") {
            progressSpinner.ajaxProgressBegin();
            window.history.forward();
            //window.location.href = "/LoanData/Messages.aspx";
            //window.location.href = "/SSO_Redirect.aspx";

        } else {
            helmRequestComplete.resolve();
        }

        return helmRequestComplete.promise();
    }

    // * Call Web Service to get the Quick Search results data based on the search criteria specified by the user.
    // * IMPORTANT: This version of the Quick Search XHR call is to an optimized intelligent search which attempts 
    // * to recognize what the user is most likely searching for.  
    helm.xhr.get_OPTIMIZED_QuickSearchResults = function helmXhrGetQuickOptimizedSearchResults(QuickSearchCriteria) {

        var success = false;
        var helmRequestComplete = new $.Deferred();
        var SendRequest = Compass.Global.Xhr.getNewSendRequest();

        SendRequest.callingFunction = arguments.callee.name;
        SendRequest.showProgress = false;

        SendRequest.xhrData = "{'quickSearchOptions':" + JSON.stringify(QuickSearchCriteria) + "}";

        SendRequest.url = "/Webservice/Helm.asmx/GetOptimizedQuickSearchResults";
        SendRequest.failureCallBackFunction = helm.handleXhrFailureCustom;

        Compass.Global.Xhr.post(SendRequest).done(function (data) {
            var xhrResponse = data.d.xhr;
            Compass.Global.Xhr.responseHandler(xhrResponse).done(function () {
                if (xhrResponse.Success) {
                    success = true;
                    if (data.d.QuickSearchResults != null && data.d.QuickSearchResults.length > 0) {
                        $("#QuickSearchResultsListContainer_helm").toggleClass("displayNone", false);
                        $("#QuickSearchNoResultsWrapper_helm").toggleClass("displayNone", true);
                        helm.quickSearch_igGrid_DataBind(data.d.QuickSearchResults);
                    } else {
                        quickSearchResults_NoResultsDisplay();
                    }
                }
            });

            helmRequestComplete.resolve(success);
        });

        return helmRequestComplete;

    }

    // * Call Web Service to get the Quick Search results data based on the search criteria specified by the user.
    helm.xhr.getQuickSearchResults = function helmXhrGetQuickSearchResults(QuickSearchCriteria) {

        var success = false;
        var helmRequestComplete = new $.Deferred();
        var SendRequest = Compass.Global.Xhr.getNewSendRequest();
        
        SendRequest.callingFunction = arguments.callee.name;
        SendRequest.showProgress = false;

        SendRequest.xhrData = "{'quickSearchOptions':" + JSON.stringify(QuickSearchCriteria) + "}";
        
        SendRequest.url = "/Webservice/Helm.asmx/GetQuickSearchResults";
        SendRequest.failureCallBackFunction = helm.handleXhrFailureCustom;

        Compass.Global.Xhr.post(SendRequest).done(function (data) {
            var xhrResponse = data.d.xhr;
            Compass.Global.Xhr.responseHandler(xhrResponse).done(function () {
                if (xhrResponse.Success) {
                    success = true;
                    if (data.d.QuickSearchResults != null && data.d.QuickSearchResults.length > 0) {
                        $("#QuickSearchResultsListContainer_helm").toggleClass("displayNone", false);
                        $("#QuickSearchNoResultsWrapper_helm").toggleClass("displayNone", true);
                        helm.quickSearch_igGrid_DataBind(data.d.QuickSearchResults);
                    } else {
                        quickSearchResults_NoResultsDisplay();
                    }
                }
            });

            helmRequestComplete.resolve(success);
        });

        return helmRequestComplete;

    }

    // * Handler for when there is no audit tracking data for selected loan.
    helm.recentlyViewed_NoResultsDisplay = function () {
        $("#RecentlyViewedListContainer_helm").toggleClass("displayNone", true);
        $("#RecentlyViewedNoResultsWrapper_helm").toggleClass("displayNone", false);
    }

    helm.xhr.recentlyViewedLoans_Select = function helmXhrRecentlyViewedLoans_Select(evt, ui) {

        var success = false;
        var helmRequestComplete = new $.Deferred();
        var SendRequest = Compass.Global.Xhr.getNewSendRequest();

        SendRequest.callingFunction = arguments.callee.name;
        SendRequest.showProgress = true;
        SendRequest.redirectAfterProgressComplete = true;

        var loanSkeySelected = ui.rowKey;

        SendRequest.xhrData = "{'userId':" + JSON.stringify(Compass.Global.userId) +
            ",'loanSkey':" + JSON.stringify(loanSkeySelected) +
            "}";
        SendRequest.url = "/Webservice/Helm.asmx/RecentlyViewedLoan_Select";
        SendRequest.failureCallBackFunction = helm.handleXhrFailureCustom;

        Compass.Global.Xhr.post(SendRequest).done(function (data) {
            var xhrResponse = data.d.xhr;
            Compass.Global.Xhr.responseHandler(xhrResponse).done(function () {
                if (xhrResponse.Success) {
                    success = true;
                    window.location.href = "/LoanData/Messages.aspx";
                }

            });

            helmRequestComplete.resolve(success);
        });

        return helmRequestComplete;
    }

    helm.xhr.getRecentlyViewedLoans = function helmXhrGetRecentlyViewedLoans () {
        var success = false;
        var helmRequestComplete = new $.Deferred();
        var SendRequest = Compass.Global.Xhr.getNewSendRequest();

        SendRequest.callingFunction = arguments.callee.name;
        SendRequest.showProgress = false;

        SendRequest.xhrData = "{'userId':" + JSON.stringify(Compass.Global.userId) +
            ",'numberToReturn':" + JSON.stringify("20") +
            "}";
        SendRequest.url = "/Webservice/Helm.asmx/GetRecentlyViewedList";
        SendRequest.failureCallBackFunction = helm.handleXhrFailureCustom;

        Compass.Global.Xhr.post(SendRequest).done(function (data) {
            var xhrResponse = data.d.xhr;
            Compass.Global.Xhr.responseHandler(xhrResponse).done(function () {
                if (xhrResponse.Success) {
                    success = true;
                    helm.RecentlyViewedData = data.d;
                }
            });

            helmRequestComplete.resolve(success);
        });

        return helmRequestComplete;
    }

    helm.xhr.getQuickSearchOptions = function helmXhrGetQuickSearchOptions(options) {
        //$(".consoleLogOutput").append('<div class="consoleLog_helm">Getting Quick Search Options.</div>');
        var success = false;
        var helmRequestComplete = new $.Deferred();
        var SendRequest = Compass.Global.Xhr.getNewSendRequest();
       
        SendRequest.callingFunction = arguments.callee.name;
        SendRequest.showProgress = false;
        var userId = (Compass.Global.userId === undefined) ? "" : Compass.Global.userId;
        SendRequest.xhrData = "{'userId':" + JSON.stringify(userId) + "}";
        SendRequest.url = "/Webservice/Helm.asmx/GetQuickSearchOptions";
        SendRequest.failureCallBackFunction = helm.handleXhrFailureCustom;

        Compass.Global.Xhr.post(SendRequest).done(function (data) {
            var xhrResponse = data.d.xhr;
            Compass.Global.Xhr.responseHandler(xhrResponse).done(function () {
                if (xhrResponse.Success) {
                    //$(".consoleLogOutput").append('<div class="consoleLog_helm">Success Get Quick Search Options.</div>');
                    success = true;
                    helm.QuickSearchOptionsData = data.d;
                }
            });

            helmRequestComplete.resolve(success);
        });

        return helmRequestComplete;

    }

    // * Get Loan Details from web services
    helm.xhr.getLoanDetails = function helmXhrGetLoanDetails() {
        var success = false;
        var helmRequestComplete = new $.Deferred();
        var SendRequest = Compass.Global.Xhr.getNewSendRequest();

        SendRequest.callingFunction = arguments.callee.name;
        SendRequest.showProgress = false;

        var userId = (Compass.Global.userId === undefined) ? "" : Compass.Global.userId;
        var loanSkey = (Compass.Global.loanSkey === undefined) ? 0 : Compass.Global.loanSkey;

        SendRequest.xhrData = "{'userId':" + JSON.stringify(userId) +
            ",'loanSkey':" + JSON.stringify(loanSkey) +
            "}";

        SendRequest.url = "/Webservice/Helm.asmx/GetLoanDetails";
        SendRequest.failureCallBackFunction = helm.handleXhrFailureCustom;

        Compass.Global.Xhr.post(SendRequest).done(function (data) {
            var dataParsed = JSON.parse(data.d);
            var xhrResponse = dataParsed.xhr;
            Compass.Global.Xhr.responseHandler(xhrResponse).done(function () {
                if (xhrResponse.Success) {
                    success = true;
                    helm.LoanDetailsData = dataParsed;
                    helm.QuickSearchOptionsData = dataParsed;
                }
            });

            helmRequestComplete.resolve(success);
        });

        return helmRequestComplete.promise();
    }

    //alert('hello');
        
    

    //helm.xhr.getLoanDetails();
    //helm.xhr.getLoanDetails().promise().done(function (success) {
        $(document).ready(function () {
            //First Check if the user most likely hit the back button when coming to this page after 
            //SSO'ing to different org's loan from a helm quick search results loan selection.
            //If they did, redirect them to the messages screen.
            
            Compass.Helm.didUserHitTheBackButtonOrCachedPage().promise().done(function () {
                //$(".consoleLogOutput").append('<div class="consoleLog_helm">$(document).ready() event starting</div>');

                //$("#Tabs_helm").tabs();
                Compass.Helm.jQueryBindEvents();
                $("#divForDashboard").toggleClass('displayNone', true);
                
            });
        });
    //});

    //window.setTimeout(function() {
    //    Compass.Helm.Initialize(false); //false = call initialize and this is not coming from ajax load event b/cause we are calling this from $(document).ready
    //},1000);


    //Compass.Helm.xhr.getQuickSearchOptions().promise().done(function (success) {

    //});

})(Compass.Helm, window, jQuery);




// * * * * * * * H e l m   L i b r a r y   =>  A  L o a n   i s   S e l e c t e d  * * * * * * * * // 
// * 
// * Below code specifically applys to the helm only when the user has selected a loan.  We will extend the 
// * Compass.Helm Object easily with the same IIFE pattern and passing in the Compass.Helm object/namespace
// *
// * * * * *
(function (helm, window, $, undefined) { ////ensure ECMA Script 3 (IE7) undefined is really undefined

    /* * *  P R I V A T E   P R O P E R T I E S * * */

    var auditTrackingScrollHeight = null;
    

    /* * *  P R I V A T E   M E T H O D S * * */

    

    // * Audit Tracking List igGridFiltering Filtered Event
    function auditTracking_RowsFiltered(evt, ui) {
        //After the user enters criteria in filtering the rows using the built in igGridFiltering,
        //the results of the filter cause iggrid to be resized. We need to account for the show more/ show less 
        //button's state and make adjustmenst to the ui accordingly.
        var hasShowMoreBeenClicked = auditTrackingScrollHeight !== null;
        if (hasShowMoreBeenClicked) {
            showMoreRowsOfData(false);
        }
        if (Compass.Global.isThisBrowserIE7) {
            //ie7 hack: ie7 igfiltering rowsfiltered event fires to early, we need a slight delay 
            window.setTimeout(function () {
                helm.showMoreData_Initialize(evt, ui);
            });
        } else { //not IE7
            helm.showMoreData_Initialize(evt, ui);
        }
    }

    

    // * Infragistics igniteUI igGrid populated with Loan Contacts
    function loanContacts_igGrid_DataBind (loanContacts) {

        var isIe7 = Compass.Global.isThisBrowserIE7;
        var isIE = Compass.Global.isInternetExplorer;
        var listHeight = null; //use default setting if not IE
        if (isIe7) {
            listHeight = 110;
        }
        else if (isIE) {
            listHeight = 120;
        }

        $("#LoanContacts_igGrid").igGrid({
            autoGenerateColumns: false,
            enableHoverStyles: true,
            primaryKey: "ContactId",
            //width: Compass.Global.isThisBrowserIE7 ? 200 : 300,
            showHeader: false,
            height: listHeight,
            columns:
            [
                { width: isIe7 ? "10px" : "1px", headerText: "&nbsp;", key: "ContactId", dataType: "number", template: $("#ContactId_col_helm")[0].outerHTML },
                { width: isIe7 ? "22px" : "30px", headerText: "&nbsp;", key: "IsYoungestCoBorrower", dataType: "bool", template: $("#Youngest_col_helm").html() },
                { width: isIe7 ? "168px" : "180px", headerText: "Contact Name", key: "FullNameLastFirst", dataType: "string" },
                { width: isIe7 ? "119px" : "125px", headerText: "Contact Type", key: "BorrowerTypeFormatted", dataType: "string" }
            ],
            dataSource: loanContacts,
            /* dataRendered: function (evt, ui) {
                /*align column header text*/
            /*ui.owner.element.find("thead tr th:nth-child(2)").css("text-align", "center"); /*Amount
            }*/

            cellClick: loanContacts_Select
        });

        
    }

    // * The user has selected a loan contact from loan contacts list.
    // * Show the user the loan contact details.
    function loanContacts_Select(evt, ui) {

        if (typeof ui !== "undefined" && ui !== null) {
            var contactId = ui.rowKey;
            loanContacts_ShowContactDetails(contactId);
        }
    }
    
    // * Bind data to Loan Details Panel
    function loanDetailsPanel_Set(loan, userCanChangeLoanStatus) {
        $("#FhaCaseNo_helm").text(helm.formatText(loan.FhaCaseNo));
        $("#FhaAdpCode_helm").text(helm.formatText(loan.FhaAdpCode));
        $("#FhaIntakeImage_helm").toggleClass("displayNone", loan.PartnerSubmission === false);
        $("#LoanSkey_helm").text(Compass.Global.loanSkey);
        $("#LenderCaseNo_helm").text(helm.formatText(loan.LoanNumber));
        $("#MailMessageCount_helm").text(helm.formatText(loan.MessageCount));
        $("#NewMailMessage_helm").toggleClass("displayNone", loan.IsNewMessages === false);
        $("#Officer_helm").text(helm.formatText(loan.OfficerLastName + " / "));
        $("#Channel_helm").text(helm.formatText(loan.Channel));
        $("#GroupName_helm").text(helm.formatText(loan.Group.GroupName));
        $("#LoanStatuses_helm").val(loan.LoanStatusSkey).prop("disabled", userCanChangeLoanStatus === false || Compass.Global.isReadOnlyMode === false);
        $("#LoanSubStatuses_helm").val(loan.LoanSubStatusSkey).prop("disabled", userCanChangeLoanStatus === false || Compass.Global.isReadOnlyMode === false);
        

        if (loan.IsFraudAlert || loan.IsOnHold) {
            $("#FraudAlert_helm").closest("tr.data_R0w").toggleClass("redAlert", true);
        }

        $("#FraudAlert_helm").toggleClass("displayNone", loan.IsFraudAlert === false);
        $("#OnHold_helm").toggleClass("displayNone", loan.IsOnHold === false);

    }

    // * Bind data to Loan Details Panel
    function loanDatesPanel_Set(loan) {
        $("#CounselingCompletedDate_helm").text(helm.formatText(loan.CounselingCompletedDateFormatted));
        $("#ApplicationDate_helm").text(helm.formatText(loan.ApplicationDateFormatted));
        $("#FhaCaseNoDate_helm").text(helm.formatText(loan.FhaCaseNoDateFormatted));
        $("#EstClosingDate_helm").text(helm.formatText(loan.EstClosingDateFormatted));
        $("#ClosingDate_helm").text(helm.formatText(loan.ClosingDateFormatted));
        $("#FundingDate_helm").text(helm.formatText(loan.FundingDateFormatted));
        $("#GfeLastDisclosedDate_helm").text(helm.formatText(loan.GfeLastDisclosedDateFormatted));

        $("#SubmittedProcessingDate_helm").text(helm.formatText(loan.SubmittedProcessingDateFormatted));
        $("#SubmittedUwDate_helm").text(helm.formatText(loan.SubmittedUwDateFormatted));
        $("#ClearedToCloseDate_helm").text(helm.formatText(loan.ClearedToCloseDateFormatted));
        $("#ServicingBoardedDate_helm").text(helm.formatText(loan.ServicingBoardedDateFormatted));
        $("#MicDate_helm").text(helm.formatText(loan.MicDateFormatted));
        $("#AppraisalExpDate_helm").text(helm.formatText(loan.AppraisalExpDateFormatted));

    }

    // * Bind Data to Loan Contacts Panel
    function loanContactsPanel_Set(loanContacts, subjectPropertyAddress) {
        //if there is one contact then only display that contact detail.  To display 
        // a  list of one contact would not be good design.
        if (loanContacts !== null && loanContacts.length > 0) {

            /* store the loan contacts list locally*/
            window.Compass.Helm.LoanContacts = loanContacts;
            if (loanContacts.length === 1) {
                //only one contact -- no need to show list.
                var loanContactId = loanContacts[0].ContactId;
                /* * Show Contact Details * */
                loanContacts_ShowContactDetails(loanContactId);
            }
            else {
                loanContacts_igGrid_DataBind(loanContacts);
                loanContacts_ShowContactList(true);
            }

        }

        if (subjectPropertyAddress !== null) {
            var address = subjectPropertyAddress;
            //Combine address lines one and two into one line (if there is an address 2)
            var addressLine1 = helm.formatText(address.Address1);
            var addressLine2 = helm.formatText(address.Address2);
            addressLine1 += (addressLine2 === "" ? "" : ", " + addressLine2);
            $("#LoanContactsAddress1_helm").text(addressLine1);
            //$("#LoanContactsAddress2_helm").text(helm.formatText(address.Address2));
            $("#LoanContactsCityStateZip_helm").text(helm.formatText(address.CityStateZipFormatted));

            //2015_08_18 MP In order to reduce clutter and info overload, Nancy E. 
            // and I talked about County display not being needed on dashboard.
            //$("#LoanContactsCounty_helm").text(helm.formatText(address.CountyName));
        }
    }



    // * Bind Data to Product Pricing Panel
    function productPricingPanel_Set(productPricing) {
        if (productPricing !== null) {
            $("#ProductType_helm").text(productPricing.ProductType);
            $("#PropertyValue_helm").text(productPricing.PropertyValueFormatted);
            $("#InitialRate_helm").text(productPricing.InitialRateFormatted);
            $("#Margin_helm").text(productPricing.MarginFormatted);
            $("#PayPlanType_helm").text(productPricing.PaymentPlanTypeDescription);

            /* Hecm Type */
            $("#HecmType_helm").text(productPricing.HecmTypeName);
            var hecmType = productPricing.HecmTypeFormatted.toLowerCase();
            if (hecmType === "traditional") {
                $("#HecmTypeIndicator_Helm").toggleClass("displayNone", true);
            }
            else {
                $("#HecmTypeIndicator_Helm").toggleClass("displayNone", false);

                if (hecmType === "refinance") {
                    $("#HecmTypeIndicator_Helm")
                        .toggleClass("bloo_indicator", false)
                        .toggleClass("pinkdot_indicator", true);
                }
                else if (hecmType === "hecmforpurchase") {
                    $("#HecmTypeIndicator_Helm")
                        .toggleClass("bloo_indicator", true)
                        .toggleClass("pinkdot_indicator", false);

                }
            }
            /* END: Hecm Type */

            $("#PrincipalLimit_helm").text(productPricing.PrincipalLimitFormatted);
            $("#NetPrincipalLimit_helm").text(productPricing.NetPrincipalLimitFormatted);
            $("#InvalidScenarioContainer_helm").toggleClass("displayNone", productPricing.IsInvalid === false);
        }
    }

    // * Get the alert level color string (from model) and return 
    // * The corresponding view css class name. ie "red" outputs to "redAlert".
    function cssClassNameForAlertLevel(alertLevel) {
        return alertLevel.toLowerCase() + "Alert";
    }


    /* A list of custom alerts to warn or inform users of various loan statuses is generated
    inside the HelmRequest Model and sent down to view.  Here we will process those list of alerts (if any).
    IMPORTANT: The customAlerts.AlertId is typically the C# Loan Class PropteryId which represents the data it holds.
    Therefore we must set our element Id's to be the same, but with "_helm" concatenated on to the end of the el. Id.*/
    function alertHelpBubbles_Set(customAlerts) {
        var i, alert, len = customAlerts.length;
        var $target, $helpBubble, $alertRow;
        var helpBubbleTemplateId;
        for (i = 0; i < len; ++i) {
            if (i in customAlerts) {
                alert = customAlerts[i];
                $target = $("#" + alert.AlertId + "_helm"); /* ex output = > #CounselingCompletedDate_helm (see above note) */
                /* now that we have located the target alert element, find the parent 
                html table row....*/
                $alertRow = $target.closest("tr.data_R0w");
                $alertRow.toggleClass(cssClassNameForAlertLevel(alert.AlertLevelFormatted), true); /* .. and highlight it */
                $helpBubble = $alertRow.find(".alertPopover_helm"); /* find the element help bubble in the row */
                $helpBubble.toggleClass("displayNone", false); /* show the help bubble */
                /* set help bubble custom alert text */
                helpBubbleTemplateId = "#" + $helpBubble.attr("id") + "_template";
                var $customAlertTextArea = $(helpBubbleTemplateId).find("div.customAlertText");
                $customAlertTextArea.html(alert.DisplayText);
            }
        }
    }
    
    // * Set The Panel that shows a specific loan contacts detailed info
    function loanContactsDetails_Set(contact) {

        $("#LoanContactName_helm").text(helm.formatText(contact.FullName));
        $("#LoanContactType_helm").text(helm.formatText(contact.BorrowerTypeFormatted));
        $("#LoanContactBirthDate_helm").text(helm.formatText(contact.BirthDateFormatted));

        // * nearest actual age - separate with forward slash if both values present;
        var ageDisplay = helm.formatText(contact.ActualAge);
        ageDisplay = (ageDisplay == 0) ? "" : ageDisplay;
        var nearestAge = helm.formatText(contact.NearestAge);
        nearestAge = (nearestAge == 0) ? "" : nearestAge;
        var ageTypeMedianText = "";
        if (ageDisplay.length !== 0 && nearestAge.length !== 0) {
            ageTypeMedianText = " / ";
        }
        if (contact.BorrowerType !== Compass.Lookup.BorrowerType.AlternateContact.key) {
            ageDisplay += ageTypeMedianText + nearestAge;
        }
        

        //hide/show help bubble if nearest age is not present
        $("#NearestAgePopover_helm").toggleClass("displayNone", nearestAge === "");
        $("#LoanContactAge_helm").text(ageDisplay);
        
        //hide gold star if NOT youngest borrower or only there is only one borrower 
        if (helm.LoanDetailsData.LoanContacts.length > 1 && contact.IsYoungestCoBorrower) {
            $("#LoanContactsDetailsWrapper_helm div.starChar_helm").attr("title", "Youngest " + contact.BorrowerTypeFormatted.trim());
            $("#LoanContactIsYoungest_helm").toggleClass("displayNone", false);
        } else {
            $("#LoanContactIsYoungest_helm").toggleClass("displayNone", true);
        }
        
        /***/
        $("#ContactSsnSecure_helm").text(helm.formatText(contact.SsnSecureFormatted));
        $("#ContactSsn_helm").text(helm.formatText(contact.SsnFormatted));

        //hide/show help bubble if ssn is not present
        $("#SsnPopover_helm").toggleClass("displayNone", contact.SsnFormatted === "");

        $("#HomePhoneNo_helm").text(helm.formatText(contact.HomePhoneNumberFormatted));

        // * Is the Borrower DOB 
        var $missingDOBAlert = $("#MissingDOBAlert_Helm");
        var $missingDOBAlertRedirectUrl = $("#MissingDOBAlert_Helm a");
        if (contact.IndicateConfirmedDOB) {
            $("tr#ContactDOB_Helm").toggleClass("redAlert", true);
            $missingDOBAlert.toggleClass("displayNone", false);
            $missingDOBAlertRedirectUrl.attr("href", contact.DOBFixURL);
        }
        else { 
            $("tr#ContactDOB_Helm").toggleClass("redAlert", false);
            $missingDOBAlert.toggleClass("displayNone", true);
            $missingDOBAlertRedirectUrl.attr("href", "");
        }
    }

    // * disable/enable scroll bar in IE because ie7 leaves garbage elements on screen
    // * when animate to hide loan contacts list.  Even if IE > 7 then to keep consistent
    //*  within IE, show the same HTML scroll bar and not the sleek Malihu scrolls as follows
    function loanContactsScrollBar_Enable(enable) {
        if (Compass.Global.isInternetExplorer === false) {
            var $contacListContainer = $("#LoanContactsListContainer_helm");
            if ($contacListContainer.length > 0) {
                if (enable) {
                    $contacListContainer.mCustomScrollbar("update");
                } else {
                    $contacListContainer.mCustomScrollbar("disable");
                }
            }
        }
    }

    
    // * Enable or disable the Loan Contacts Three Line Menu
    function loanContactsListMenu_Enable(enable) {
        if (enable) {
            //ie 7 will show list icon when it should not. Hiding the wrapper element will not hide
            //the list menu icon.  Also Hide the child element to fix ie7 issue.
            $("#LoanContactsDetailsWrapper_helm .threeLineMenu").toggleClass("displayNone", false);
            $("#LoanContactsDetailsWrapper_helm .threeLineMenuWrapper").toggleClass("displayNone", false);
        }
        else { //disable
            $("#LoanContactsDetailsWrapper_helm .threeLineMenu").toggleClass("displayNone", true);
            $("#LoanContactsDetailsWrapper_helm .threeLineMenuWrapper").toggleClass("displayNone", true);
        }
    }
    

    function loanContacts_ShowContactDetails(contactId) {

        if (typeof contactId !== "undefined" && contactId != null) {
            getContactByContactId(contactId).done(function (contact) {
                if (typeof contact !== "undefined" && contact != null) {
                    loanContactsDetails_Set(contact); //Populate Loan Details with Contact Data

                    var $LoanContactsListWrapper = $("#LoanContactsListWrapper_helm");
                    //if only one contact, no need for animation of loan contacts list.
                    //just hide the list and display the detailed contact info.
                    if (window.Compass.Helm.LoanContacts.length === 1) {
                        $LoanContactsListWrapper.toggleClass("displayNone", true);
                        //hide the 3 line menu icon because there is not contact list
                        loanContactsListMenu_Enable(false);
                    }
                    else {
                        loanContactsListMenu_Enable(true);
                        var $igGridLoanContacts = $LoanContactsListWrapper.find(".ui-iggrid");
                        var $LoanContactsGridAndWrapper = $LoanContactsListWrapper.add($igGridLoanContacts);
                        var $LoanContactsListContainer = $("#LoanContactsListContainer_helm");

                        loanContactsScrollBar_Enable(false);
                        $igGridLoanContacts.fadeOut(400);
                        $LoanContactsGridAndWrapper.animate({
                            width: '0'
                        }, 375)
                            .promise().done(function () {
                                $LoanContactsListContainer.toggleClass("displayNone", true);
                                loanContactsListMenu_Enable(true);  //clicking on a contact in the list view while an animation was running would sometimes cause the 3 line list menu not to display in the loan contacts details view.  Show it again at the end of this animation.
                            });


                    }
                }
            });
        }
    }

    // * Fire drop down list change event when user selected new Loan Status
    var loanStatus_Changed = function(e) {

        var selectedStatus = $(this).val();
        if (selectedStatus != null) {
            helm.xhr.statusChange(selectedStatus, "status"); /* options are "status" or "substatus" */
        }
    }

    // * Fire drop down list change event when user selected new Loan SUB-status 
    var loanSubStatus_Changed = function(e) {

        var selectedSubStatus = $(this).val();
        if (selectedSubStatus != null) {
            /* options are "status" or "substatus" */
            helm.xhr.statusChange(selectedSubStatus, "substatus")
                .promise().done(function () {
                    helm.Initialize(true);
                }); 
        }
    }

    // * User would like to check New Messages.  They have clicked the new mail icon and 
    // * will redirected to Messages.
    var checkNewMessage_Click = function () {
        progressSpinner.ajaxProgressBegin();;
        window.location.href = "/LoanData/Messages.aspx";
    }

    //User has clicked the globe icon next the the fha case number as to see the intake summary pdf.
    var fhaIntakeImage_Click = function () {
        var dummyId = ".btnDummyFhaIntakePdfPreview_helm";

        var btndummy = $(".btnDummyFhaIntakePdfPreview_helm");
        btndummy.click();

        return false;
    }

    // * The user has clicked the Loan Dates Panel Title.  
    // * Navigate to the Loan Dates Screen.
    var loanDatesNavigateTo_Click = function() {
        progressSpinner.ajaxProgressBegin();
        window.location.href = "/Dates/default.aspx";
    }

    // * The user has clicked the Loan Dates Panel Title.  
    // * Navigate to the Loan Dates Screen.
    var scenariosNavigateTo_Click = function() {
        progressSpinner.ajaxProgressBegin();
        window.location.href = "/pricing/product_scenarios.aspx";
    }

    // * The user has clicked the Loan Contacts Panel Title.  
    // * Navigate to the Loan Contacts Screen.
    var loanContactsNavigateTo_Click = function() {
        progressSpinner.ajaxProgressBegin();
        window.location.href = "/application/BorrowerInformation.aspx";
    }
    
    // * The user has clicked the Subject Property Address Sub Panel Title.  
    // * Navigate to the Loan Contacts Screen.
    var propertyInfoNavigateTo_Click = function() {
        progressSpinner.ajaxProgressBegin();
        window.location.href = "/application/PropertyInformation.aspx";
    }

    
    //User has clicked the 3 horizontal line menu that should bring up the list of loan contacts
    var loanContactsList_Show_click = function () {
        loanContacts_ShowContactList(true);
    }
    
    //Show the loan contacts list
    function loanContacts_ShowContactList(show) {
        if (show) {

            loanContactsListMenu_Enable(false);  //Enable/Display the 3 line menu
            var $LoanContactsListWrapper = $("#LoanContactsListWrapper_helm");
            var $igGridLoanContacts = $LoanContactsListWrapper.find(".ui-iggrid");
            
            //var $LoanContactsGridAndWrapper = $LoanContactsListWrapper.add($igGridLoanContacts);
            var $LoanContactsListContainer = $("#LoanContactsListContainer_helm");

            $LoanContactsListContainer.toggleClass("displayNone", false);
            $LoanContactsListWrapper.toggleClass("displayNone", false);
            $igGridLoanContacts.fadeIn(300);
            
            if (Compass.Global.isThisBrowserIE7 === false) {
                $LoanContactsListWrapper
                    .animate({
                        width: helm.LoanContactsListWidth
            }, 275)
                    .promise().done(function () {
                        /* must enable scrollbar in ie7 after animation completes or animation is very choppy. */
                        loanContactsScrollBar_Enable(true);
                        });
                }
            

        }
    }

    //The loan contacts were retreived and held locally in the browser window object.
    //Pass in the contactId and get back the contact object from the list (if found)
    function getContactByContactId(contactId) {

        var deferred = new $.Deferred();
   
        var contactList = window.Compass.Helm.LoanContacts;
        var contact = null;

        for (var i = 0; i < contactList.length; i++) {
            if (contactList[i] !== null && contactList[i].ContactId === contactId) {
                contact = contactList[i];
                break;
            }
        }

        deferred.resolve(contact);
        return deferred.promise();

    }
    
    // * User has just clicked a button to how more or less list based data by expanding/shrinking helm height => i.e. Audit Tracking 
    var showMoreRowsOfData_click = function () {
        //toggle show more or show less depending on wether the .showMoreText_helm class is visible 
        //inside the "Show More/Less" Button
        var $showMoreDataButton = $(this);
        var showMore = $showMoreDataButton.find(".showMoreText_helm").is(":visible");
        showMoreRowsOfData(showMore);
    }

    // * Show more or less list based data by expanding/shrinking helm height => i.e. Audit Tracking 
    function showMoreRowsOfData(showMore) {
        var $showMoreDataButton = $("#AuditTrackingExpand_Helm");
        var $igGridScroller = $("#AuditTrackingResultsListWrapper_helm .ui-iggrid-scrolldiv");
        if (showMore) { //show more
            if (auditTrackingScrollHeight === null) {
                auditTrackingScrollHeight = $igGridScroller.css('height'); //ie. 189px;
            }
            $showMoreDataButton.find(".showMoreText_helm")
                .toggleClass("displayNone", true);
            $showMoreDataButton.find(".showLessText_helm")
                .toggleClass("displayNone", false);

            $igGridScroller.stop(true).animate({
                height: "584px"
            }, { duration: 420, queue: false }).css("overflowY", 'auto');

            if (Compass.Global.isThisBrowserIE7) {
                $("#HelmWrapper").toggleClass("helmSetHeight", false);
                $("#AuditTrackingContentTab_helm").stop(true).animate({
                    height: "660px"
                }, { duration: 420, queue: false });
            };
        } else { //show less
            $showMoreDataButton.toggleClass("showMoreRowsOfData_helm", true);
            $showMoreDataButton.find(".showMoreText_helm")
                .toggleClass("displayNone", false);
            $showMoreDataButton.find(".showLessText_helm")
                .toggleClass("displayNone", true);

            $igGridScroller.stop(true).animate({
                height: auditTrackingScrollHeight //"208px" Chrome
            }, { duration: 420, queue: false }).css("overflowY", 'auto');

            if (Compass.Global.isThisBrowserIE7) {
                $("#HelmWrapper").toggleClass("helmSetHeight", true);
                $("#AuditTrackingContentTab_helm").css('height', "auto");
            };
        }
    }
    
    function populateLoanSubStatusDropDownList(subStatuses) {
        // * * Set Loan Sub Status Drop Down Behavior and Values
        var $ddl = $("#LoanSubStatuses_helm");
        var $opts = $ddl.find("option");
        $opts.remove(); //clear out the list of SubStatus
        if (subStatuses.length > 0) {
            $ddl.prop("disabled", false).toggleClass("lookDisabled", false);
            var optionHTML = "";
            $(subStatuses).each(function (i, subStatus) {
                optionHTML = '<option value="{0}">{1}</option>';
                optionHTML = optionHTML.replace('{0}', subStatus.LoanSubStatusSkey).replace('{1}', subStatus.LoanSubStatusDesc);
                $ddl.append(optionHTML);
            });
        }
        else {
            //disableProvidersDDL();
        }
    }

    function populateLoanStatusDropDownList(statuses) {
        // * * Set Loan Status Drop Down Behavior and Values
        var $ddl = $("#LoanStatuses_helm");
        var $opts = $ddl.find("option");
        $opts.remove(); //clear out the list of status
        if (statuses.length > 0) {
            $ddl.prop("disabled", false).toggleClass("lookDisabled", false);
            var optionHTML = "";
            $(statuses).each(function (i, status) {
                optionHTML = '<option value="{0}">{1}</option>';
                optionHTML = optionHTML.replace('{0}', status.LoanStatusSkey).replace('{1}', status.LoanStatusDesc);
                $ddl.append(optionHTML);
            });
        }
        else {
            //disableProvidersDDL();
        }
    }
    
    /* * *  P U B L I C   M E T H O D S * * */

    // * Bind Audit Tracking Data To igGrid
    helm.auditTracking_igGrid_DataBind = function (results) {
        var isIE7 = Compass.Global.isThisBrowserIE7;

        $("#AuditTrackingResults_igGrid").igGrid({
            autoGenerateColumns: false,
            enableHoverStyles: true,
            primaryKey: "AuditTrackingId",
            showHeader: true,
            virtualization: false,
            //virtualizationMode: "fixed",
            //avgRowHeight: "30px",
            width: "1260px",
            //fixedHeaders : true,
            height: Compass.Global.isThisBrowserIE7 ? 250 : 265, //good ol ie7 renders iggrid taller vertically
            columns:
            [
                //{ width: "102px", headerText: "AuditTrackingId", key: "AuditTrackingId", dataType: "number", template: $("#Helm_AuditTracking_AuditTrackingId_Col")[0].outerHTML, hidden: true },
                { width: "10px", headerText: "&nbsp;", key: "LeftIndent", unbound: true, dataType: "number", format: "number" },
                { width: "185px", headerText: "Audit Type", key: "AuditType", dataType: "string", template: $("#Helm_AuditTracking_AuditType_Col")[0].outerHTML },
                { width: "370px", headerText: "Original Value", key: "OriginalValue", dataType: "string", template: $("#Helm_AuditTracking_OriginalValue_Col")[0].outerHTML },
                { width: "370px", headerText: "New Value", key: "NewValue", dataType: "string", template: $("#Helm_AuditTracking_NewValue_Col")[0].outerHTML },
                { width: "145px", headerText: "Changed Date", key: "CreateDateTime", dataType: "date", format: "MM/dd/yyyy h:mm:ss tt", template: $("#Helm_AuditTracking_CreateDate_Col")[0].outerHTML },
                { width: "163px", headerText: "Changed By", key: "CreateByUser", dataType: "string" }
            ],
            dataSource: results,
            features: [
                {
                    name: "Filtering",
                    type: "local",
                    filterSummaryAlwaysVisible: false, //if true the number of records metting a filter criteria is displayed as iggrid footer when filtering is active.
                    dataFiltered: auditTracking_RowsFiltered, //show/hide the show more data button depending on the results of the user filter
                    columnSettings: [
                        { columnKey: "LeftIndent", allowFiltering: false },
                        { columnKey: "CreateDateTime", allowFiltering: false }
                    ]
                }
            ],
            rendered: function (evt, ui) {

                //Compass.Helm.igGrid_Intervals.Audit = window.setInterval(showMoreRowsOfData, 1000);

                //When filtering is disabled on a column in ie7, iggrid renders an empty filter cell <td>
                //Therefore the border does not show up around the td.  Insert a non breaking space so ie7
                //will render properly.
                $("#IE7_DocMode #AuditTrackingResultsListContainer_helm .ui-iggrid-filtercell")
                    .each(function (key, value) {
                        if ($(this).html() === "") {
                            $(this).html("&nbsp;");
                        } else {
                            $(this).find(".ui-igedit-field").prop("autocomplete", "off"); //Disable filter textbox AutoComplete for ie7 because what is shown in the autocomplete is incorrect.
                        }
                    });

            }
        });


        $("#AuditTypeCombo_helm").igCombo({
            nullText: "",
            dataSource: helm.AuditTrackingData.AuditTrackingTypes,
            valueKey: "AuditTypeSkey",
            textKey: "AuditTypeDesc",
            width: 187,
            dropDownAsChild: true,
            dropDownOnFocus: true, /* Show drop down options when the ignite ui combo gets focus */
            enableClearButton: false,
            selectionChanged: function (evt, ui) {
                var selectedItem = ui.items[0];
                if (selectedItem !== null  && typeof selectedItem !== 'undefined') {
                    //var $AuditTrackingFilterTextBox = $("#AuditTrackingResultsListContainer_helm").find("input.ui-iggrid-filtereditor").first();
                    //setTimeout(function() {
                    //    $("#AuditTrackingResultsListContainer_helm").find("input.ui-iggrid-filtereditor").first().focus();
                    //    $("#AuditTrackingResultsListContainer_helm").find("input.ui-iggrid-filtereditor").first().val(selectedItem.text);
                    //    $("#AuditTrackingResultsListContainer_helm").find("input.ui-iggrid-filtereditor").first().trigger(jQuery.Event('keypress', { keycode: 13 }));
                    //} , 4000);
                    $("#AuditTrackingResults_igGrid").igGridFiltering('filter', ([{ fieldName: "AuditType", expr: selectedItem.text, cond: "equals" }]));

                    
                }
            }
        });
    }

    helm.populateLoanDetailsPanel = function () {

        var helmRequestComplete = new $.Deferred();
        
        //$(".consoleLogOutput").append('<div class="consoleLog_helm">Populate Loan Details Panel with Data.</div>');
        if (helm.LoanDetailsData != null) {
            populateLoanStatusDropDownList(helm.LoanDetailsData.LoanStatuses);
            populateLoanSubStatusDropDownList(helm.LoanDetailsData.LoanSubStatuses);
            loanDetailsPanel_Set(helm.LoanDetailsData.LoanDetails, helm.LoanDetailsData.UserCanChangeLoanStatus);
            loanDatesPanel_Set(helm.LoanDetailsData.LoanDetails);
            loanContactsPanel_Set(helm.LoanDetailsData.LoanContacts, helm.LoanDetailsData.SubjectPropertyAddress);
            productPricingPanel_Set(helm.LoanDetailsData.ProductPricing);
            alertHelpBubbles_Set(helm.LoanDetailsData.CustomAlerts);
            helmRequestComplete.resolve();
        }

        helmRequestComplete.resolve(true);
        
        return helmRequestComplete.promise();

    }

    // * For when a loan is selected, bind these events to form elements/controls 
    // * using jquery/javascreipt 
    helm.jQueryBindEventsWhenLoanSelected = function() {
        //Loan Details Panel
        $("#LoanStatuses_helm").off("change").change(loanStatus_Changed);
        $("#LoanSubStatuses_helm").off("change").change(loanSubStatus_Changed);
        $("#NewMailMessage_helm").off("click").click(checkNewMessage_Click);
        $("#FhaIntakeImage_helm").off("click").click(fhaIntakeImage_Click);
        $("#LoanDatesTitle_helm.navLink_helm").click(loanDatesNavigateTo_Click);
        $("#LoanContactsTitle_helm.navLink_helm").click(loanContactsNavigateTo_Click);
        $("#ProductsPricingTitle_helm.navLink_helm").click(scenariosNavigateTo_Click);
        $("#ContactAddressTitle_helm.navLink_helm").click(propertyInfoNavigateTo_Click);
        $("#LoanContactsDetailsWrapper_helm div.threeLineMenu").off("click").click(loanContactsList_Show_click);
        $("#InvalidScenarioContainer_helm").off("click").click(scenariosNavigateTo_Click);
        $("#AuditTrackingExpand_Helm").off("click").click(showMoreRowsOfData_click);
    }
    
    // * The user has changed EITHER the loan sub status or status from the Loan Details Panel
    // * drop down lists.  Paramter statusKeyType can be "status" or "substatus"
    helm.xhr.statusChange = function helmXhrStatusChange(newStatusSkey, statusKeyType) {

        var success = false;
        var helmRequestComplete = new $.Deferred();
        var SendRequest = Compass.Global.Xhr.getNewSendRequest();
        
        SendRequest.callingFunction = arguments.callee.name;

        SendRequest.xhrData = "{'userId':" + JSON.stringify(Compass.Global.userId) +
            ",'loanSkey':" + JSON.stringify(Compass.Global.loanSkey) +
            ",'newStatusSkey':" + JSON.stringify(newStatusSkey) +
            ",'statusKeyType':" + JSON.stringify(statusKeyType) +
            "}";
        SendRequest.url = "/Webservice/Helm.asmx/Loan_StatusChanged";
        SendRequest.failureCallBackFunction = helm.handleXhrFailureCustom;

        Compass.Global.Xhr.post(SendRequest).done(function (data) {
            var xhrResponse = data.d.xhr;
            Compass.Global.Xhr.responseHandler(xhrResponse).done(function () {
                if (xhrResponse.Success) {
                    success = true;
                    //indicate to user that status change operation was successful
                    var $elementToShowSuccess = null;
                    if (statusKeyType === "substatus") {
                        $elementToShowSuccess = $("#LoanSubStatuses_helm").closest("tr.data_R0w");
                        helm.LoanSubStatusWasJustChanged = true;
                    }
                    else if (statusKeyType === "status") {
                        $elementToShowSuccess = $("#LoanStatuses_helm").closest("tr.data_R0w");
                    }
                    if ($elementToShowSuccess != null) {
                        $elementToShowSuccess.toggleClass("greenAlert", true);
                    }

                }

                helmRequestComplete.resolve(success);
            });

            
            
            
        });

        return helmRequestComplete;
    }

    
    // * Handler for when there is no audit tracking data for selected loan.
    helm.auditTracking_NoResultsDisplay = function () {
        $("#AuditTrackingResultsListContainer_helm").toggleClass("displayNone", true);
        $("#AuditTrackingNoResultsWrapper_helm").toggleClass("displayNone", false);
    }

    // * Get AuditTracking from web services
    helm.xhr.getAuditTracking = function helmXhrGetAuditTracking() {

        var success = false;
        var helmRequestComplete = new $.Deferred();
        var SendRequest = Compass.Global.Xhr.getNewSendRequest();

        SendRequest.callingFunction = arguments.callee.name;
        SendRequest.showProgress = false;

        var auditTypeId = 0;
        SendRequest.xhrData = "{'auditTypeId':" + JSON.stringify(null) +
            ",'loanSkey':" + JSON.stringify(Compass.Global.loanSkey) +
            "}";

        SendRequest.url = "/Webservice/Helm.asmx/GetAuditTracking";
        SendRequest.failureCallBackFunction = helm.handleXhrFailureCustom;

        Compass.Global.Xhr.post(SendRequest).done(function (data) {
            var xhrResponse = data.d.xhr;
            Compass.Global.Xhr.responseHandler(xhrResponse).done(function () {
                //$(".consoleLogOutput").append('<div class="consoleLog_helm">get audit tracking xhr request .done().</div>');
                if (xhrResponse.Success) {
                    success = true;
                    helm.AuditTrackingData = data.d;
                }
            });

            helmRequestComplete.resolve(success);
            //$(".consoleLogOutput").append('<div class="consoleLog_helm">Audit Tracking Resolve ' + success + '</div>');

        });

        //$(".consoleLogOutput").append('returning getAuditTracking promise</div>');
       
        return helmRequestComplete.promise();
    }
    
    helm.xhr.getAllTheData = function() {
        //$(".consoleLogOutput").append('<div class="consoleLog_helm">Making Database Calls</div>');
        
        Compass.Helm.xhr.getQuickSearchOptions();
        Compass.Helm.xhr.getAuditTracking();
        Compass.Helm.xhr.getLoanDetails();
    }

})(Compass.Helm, window, jQuery);

