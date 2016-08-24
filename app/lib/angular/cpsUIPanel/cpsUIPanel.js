define([
    'angular'
  , './cpsUIPanel-controller'
  , './cpsUIPanel-directive'
  , './types/number/number'
  , './types/string/string'
], function(
    angular
  , Controller
  , directive
  , uiNumber
  , uiString
) {
    "use strict";
    return angular.module('cpsUIPanel', [uiNumber.name, uiString.name])
      .controller('CPSUIPanelController', Controller)
      .directive('mtkCpsUiPanel', directive)
      ;
});
