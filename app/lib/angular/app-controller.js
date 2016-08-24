define([], function() {
    "use strict";
    function AppController($scope, cpsController) {
        this.$scope = $scope;
        this.$scope.$on('echo-request', this._echoRequest.bind(this));
        // linking scene here to give some initial element for
        // CPSUIPanel. Likeley, there wil be another CPS-UI-Panel Controller
        // later, that controls which BEOM elements are displayed
        this.cpsController = cpsController;
        this.scene = cpsController.rootNode.scene;
    }

    AppController.$inject = ['$scope', 'cpsController'];
    var _p = AppController.prototype;

    _p._echoRequest = function(event, request) {
        this.$scope.$broadcast(request.name, request.data);
    }

    return AppController;
});
