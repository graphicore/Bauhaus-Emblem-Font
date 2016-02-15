define([
    'Atem-CPS/OMA/_Node'
  , './Glyph'
] function(
    Parent
  , Glyph
) {
    "use strict";

    function Font() {
        Parent.call(this);
    }
    var _p = Font.prototype = Object.create(Parent.prototype);
    _p.constructor = Font;

    _p._acceptedChildren = [Glyph];

    return Font;
});
