define([
    'Atem-CPS/emitterMixin'
], function(
    emitterMixin
) {
    "use strict";

    var emitterSetup = {
          stateProperty: '_channel'
        , onAPI: 'on'
        , offAPI: 'off'
        , triggerAPI: '_trigger'
    };

    function CPSUIPanelItem() {
        this._propertyName = null;
        this._type = null;
        this._uiItem = null;
        // sets the this._channel property
        emitterMixin.init(this, emitterSetup);
    }
    var _p = CPSUIPanelItem.prototype;
    _p.constructor = CPSUIPanelItem;

    emitterMixin(_p, emitterSetup);

    Object.defineProperties(_p, {
        propertyName: {
            get: function(){ return this._propertyName; }
          , enumerable: true
        }
      , type: {
            get: function(){ return this._type; }
          , enumerable: true
        }
      , uiItem: {
            get: function(){ return this._uiItem; }
          , enumerable: true
        }
    });

    _p.update = function(propertyName, type, uiItem) {
        this._propertyName = propertyName;
        this._type = type;
        this._uiItem = uiItem;
        this._trigger('update');
    };

    return CPSUIPanelItem;
});
