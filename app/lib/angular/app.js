define([
    'angular'
  , './app-controller'
  , './app-directive'
  , 'Atem-CPS-Developer-Tool/cpsPanel/cpsPanel'
  , './cpsUIPanel/cpsUIPanel'
], function(
    angular
  , Controller
  , directive
  , cpsPanel
  , cpsUIPanel
) {
    "use strict";
    return angular.module('BauhausEmblemFont', [cpsPanel.name, cpsUIPanel.name])
      .controller('AppController', Controller)
      .directive('bauhausEmblemFont', directive)
      ;
});
