define([
   './_PathCommand'
], function(
    Parent
) {
    "use strict";

    function CloseCommand() {
        Parent.call(this);
    }
    var _p = CloseCommand.prototype = Object.create(Parent.prototype);
    _p.constructor = CloseCommand;

    return CloseCommand;
});
