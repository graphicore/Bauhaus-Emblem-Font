define([
    'Atem-Property-Language/UI'
], function(
    UI
) {
    "use strict";
    function CPSUIStringController($scope) {
        this.$scope = $scope;
        $scope.$on('$destroy', this._destroy.bind(this));
    }

    CPSUIStringController.$inject = ['$scope'];
    var _p = CPSUIStringController.prototype;

    _p._destroy = function() {

    };


    return CPSUIStringController;
});
