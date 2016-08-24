define([
    'Atem-Property-Language/UI'
], function(
    UI
) {
    "use strict";
    function CPSUINumberController($scope) {
        this.$scope = $scope;
        $scope.$on('$destroy', this._destroy.bind(this));
    }

    CPSUINumberController.$inject = ['$scope'];
    var _p = CPSUINumberController.prototype;

    _p._destroy = function() {

    };


    return CPSUINumberController;
});
