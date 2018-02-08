define([
    'Atem-CPS/_Controller'
], function(
    Parent
) {
    "use strict";

    function CPSController(ruleController, rootInstance) {
        Parent.apply(this, arguments);
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
        return this._root.getAttachment('cpsFile');
    };

    return CPSController;
});
