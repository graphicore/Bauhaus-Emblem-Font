define([
    'require/text!./number.tpl'
  , 'Atem-Property-Language/parsing/ASTOperation'
  , 'Atem-Property-Language/parsing/ASTGrouping'
  , 'Atem-Property-Language/parsing/_VoidToken'
  , 'Atem-Property-Language/flavours/MOM/Expression'
  , 'BEF/cpsTools'
  , 'Atem-Math-Tools/Vector'
    ], function(
    template
  , ASTOperation
  , ASTGrouping
  , _VoidToken
  , Expression
  , cpsTools
  , Vector
) {
    "use strict";

    /**
     *  Return the first none-_VoidToken in args or null;
     */
    function getFirstArg(args) {
        var i,l;
        for(i=0,l=args.length;i<l;i++) {
            if(args[i] instanceof _VoidToken)
                continue;
            return args[i];
        }
        return null;
    }

    //////
    // tools for _cpsUIInitDrag
    //////
    function replaceItemInAST(item, oldItem, newItem) {
        if(item === oldItem)
            return newItem;
        if(item instanceof ASTGrouping)
            return  replaceItemInASTGrouping(item, oldItem, newItem);
        if(item instanceof ASTOperation)
            return replaceItemInASTOperation(item, oldItem, newItem);
        // not changed
        return item;
    }

    function replaceItemInASTGrouping(grouping, oldItem, newItem) {
        // keep branches unchanged that are not changed by inserting newOperation
        var result
          , oldNodes = grouping.nodes
          , i, l, item
          , newNodes = []
          , changed = false
          ;
        for(i=0,l=oldNodes.length;i<l;i++) {
            item = oldNodes[i];
            result = replaceItemInAST(item, oldItem, newItem);
            newNodes.push(result);
            if(result !== item)
                changed = true;
        }
        return (changed
                    ? new ASTGrouping(grouping.groupingToken, newNodes)
                    : grouping);
    }

    function replaceItemInASTOperation(operation, oldItem, newItem) {
        // keep branches unchanged that are not changed by inserting newOperation
        var result
          , key, oldArgs, newArgs, i, l, item
          , allNewArgs = {
                postArguments: []
              , preArguments: []
            }
          , changed = false
          ;
        for(key in allNewArgs) {
            oldArgs = operation[key];
            newArgs = allNewArgs[key];
            for(i=0,l=oldArgs.length;i<l;i++) {
                item = oldArgs[i];
                result = replaceItemInAST(item, oldItem, newItem);
                newArgs.push(result);
                if(result !== item)
                    changed = true;
            }
        }
        return (changed
                    ? new ASTOperation(operation.operator
                                     , allNewArgs.preArguments
                                     , allNewArgs.postArguments)
                    : operation);
    }

    function replaceProperty(propertyDict, oldProperty, newProperty) {
        var propertyIndexes = propertyDict.find(oldProperty.name)
          , i, l, index
          ;
        for(i=0,l=propertyIndexes.length;i<l;i++) {
            index = propertyIndexes[i];
            // found
            if(propertyDict.getItem(index) === oldProperty) {
                propertyDict.splice(index, 1, newProperty);
                return true;
            }
        }
        // not found
        return false;
    }


    function update(event) {
        /* jshint validthis:true */
        var ast = this.property.value.value.ast
          , newAST , newOperation , newProperty, oldProperty
          // like: "(Vector 10 100)"
          // The parenthesis are intentional, so we don't have to know about
          // the nature of the other args;
          , newArgumentFormula, newArgument
          , firstArg
          , delta, newIntrinsic
          ;

        delta = event.clientX - this.initialPos.x;
        if(delta === 0)
            return;
        firstArg = getFirstArg(this.astOperation.postArguments);
        if(!firstArg)
            // this means there was no none-_VoidToken in postArguments
            throw new Error('A UI item must have at least one argument!');

        newIntrinsic = this.intrinsic + (delta / 10);
        newArgumentFormula = ['(' ,  newIntrinsic , ')'].join('');
        newArgument = Expression.factory(newArgumentFormula)[1].ast.nodes[0];
        // assert newArgument instanceof ASTGrouping
        // assert newArgument.groupingToken.literal === '('

        // <==specific | generic==>

        newOperation = replaceItemInAST(this.astOperation, firstArg, newArgument);
        if(newOperation === this.astOperation) {
            // because then we are unable to create a change here, for any reason
            // maybe the property was rewritten by another routine.
            // That means the update process lost its mandate.
            console.warn('newOperation === this.astOperation', newOperation);
            this.stop();
            return;
        }

        newAST = replaceItemInAST(ast, this.astOperation, newOperation);
        if(newAST === ast) {
            // because then we are unable to create a change here, for any reason
            // maybe the property was rewritten by another routine.
            // That means the update process lost its mandate.
            console.warn('newAST === ast', newAST);
            this.stop();
            return;
        }

        newProperty = cpsTools.makeProperty(this.property.name, new Expression(newAST));
        // remember this.property because we want to update it before
        // the call to replaceProperty.
        oldProperty = this.property;
        this.property = newProperty;
        this.astOperation = newOperation;

        // finally, bring the update to the model
        if(!replaceProperty(this.rule.properties, oldProperty, newProperty)) {
            // because then we are unable to create a change here, for any reason
            // maybe the property was rewritten by another routine.
            // That means the update process lost its mandate.
            console.warn('!replaceProperty');
            this.stop();
            return;
        }
    }

    function stop(doc, e) {
        /* jshint validthis:true, unused:vars */
        doc.removeEventListener('mousemove', this.update, false);
        doc.removeEventListener('mouseup', this.stop, false);
    }


    function init(item, event) {
        var element = event.target
          , uiItem = item.uiItem
          , doc = element.ownerDocument
          , state
          ;
        event.preventDefault();
        state = {
            rule: uiItem.rule
          , initialPos: new Vector(event.clientX, event.clientY)
          , intrinsic: uiItem.value
          // methods
          , update: null
          , stop: null
          // these are going to be changed on update:
          , property: uiItem.property
          , astOperation: uiItem.astOperation
        };

        state.update = update.bind(state);
        state.stop = stop.bind(state, doc);

        doc.addEventListener('mousemove', state.update);
        doc.addEventListener('mouseup', state.stop);
    }


    function numberDirective() {
        function link(scope, element, attrs, ctrl) {
            // sometimes, here the item uiItem in ctrl.item is not
            // yet the current item. Meaning that the operation fails here
            // how can we make sure that the uiItem is always the latest one.
            // ALSO, how is it possible that the latest update is lost
            // here for longer.
            // since the contents of item are set by the ui-panel, it seems
            // like there's a update skipped or so.
            element.on('mousedown', init.bind(null, ctrl.item));
        }
        return {
            restrict: 'E' // only matches element names
          , controller: 'CPSUINumberController'
          , replace: false
          , template: template
          , scope: true
          , bindToController: {
                item: '='
            }
          , controllerAs: 'ctrl'
          , link: link
        };
    }
    numberDirective.$inject = [];
    return numberDirective;
});
