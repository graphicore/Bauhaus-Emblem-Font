define([
   './_PathCommand'
], function(
    Parent
) {
    "use strict";

    function MoveToCommand() {
        Parent.call(this);
    }
    var _p = MoveToCommand.prototype = Object.create(Parent.prototype);
    _p.constructor = MoveToCommand;

    return MoveToCommand;
});
