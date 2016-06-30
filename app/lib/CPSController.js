define([
    'Atem-CPS/_Controller'
], function(
    Parent
) {
    "use strict";

    function CPSController(ruleController, rootNodeFactory, selectorEngine, cpsFile) {
        Parent.apply(this, arguments);
        this._cpsFile = cpsFile;
    }

    var _p = CPSController.prototype = Object.create(Parent.prototype);
    _p.constructor = CPSController;

    /**
     * Return a string that will be used with RuleController.getRule(false, cpsName);
     *
     * Applications can decide themselves which CPS files apply to which
     * part of thee OMA-tree.
     */
    _p.getCPSName = function(element) {
        return this._cpsFile;
    };

    return CPSController;
});
