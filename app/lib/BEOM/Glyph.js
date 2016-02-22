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
        this._referenceGlyph = null;
    }
    var _p = Glyph.prototype = Object.create(Parent.prototype);
    _p.constructor = Glyph;

    _p._cps_whitelist = {
        referenceNode: 'referenceNode'
    };
    //inherit from parent
    (function(source) {
        for(var k in source) if(!this.hasOwnProperty(k)) this[k] = source[k];
    }).call(_p._cps_whitelist, Parent.prototype._cps_whitelist);

    _p.validators = Object.create(null);
    _p.validators.before = _p.validators.width = _Node.validateNumber;
    _p.validators.after = _p.validators.verticalAdvance = _Node.validateNumber;

    Object.defineProperty(_p, 'referenceNode', {
        get: function() {
            return this._referenceNode;
        }
      , set: function(glyph) {
            this._referenceNode = glyph || null;
        }
    });

    Object.defineProperty(_p, 'type', {
        value: 'glyph'
    });

    _p._acceptedChildren = [Command];

    return Glyph;
});
