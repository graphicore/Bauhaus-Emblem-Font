define([
    'Atem-CPS/OMA/_Root'
  , './Scene'
], function(
    Parent
  , Scene
) {
    "use strict";

    function Root(controller, scene /* optional */) {
        Parent.call(this, controller);

        this.add(scene || new Scene()); // 0
        Object.freeze(this._children);
    }
    var _p = Root.prototype = Object.create(Parent.prototype);
    _p.constructor = Root;

    _p._acceptedChildren = [Scene];

    _p._cps_whitelist = {
      , scene: 'scene'
    };
    //inherit from parent
    (function(source) {
        for(var k in source) if(!this.hasOwnProperty(k)) this[k] = source[k];
    }).call(_p._cps_whitelist, Parent.prototype._cps_whitelist);

    Object.defineProperty(_p, 'scene', {
        get: function() {
            return this._children[0];
        }
    });

    _p.clone = function(cloneElementProperties) {
        var clone = new this.constructor(this._controller
                            , this.scene.clone(cloneElementProperties)
                            );
        this._cloneProperties(clone, cloneElementProperties);
        return clone;
    };
});
