define([
    'Atem-Property-Language/UI'
  , './CPSUIPanelItem'
], function(
    UI
  , CPSUIPanelItem
) {
    "use strict";
    function CPSUIPanelController($scope) {
        this.$scope = $scope;
        $scope.$on('$destroy', this._destroy.bind(this));
        this._properties = new Map();
        // items in order for the ng-repeat directive
        this.items = [];
        // this.element is bound via the directive
        this._styleDict = this.element.getComputedStyle();
        this._subscriptionID = this._styleDict.on(['add', 'change'], [this, 'update']);

        // init:
        this._checkAndAddUI(this._styleDict.keys);
        this._updateItems();
    }

    CPSUIPanelController.$inject = ['$scope'];
    var _p = CPSUIPanelController.prototype;

    _p._destroy = function() {
        this._styleDict.off(this._subscriptionID);
    };

    function getType(item) {
        var type;
        if(!(item instanceof UI))
            return false;
        type = typeof item.value;
        if(type !== 'string' && type !== 'number')
            return false;
        return type;
    }

    function uiFilter(item) {
        return getType(item) && true;
    }

    _p._updateItems = function() {
        // I'm not sure if it is significant for anguluar if the
        // ng-repeat collection has the same identity or not, to just
        // make updates where needed, thus, I'll keep the this.items
        // array around and just update it's contents.
        var args = [0, this.items.length]
          , keys = this._styleDict.keys
          , i, l, propertyName
          ;
        for(i=0,l=keys.length;i<l;i++) {
            propertyName = keys[i];
            if(this._properties.has(propertyName))
                args.push(this._properties.get(propertyName));
        }

        Array.prototype.splice.apply(this.items, args);
    };

    _p._checkAndAddUI = function(keys) {
        var i, l, propertyName, uiItem, item
          ;
        for(i=0,l=keys.length;i<l;i++) {
            propertyName = keys[i];
            // already monitored
            if(this._properties.has(propertyName))
                continue;
            uiItem = this._styleDict.get(propertyName, null);
            // not a uiElement
            if(!uiFilter(uiItem))
                continue;
            item = new CPSUIPanelItem();
            item.update(propertyName, getType(uiItem), uiItem);
            this._properties.set(propertyName, item);
        }
    };

    /**
     * returns false if item needs to be added again
     * returns true if property got sufficiently updated
     */
    _p._updateProperty = function(propertyName) {
        var properties = this._properties
          , item = properties.get(propertyName)
          , uiItem = this._styleDict.get(propertyName, null)
          , type = getType(uiItem)
          ;
        if(type !== item.type) {
            // The type changed, this must be re-added. Otherwise the
            // directive for the type would try to update with a wrong
            // value. So we delete it here and return false, then it gets
            // re-added later.
            properties.delete(propertyName);
            return false;
        }
        if(!uiFilter(uiItem))
            // no longer valid, remove
            properties.delete(propertyName);
        else
            item.update(propertyName, getType(uiItem), uiItem);
        return true;
    };

    _p._update = function update(data, channelKey, eventData) {
        var  properties = this._properties
           , seen
           , i, l, keys, propertyName
           ;

        // process change;
        seen = new Set();
        keys = eventData;
        for(i=0,l=keys.length;i<l;i++) {
            propertyName = keys[i];
            if(seen.has(propertyName)
                    // properties wouldn't have this if it was not added
                    // yet. We want to have this checked again below
                    // at detect additions.
                    || !properties.has(propertyName))
                continue;

            if(this._updateProperty(propertyName))
                seen.add(propertyName);
        }

        // detect additions
        keys = this._styleDict.keys.filter(function(key) {
                // if we have seen it when updating, we're not interested
                // if it is already in properties this is not an addition
                return !(seen.has(key) || properties.has(key));
        });
        this._checkAndAddUI(keys);
    };

    _p.update = function(data, channelKey, eventData) {
        this._update(data, channelKey, eventData);
        this._updateItems();
        this.$scope.$apply();
    };

    return CPSUIPanelController;
});
