define([
    './_Node'
  , './Line'
], function(
    Parent
  , Line
) {
    "use strict";

    function Scene() {
        Parent.call(this);
    }
    var _p = Scene.prototype = Object.create(Parent.prototype);
    _p.constructor = Scene;

    Object.defineProperty(_p, 'type', {
        value: 'scene'
    });

    _p._acceptedChildren = Object.create(null);
    _p._acceptedChildren[Line.prototype.type] = Line;

    return Scene;
});
