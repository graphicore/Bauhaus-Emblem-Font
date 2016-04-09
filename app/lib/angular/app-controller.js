define([], function() {
    "use strict";
    function AppController($scope) {
        this.$scope = $scope;
        this.$scope.$on('echo-request', this._echoRequest.bind(this));
    }

    AppController.$inject = ['$scope'];
    var _p = AppController.prototype;

    _p._echoRequest = function(event, request) {
        this.$scope.$broadcast(request.name, request.data);
    }

    return AppController;
});
