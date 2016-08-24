define([
    'require/text!./string.tpl'
    ], function(
    template
) {
    "use strict";
    function stringDirective() {
        return {
            restrict: 'E' // only matches element names
          , controller: 'CPSUIStringController'
          , replace: false
          , template: template
          , scope: true
          , bindToController: {
                item: '='
            }
          , controllerAs: 'ctrl'
          // , link: link
        };
    }
    stringDirective.$inject = [];
    return stringDirective;
});
