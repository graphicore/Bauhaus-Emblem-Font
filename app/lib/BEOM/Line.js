define([
    'Atem-CPS/OMA/_Node'
  , './Glyph'
], function(
    Parent
  , Glyph
) {
    "use strict";

    function Line() {
        Parent.call(this);
    }
    var _p = Line.prototype = Object.create(Parent.prototype);
    _p.constructor = Line;

    _p._acceptedChildren = [Glyph];

    return Line;
});
