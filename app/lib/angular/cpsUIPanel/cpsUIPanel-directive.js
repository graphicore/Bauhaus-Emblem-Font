define([
    'require/text!./cpsUIPanel.tpl'
    ], function(
    template
) {
    "use strict";
    function appDirective() {
        return {
            restrict: 'E' // only matches element names
          , controller: 'CPSUIPanelController'
          , replace: false
          , template: template
          , scope: true
          , bindToController: {
                // since Angular 1.4
                // use this like previously scope was used for binding
                // e.g: someBoundAttribute: '='
                // it will be available at this.someBoundAttribute in the
                // controller methods.
                element: '='
            }
          , controllerAs: 'ctrl'
          // , link: link
        };
    }
    appDirective.$inject = [];
    return appDirective;
});
