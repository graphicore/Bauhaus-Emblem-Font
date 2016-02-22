define([
    './_Node'
  , './Glyph'
], function(
    Parent
  , Glyph
) {
    "use strict";

    function Font() {
        Parent.call(this);
    }
    var _p = Font.prototype = Object.create(Parent.prototype);
    _p.constructor = Font;

    Object.defineProperty(_p, 'type', {
        value: 'font'
    });

    _p._acceptedChildren = [Glyph];

    return Font;
});
