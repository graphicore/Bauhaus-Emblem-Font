define([
    'Atem-CPS/OMA/_Node'
  , './_PathCommand'
], function(
    Parent
  , _PathCommand
) {
    "use strict";

    function Glyph() {
        Parent.call(this);
    }
    var _p = Glyph.prototype = Object.create(Parent.prototype);
    _p.constructor = Glyph;

    _p._acceptedChildren = [_PathCommand];

    return Glyph;
});
