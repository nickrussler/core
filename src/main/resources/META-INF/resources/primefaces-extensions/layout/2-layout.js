PrimeFacesExt.widget.Layout = function(id, cfg) {
    var config = cfg;
    var clientId = id;
    var jqId = PrimeFaces.escapeClientId(id);
    var indexTab = cfg.indexTab;

    var northOpt = $.extend({}, {
        resizeWithWindowDelay: 250
        , slidable: false
        , north__paneSelector: jqId + "-layout-outer-north"
        , center__paneSelector: jqId + "-layout-outer-center"
    }, cfg.northOptions);

    var tabLayoutOpt = cfg.tabLayoutOpt;
    var centerLayoutOpt = cfg.centerLayoutOpt;
    var westLayoutOpt = cfg.westLayoutOpt;
    var eastLayoutOpt = cfg.eastLayoutOpt;
    var southLayoutOpt = cfg.southLayoutOpt;

    var jqTarget = $(cfg.forTarget);
    var clientState = cfg.clientState;
    var serverState = cfg.serverState;
    var state = null;
    var stateHiddenField = null;
    
    if (clientState) {
        state = $.parseJSON(PrimeFaces.getCookie(encodeURIComponent('pfext.layout.' + clientId)));
    } else if (serverState) {
        state = $.parseJSON(cfg.state);
        stateHiddenField = $(jqId + "_state");
    }

    var _self = this;

    var defaultLayoutSettings = {
        onopen: function(panename, pane, state, options) {
            _self.onopen(options.paneposition);
        }
        , onclose: function(panename, pane, state, options) {
            _self.onclose(options.paneposition);
        }
        , onresize: function(panename, pane, state, options) {
            _self.onresize(options.paneposition, state);
        }
        , slidable: false
        , contentSelector: '.ui-layout-pane-content'
        , togglerTip_open: cfg.togglerTipClose
        , togglerTip_closed: cfg.togglerTipOpen
        , resizerTip: cfg.resizerTip
    };

    var peOuterLayout;
    var peTabsContainerLayout;
    var peTabLayout;
    var peWestLayout;
    var peEastLayout;
    var peSouthLayout;
    var peCenterLayout;
    var peLayoutTabsLoading = true;

    var keysNorth = "north.size,north.isClosed,north.isHidden";
    var keysAllExceptNorth = "south.size,east.size,west.size,south.isClosed,east.isClosed,west.isClosed,south.isHidden,east.isHidden,west.isHidden";
    var keysAll = keysNorth + "," + keysAllExceptNorth;

    /* public access */

    this.buildOuterTabsLayout = function() {
        if ((serverState || clientState) && state && state.peOuterLayout) {
            $.extend(northOpt, createOptionsFromSavedState(state.peOuterLayout.north, null, null, null));
        }
        peOuterLayout = jqTarget.layout(northOpt);

        peTabsContainerLayout = $(jqId + "-layout-outer-center").layout({
            resizable: false
            , slidable: false
            , closable: false
            , north__paneSelector: jqId + "-layout-tabbuttons"
            , center__paneSelector: jqId + "-layout-tabpanels"
            , spacing_open: 0
            , center__onresize: resizeTabPanelLayout
        });

        if (indexTab < 0) {
            // no tabs
            resizeOrCreateLayout();
            return;
        }

        peOuterLayout.panes.center.tabs({
            create: function (evt, ui) {
                $(jqId + "-layout-tabbuttons").find(".ui-tab > a[href^='#']").attr('href', function(i, oldHref) {
                    return oldHref.substring(1);
                });
            },
            show: function (evt, ui) {
                resizeOrCreateLayout();
            },
            select: function(evt, ui) {
                location.href = ui.tab.href;
                return false;
            },
            selected: indexTab
        });
    }

    this.onopen = function(paneposition) {
        var behavior = config.behaviors ? config.behaviors['open'] : null;
        if (behavior) {
            var ext = {
                params: {}
            };
            ext.params[clientId + '_pane'] = paneposition;
            behavior.call(this, paneposition, ext);
        }
        
        if (stateHiddenField && stateHiddenField.length > 0) {
            stateHiddenField.val(getLayoutState());
        }        
    }

    this.onclose = function(paneposition) {
        var behavior = config.behaviors ? config.behaviors['close'] : null;
        if (behavior) {
            var ext = {
                params: {}
            };
            ext.params[clientId + '_pane'] = paneposition;
            behavior.call(this, paneposition, ext);
        }
        
        if (stateHiddenField && stateHiddenField.length > 0) {
            stateHiddenField.val(getLayoutState());
        }        
    }

    this.onresize = function(paneposition, state) {
        if (!state.isClosed && !state.isHidden) {
            var behavior = config.behaviors ? config.behaviors['resize'] : null;
            if (behavior) {
                var ext = {
                    params : {}
                };
                ext.params[clientId + '_pane'] = paneposition;
                ext.params[clientId + '_width'] = state.innerWidth;
                ext.params[clientId + '_height'] = state.innerHeight;
                behavior.call(this, paneposition, ext);
            }
            
            if (stateHiddenField && stateHiddenField.length > 0) {
                stateHiddenField.val(getLayoutState());
            }            
        }
    }

    this.allowOverflow = function(pane) {
        if (pane === 'north') {
            peOuterLayout.allowOverflow('north');
        } else if (pane === 'center' && peTabLayout) {
            peTabLayout.panes.center.allowOverflow('center');
        } else if (pane === 'west' && peTabLayout) {
            peTabLayout.panes.west.allowOverflow('west');
        } else if (pane === 'east' && peTabLayout) {
            peTabLayout.panes.east.allowOverflow('east');
        } else if (pane === 'south' && peTabLayout) {
            peTabLayout.panes.south.allowOverflow('south');
        }
    }

    this.resetOverflow = function(pane) {
        if (pane === 'north') {
            peOuterLayout.resetOverflow('north');
        } else if (pane === 'center' && peTabLayout) {
            peTabLayout.panes.center.resetOverflow('center');
        } else if (pane === 'west' && peTabLayout) {
            peTabLayout.panes.west.resetOverflow('west');
        } else if (pane === 'east' && peTabLayout) {
            peTabLayout.panes.east.resetOverflow('east');
        } else if (pane === 'south' && peTabLayout) {
            peTabLayout.panes.south.resetOverflow('south');
        }
    }

    /* private access */

    var resizeOrCreateLayout = function() {
        if (peLayoutTabsLoading) {
            peLayoutTabsLoading = false;
            peTabsContainerLayout.resizeAll();
        }
        // resize OR create the tab-layout
        resizeTabPanelLayout();
        peOuterLayout.panes.center.show();
    }

    var resizeTabPanelLayout = function() {
        var jtLayoutTabPanel = $(jqId + "-layout-tabpanels > div.ui-layout-tab");

        if (jtLayoutTabPanel.data("layoutContainer")) {
            jtLayoutTabPanel.layout().resizeAll();
        } else {
            if ((serverState || clientState) && state && state.peTabLayout) {
                $.extend(tabLayoutOpt, createOptionsFromSavedState(
                        null, state.peTabLayout.south, state.peTabLayout.west, state.peTabLayout.east));
            }

            peTabLayout = jtLayoutTabPanel.layout($.extend({}, defaultLayoutSettings, tabLayoutOpt));
            if (peTabLayout == null) {
                return;
            }

            if (peTabLayout.panes.west && westLayoutOpt != null) {
                if ((serverState || clientState) && state && state.peWestLayout) {
                    $.extend(westLayoutOpt, createOptionsFromSavedState(
                        state.peWestLayout.north, state.peWestLayout.south, state.peWestLayout.west, state.peWestLayout.east));
                }

                peWestLayout = peTabLayout.panes.west.layout($.extend({}, defaultLayoutSettings, westLayoutOpt));
            }

            if (peTabLayout.panes.east && eastLayoutOpt != null) {
                if ((serverState || clientState) && state && state.peEastLayout) {
                    $.extend(eastLayoutOpt, createOptionsFromSavedState(
                        state.peEastLayout.north, state.peEastLayout.south, state.peEastLayout.west, state.peEastLayout.east));
                }

                peEastLayout = peTabLayout.panes.east.layout($.extend({}, defaultLayoutSettings, eastLayoutOpt));
            }
            
            if (peTabLayout.panes.south && southLayoutOpt != null) {
                if ((serverState || clientState) && state && state.peSouthLayout) {
                    $.extend(southLayoutOpt, createOptionsFromSavedState(
                        state.peSouthLayout.north, state.peSouthLayout.south, state.peSouthLayout.west, state.peSouthLayout.east));
                }

                peSouthLayout = peTabLayout.panes.south.layout($.extend({}, defaultLayoutSettings, southLayoutOpt));
            }            

            if (centerLayoutOpt != null) {
                if ((serverState || clientState) && state && state.peCenterLayout) {
                    $.extend(centerLayoutOpt, createOptionsFromSavedState(
                        state.peCenterLayout.north, state.peCenterLayout.south, state.peCenterLayout.west, state.peCenterLayout.east));
                }

                peCenterLayout = peTabLayout.panes.center.layout($.extend({}, defaultLayoutSettings, centerLayoutOpt));
            }
        }
    }

    var createOptionsFromSavedState = function(north, south, west, east) {
        var opts = {};

        if (north) {
            opts.north__size = north.size,
            opts.north__initClosed = north.initClosed,
            opts.north__initHidden = north.initHidden
        }

        if (south) {
            opts.south__size = south.size,
            opts.south__initClosed = south.initClosed,
            opts.south__initHidden = south.initHidden
        }

        if (west) {
            opts.west__size = west.size,
            opts.west__initClosed = west.initClosed,
            opts.west__initHidden = west.initHidden
        }

        if (east) {
            opts.east__size = east.size,
            opts.east__initClosed = east.initClosed,
            opts.east__initHidden = east.initHidden
        }

        return opts;
    }
    
    var getLayoutState = function() {
        var state = {};
        state.peOuterLayout = peOuterLayout.getState(keysNorth);

        if (peTabLayout) {
            state.peTabLayout = peTabLayout.getState(keysAllExceptNorth);
        }
        if (peWestLayout) {
            state.peWestLayout = peWestLayout.getState(keysAll);
        }
        if (peEastLayout) {
            state.peEastLayout = peEastLayout.getState(keysAll);
        }
        if (peSouthLayout) {
            state.peSouthLayout = peSouthLayout.getState(keysAll);
        }            
        if (peCenterLayout) {
            state.peCenterLayout = peCenterLayout.getState(keysAll);
        }
        
        return peOuterLayout.encodeJSON(state);
    }
    
    if (jqTarget.is(':visible')) {
        this.buildOuterTabsLayout();
        if (indexTab >= 0) {
            // tabs
            $(jqId + '-layout-tabbuttons').find('.ui-tab').corner('top 6px');
        }
    } else {
        var hiddenParent = jqTarget.parents('.ui-hidden-container:first');
        var hiddenParentWidget = hiddenParent.data('widget');

        if (hiddenParentWidget) {
            hiddenParentWidget.addOnshowHandler(function() {
                _self.buildOuterTabsLayout();
                if (indexTab >= 0) {
                    // tabs
                    $(_self.jqId + '-layout-tabbuttons').find('.ui-tab').corner('top 6px');
                }
            });
        }
    }

    if (clientState) {
        $(window).unload(function() {
            // the cookie will be a session cookie and will not be retained when the the browser exits
            PrimeFaces.setCookie(encodeURIComponent('pfext.layout.' + clientId), getLayoutState());
        });
    }

    this.postConstruct();
}

PrimeFaces.extend(PrimeFacesExt.widget.Layout, PrimeFaces.widget.BaseWidget);
