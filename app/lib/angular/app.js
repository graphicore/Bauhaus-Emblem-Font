define([
    'angular'
  , './app-controller'
  , './app-directive'
  , 'Atem-CPS-Developer-Tool/cpsPanel/cpsPanel'
], function(
    angular
  , Controller
  , directive
  , cpsPanel
) {
    "use strict";
    return angular.module('BauhausEmblemFont', [cpsPanel.name])
      .controller('AppController', Controller)
      .directive('bauhausEmblemFont', directive)
      ;
});
