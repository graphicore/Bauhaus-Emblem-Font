define([
   './_PathCommand'
], function(
    Parent
) {
    "use strict";

    function ArcToCommand() {
        Parent.call(this);
    }
    var _p = ArcToCommand.prototype = Object.create(Parent.prototype);
    _p.constructor = ArcToCommand;

    return ArcToCommand;
});
