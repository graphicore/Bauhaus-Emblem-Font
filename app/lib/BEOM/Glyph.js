define([
    './_Node'
  , './Command'
], function(
    _Node
  , Command
) {
    "use strict";

    var Parent = _Node;

    function Glyph() {
        Parent.call(this);
    }
    var _p = Glyph.prototype = Object.create(Parent.prototype);
    _p.constructor = Glyph;

    //inherit from parent
    (function(source) {
        for(var k in source) if(!this.hasOwnProperty(k)) this[k] = source[k];
    }).call(_p._cps_whitelist, Parent.prototype._cps_whitelist);

    _p.validators = Object.create(null);
    _p.validators.before = _p.validators.width = _Node.validateNumber;
    _p.validators.after = _p.validators.verticalAdvance = _Node.validateNumber;

    Object.defineProperty(_p, 'type', {
        value: 'glyph'
    });

    _p._acceptedChildren = Object.create(null);
    _p._acceptedChildren[Command.prototype.type] = Command;

    return Glyph;
});
