define([
   './_PathCommand'
], function(
    Parent
) {
    "use strict";

    function LineToCommand() {
        Parent.call(this);
    }
    var _p = LineToCommand.prototype = Object.create(Parent.prototype);
    _p.constructor = LineToCommand;

    return LineToCommand;
});
