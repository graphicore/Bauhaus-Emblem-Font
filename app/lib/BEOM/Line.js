define([
    'Atem-CPS/OMA/_Node'
  , './Glyph'
] function(
    Parent
  , Glyph
) {
    "use strict";

    function Line() {
        Parent.call(this);
    }
    var _p = Line.prototype = Object.create(Parent.prototype);
    _p.constructor = Line;

    // Glyph? The same as in Font?
    // How does it reference its base from Font? Probably CPS.
    _p._acceptedChildren = [Glyph];

    return Line;
});
