define([
    'Atem-CPS/OMA/_Node'
  , './Line'
] function(
    Parent
  , Line
) {
    "use strict";

    function Scene() {
        Parent.call(this);
    }
    var _p = Scene.prototype = Object.create(Parent.prototype);
    _p.constructor = Scene;

    _p._acceptedChildren = [Line];

    return Scene;
});
