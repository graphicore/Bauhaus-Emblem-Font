<ol>
<li ng-repeat="item in ctrl.items"
        ng-switch="item.type">
        {{item.propertyName}} ({{item.type}}) [{{item.id}}]:
        <mtk-cps-ui-number
            ng-switch-when="number"
            item="item"
            ></mtk-cps-ui-number>
        <mtk-cps-ui-string
            ng-switch-when="string"
            item="item"
            >?</mtk-cps-ui-string>
</li>
</ol>
