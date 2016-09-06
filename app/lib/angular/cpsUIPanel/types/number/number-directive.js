define([
    'require/text!./number.tpl'
  , 'BEF/errors'
  , 'Atem-Property-Language/parsing/ASTOperation'
  , 'Atem-Property-Language/parsing/ASTGrouping'
  , 'Atem-Property-Language/parsing/_VoidToken'
  , 'Atem-Property-Language/flavours/MOM/Expression'
  , 'BEF/cpsTools'
  , 'Atem-Math-Tools/Vector'
    ], function(
    template
  , errors
  , ASTOperation
  , ASTGrouping
  , _VoidToken
  , Expression
  , cpsTools
  , Vector
) {
    "use strict";

    // FIXME: it would be advisable to separate the view logic from the
    // business logic. Though that's not so straight forward, look at init
    // where `state` is created ... all concerns (event handling/business)
    // get's mixed. Clean separation will however be key to make this
    // reusable code.

    var svgns = 'http://www.w3.org/2000/svg'
      , ValueError = errors.Value
      , CPSUIError = errors.CPSUI
      ;

    /**
     * from https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/round
     */
    function round(number, precision) {
        var factor = Math.pow(10, -precision);
        var tempNumber = number * factor;
        var roundedTempNumber = Math.round(tempNumber);
        return roundedTempNumber / factor;
    }

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
          , delta, deltaMagnitude, roundPrecision, newIntrinsic
          , marks
          , roc
        ;
        firstArg = getFirstArg(this.astOperation.postArguments);
        if(!firstArg)
            // this means there was no none-_VoidToken in postArguments
            throw new Error('A UI item must have at least one argument!');

        delta = event.clientX - this.initialPos.x;
        deltaMagnitude = this.args.get('delta').value;
        delta = delta * Math.pow( 10, deltaMagnitude);

        roc = this.args.get('roc');
        if (roc === 'cubic')
            delta = Math.pow(delta, 3);

        newIntrinsic = this.intrinsic + delta;

        roundPrecision = this.args.get('precision');

        if(roundPrecision !== null)
            newIntrinsic = round(newIntrinsic, roundPrecision);


        marks = this.args.get('mark');
        if(marks.min !== null)
            newIntrinsic = Math.max(marks.min.value, newIntrinsic);
        if(marks.max !== null)
            newIntrinsic = Math.min(marks.max.value, newIntrinsic);

        if(this.intrinsic === newIntrinsic)
            return;

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
          , uiItem, doc, state
          ;
        if(!element.hasAttribute('data-is-ui'))
            return;
        uiItem = item.uiItem;
        doc = element.ownerDocument;
        event.preventDefault();

        state = {
            rule: uiItem.rule
          , initialPos: new Vector(event.clientX, event.clientY)
          , intrinsic: uiItem.value // need all arguments to render and to change update behavior
          // for now we make a difference between arguments updates and value updates
          // although, there's not so much difference when we start to change
          // arguments via cps-ui (but that's not so urgent).
          , args: parseArgs(uiItem.arguments.slice(1))
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

    var UIArguments = (function() {
    // bad indentation because this will become its own module

    function UIArguments(setup, args) {
        this._setup = this._parseSetup(setup);
        this._parsed = this._parseArgs(args);
    }
    var _p = UIArguments.prototype;

    UIArguments.factory = function parseArgs(argsSetup, args) {
        return new UIArguments(argsSetup, args);
    };

    _p._parseSetup = function(setup) {
        var result = Object.create(null)
          , k, setting, amount
          ;
        for(k in setup) {
            result[k] = setting = Object.create(null);
            if( (amount = setup[k].amount) )
                setting.amount = typeof amount === 'number'
                    ? [amount, amount]
                    : amount // [min, max]
                    ;
            else
                // default is one
                setting.amount = [1, 1];
            setting.valueFunc = setup[k].valueFunc || null;
            setting.afterFunc = setup[k].afterFunc || null;
        }
        return result;
    };

    _p._parseKeyword = function(keywordString, i, args) {
        var setup, data, keyword, valueFunc
          , consumed = 0
          , result = {
                flags: null
              , values: null
            }
          ;
                // split by any whitespace
        data = keywordString.split(/\s+/)
                // remove empty entries (from beginning and end)
                .filter(function(s){ return !!s; })
                ;

        keyword = data[0];
        if(!(keyword in this._setup))
            throw new CPSUIError(
                keyword
                    ? 'Unknown keyword string "'+keyword+'"'
                    : 'Empty keyword string "'+keyword+'"'
            );
        setup = this._setup[keyword];
        result.flags = new Set(data.slice(1));

        // A function that accepts or refuses an input as value.
        // If accepted, consumed is increased by one.
        // Runs until it refuses an input and should know the number of the
        // iteration (=consumed), so it can shut down when it has had enough.
        result.values = [];
        valueFunc = setup.valueFunc;
        while(valueFunc && valueFunc(args[i+=1], consumed)) {
            consumed++;
            result.values.push(args[i]);
        }

        return [keyword, result, consumed];
    };

    _p._parseArgs = function (args) {
        var result = Object.create(null)
          , kwData, keyword
          , i, l, k, item, setup, count
          ;

        for(i=0,l=args.length;i<l;i++) {
            item = args[i];
            if(typeof item !== 'string')
                throw new CPSUIError('Expected a keyword string but got a ('
                                        + (typeof item) + '): ' + item);
            kwData = this._parseKeyword(item, i, args);
            keyword = kwData[0];
            setup = this._setup[keyword];
            // Check amount? Min can only be checked later but we can break
            // up early here.
            if(!(keyword in result))
                result[keyword] = [];
            else if(result[keyword].length > setup.amount[1])
                throw new CPSUIError('Keyword "' + keyword + '" has more occurences '
                    + 'than ' + setup.amount[1] + '.');

            result[keyword].push(kwData[1]);
            // skips the consumed items
            i += kwData[2];
        }
        for( k in this._setup ) {
            setup = this._setup[k];
            count = k in result
                        ? result[k].length
                        : 0
                        ;

            if(setup.amount[0] > 0 && setup.amount[0] < count)
                throw new CPSUIError('Not enough occurences of keyword '
                        + '"' + k +'" '
                        + 'required is ' + setup.amount[0] + ' '
                        + 'but got: ' + count + '.');
            if(setup.afterFunc)
                // using `.call(null, ...) because there's no reason
                // why after should have access to setup.
                result[k] = setup.afterFunc.call(null, result[k] || []);
        }
        return result;
    };

    _p.get = function(keyword) {
        return this._parsed[keyword];
    };
    return UIArguments;
    // bad indentation end;
    })();

    /**
     *
     * A keyword with its flags is given as one compound string
     * if a value is following a keyword it's given as a value.
     *
     * The parser can and will raise errors, these can be displayed
     * in the user interface directly.
     *
     * TODO: different interfaces for the same value may need differnt
     * arguments. It would be nice to have a solution where one UI element
     * can be configured for different interface types.
     * We'll need a good case for this before implementing anything.
     *
     * // n of these
     * "mark <flags>" value
     *     arguments:
     *         number (required)
     *     flags:
     *         "limiting"
     *             Set the mark to be a boundary. The lower bound
     *             will be min and the upper bound will be max.
     *             If more than two boundaries are defined, the
     *             boundaries with values between lower and upper
     *             are discarded.
     *         "min" or "max" (optional) default: "min"
     *             min and max are only used if there is just one
     *             boundary defined.
     *
     * "unbounded" (TODO!)
     *     While editing, the drag handle can leave the ui-elements
     *     canvas to give better/different feedback.
     *     After editing the disllay will be adjusted.
     *     (experimental)
     *     // will need state information from the changing action
     *     // which is kind of sub-optimal! maybe the changing
     *     // action would have to draw itself, which is kind of
     *     // against the current concept of using the feedback to
     *     // update the display.
     *
     * "delta <flags>" magnitude
     *     arguments:
     *         magnitude:integer default 0 (optional)
     *             The final delta will be calculated by:
     *             `delta * Math.pow( 10, magnitude)`
     *             So, a negative magnitude moves the decimal point
     *             to the left while a positive value moves it to
     *             the right.
     *             Math.pow( 10, 3)
     *                 > 1000
     *             Math.pow( 10, 0)
     *                 > 1
     *             Math.pow( 10, -3)
     *                 > 0.001
     *             `magnitude` must be a whole number (integer).
     *     flags:
     *         "move" default (if feasible: test this!)
     *         "interval" (TODO!)
     * "roc <flags>"
     *     Rate of change function.
     *     flags:
     *         "linear" default
     *             The change corresponds to the raw determined
     *             change; e.g. actual pixels of mouse movement.
     *         "cubic"
     *             Math.pow(change, 3), setting `delta magnitude`
     *             to something negative may help here to make
     *             the effect less extreme.
     *             Using cubic here because it works nicely with
     *             negative inputs as well.
     *             The idea here is that the having the mouse
     *             further away from the origin creates at some point
     *             a bigger change than the linear version. With
     *             lower inputs it should be more sensitive than
     *             the linear one.
     *         tbc. if requested.
     * "precision" magnitude
     *     Round to precision. maginute works as in delta and
     *     describes the first significant decimal position, the
     *     default (without precision) is doing nothing. To round
     *     to integers magnitude must be 0.
     *     arguments:
     *         magnitude:integer (required)
     */
    var uiArgumentsSetup = {
        mark: {
            amount: [0, Infinity]
          , valueFunc: function(value, i) {
                // jshint unused: vars
                return typeof value === 'number';
            }
          , afterFunc: function (items) {
                var i, l, mark
                  , limits = []
                  , marks = []
                  , min = null
                  , max = null
                  , origin = null
                  ;
                for (i=0,l=items.length;i<l;i++) {
                    mark = items[i];
                    if(!mark.values.length)
                        // FIXME: amount of values expected could be checked
                        // by the parser easily. This will be missed by
                        // other implementations otherwise.
                        throw new CPSUIError('Mark i '+i+' misses it\'s value.');
                    mark.value = mark.values[0];
                    if(mark.flags.has('limiting'))
                        limits.push(mark);
                    else
                        marks.push(mark);

                    if(!origin && mark.flags.has('origin'))
                        origin = mark;
                }

                if(limits.length > 1)
                    for (i=0,l=limits.length;i<l;i++) {
                        if(!min || min.value > limits[i].value)
                            min = limits[i];
                        if(!max || max.value < limits[i].value)
                            max = limits[i];
                    }
                else if(limits.length === 1)
                    if (limits[0].flags.has('max'))
                        max = limits[0];
                    else
                        min = limits[0];

                return {min: min, max: max, marks: marks, origin: origin};
            }
        }
      , unbounded: {
            // this behaves like a flag, also currently not implemented
            amount: [0, 1]
        }
      , delta: {
            // defaults to `"delta move" 0` if not present
            amount: [0, 1]
          , valueFunc: function(magnitude, i) {
                // jshint unused: vars
                if (typeof magnitude !== 'number')
                    return false;
                if (!isFinite(magnitude))
                    throw new CPSUIError('Wrong type, `magnitude` of `delta` '
                            + 'must be finite but is: ' + magnitude + '.');
                return true;
            }
          , afterFunc: function (items) {
                return {
                        value: items.length ? items[0].values[0] : 0
                      , flags: items.length ? items[0].flags : new Set()
                };
            }
        }
      , roc: {
            // defaults to "roc linear" if not present
            amount: [0, 1]
          , afterFunc: function (items) {
                if(items.length)
                    if(items[0].flags.has('cubic'))
                        return 'cubic';
                return 'linear';
            }
        }
      , precision: {
            amount: [0, 1]
          , valueFunc: function(magnitude, i) {
                // jshint unused: vars
                if (typeof magnitude !== 'number')
                    return false;
                if (magnitude !== (magnitude | 0))
                    throw new CPSUIError('Wrong type, `magnitude` of `precision` '
                            + 'must be an integer, but is: ' + magnitude + '.');
                return true;
            }
          , afterFunc: function (items) {
                return items.length ? items[0].values[0] : null;
            }
        }
    };
    var parseArgs = UIArguments.factory.bind(null, uiArgumentsSetup);


    function getSvg(doc, width, height) {
        var svg = doc.createElementNS(svgns, 'svg');
        svg.setAttribute('viewbox', [0, 0, width, height].join(' '));
        svg.setAttribute('width', width);
        svg.setAttribute('height', height);
        return svg;
    }
    function makePolygon(doc, points) {
        var item = doc.createElementNS(svgns, 'polygon');
        item.setAttribute('points',
                points.map(function(item){ return item.join(',');})
                      .join(' '));
        return item;
    }

    function drawItem(doc, type, position) {
        var width = 20, height = 20
          , item, svg
          , marginLeft
          ;
        switch(type) {
            case 'handle':
                item = doc.createElementNS(svgns, 'ellipse');
                item.setAttribute('cx', width/2);
                item.setAttribute('cy', height/2);
                item.setAttribute('rx', width/2);
                item.setAttribute('ry', height/2);
                item.setAttribute('data-is-ui', '');
                marginLeft = -width/2;
                break;
            case 'min':
                width = width/2;
                item = makePolygon(doc, [
                    [0, 0]
                  , [0, height]
                  , [width, height/2]
                ]);
                marginLeft = -width;
                break;
            case 'max':
                width = width/2;
                item = makePolygon(doc, [
                    [0, height/2]
                  , [width, height]
                  , [width, 0]
                ]);
                marginLeft = 0;
                break;
            case 'mark':
                item = makePolygon(doc, [
                    [0, height/2]
                  , [width/2, height]
                  , [width, height/2]
                  , [width/2, 0]
                ]);
                marginLeft = -width/2;
                break;
            default:
                throw new ValueError('Unknown type: "' + type + '".');
        }

        svg = getSvg(doc, width, height);
        svg.classList.add('slider-item', 'type-'+type);
        svg.appendChild(item);
        svg.style.position = 'absolute';
        svg.style.left = (100 * position)+ '%';
        svg.style.marginLeft = marginLeft + 'px';

        return svg;
    }


    function _normalizeValue(min, max, value) {
        return (value - min) / (max - min);
    }

    function drawItems(elem, type, items, min, max) {
        var position
          , item, value
          , i, l
          ;
        for(i=0,l=items.length;i<l;i++) {
            value = items[i];
            // position is between 0 and 1
            position = _normalizeValue(min, max, value);
            item = drawItem(elem.ownerDocument, type, position);
            elem.appendChild(item);
        }
    }

    function _getValue(item){ return item.value; }

    function getMinMax(marks, uiItem) {
        // get the biggest and smallest value to display, this way
        // we know the bounds to draw for the widget.
       var allValues = marks.marks.slice()
         , min, max
         ;
        if(marks.max !== null)
            allValues.push(marks.max);
        if (marks.min !== null)
            allValues.push(marks.min);
        allValues = allValues.map(_getValue);
        allValues.push(uiItem.value);
        max = Math.max.apply(null, allValues);
        min = Math.min.apply(null, allValues);
        return [min, max];
    }

    // the standard sort function in js is broken for numbers
    function _sortNum(a, b){ return a-b;}

    function _cutout(lines, cutLine) {
        var i, l, line, result = [];
        cutLine.sort(_sortNum);
        for(i=0,l=lines.length;i<l;i++) {
            line = lines[i];
            line.sort(_sortNum);

            // total overlap, line is removed
            if(line[0] >= cutLine[0] && line[1] <= cutLine[1])
                continue;

            // no overlap, all of line is bigger/smaller than the range of cutLine
            if(line[0] >= cutLine[1] || line[1] <= cutLine[0]) {
                result.push(line);
                continue;
            }

            // has a range smaller than, but overlapping with cutline
            if(line[0] < cutLine[0])
                result.push([line[0], cutLine[0]]);

            // has a range bigger than, but overlapping with cutline
            if(line[1] > cutLine[1])
                result.push([cutLine[1], line[1]]);
        }
        return result;
    }

    function _drawRanges(elem, type, lines) {
        // hmm, line as a div?
        var i, l, line;
        for(i=0,l=lines.length;i<l;i++) {
            line = elem.ownerDocument.createElement('div');
            line.classList.add('line', 'type-' + type);
            line.style.position = 'absolute';
            line.style.left = (lines[i][0] * 100) + '%';
            line.style.width = ((lines[i][1] - lines[i][0]) * 100) + '%';
            elem.appendChild(line);
        }
    }

    function drawLines(elem, val, minimum, maximum, marks) {
        // normalize values beween 0 and 1
        var _normalize = _normalizeValue.bind(null, minimum, maximum)
          , min = 0
          , max = 1
          , marksMin = marks.min
                        ? _normalize(marks.min.value)
                        : null
          , marksMax = marks.max
                        ? _normalize(marks.max.value)
                        : null
          , origin = marks.origin
                        ? _normalize(marks.origin.value)
                        : null
          , value = _normalize(val)
          , magnitude = null
          , potential = null
          , overflow = null
          , unreachables = []
          ;

        // Let's see how this works out:
        //
        // value magnitude indicator, solid line:
        // My understanding is that a solid line should visualize the
        // magnitude of the value.
        // between marks.min and value if there is a marks.min
        // between marks.max and value if there is no marks.min
        // FIXME: maybe add an "origin" flag, which would be the origin
        // of the magnitude line between origin and value, if present

        if(origin !== null)
            magnitude = [origin, value];
        else if (marksMin !== null)
            magnitude = [marksMin, value];
        else if (marksMin !== null)
            magnitude = [marksMax, value];

        // value potential indicator, solid line but opacity = .5 to make
        // it less dominant.
        // If there is a marks.min and a marks.max, between value and marks.max
        // should be everywhere, where the value can go.
        // so, easiest is to draw it as one line, can take care of "gaps"
        // later. Gaps are where the magnitude indicator is drawn.

        // from marks.min or min - offset (to indicate unboundedness)
        // to marks.max or max + offset (to indicate unboundedness)
        // the unboundedness is indicated, because the value won't ever
        // cover it, because it's outside of the box.
        potential = [
            marksMin !== null
                    ? marksMin
                    : min - 0.02
          , marksMax !== null
                    ? marksMax
                    : max + 0.02
        ];

        // value overflow indicator, {red?} line
        // between value and marks.min if value < marks.min
        // beween value and marks.max if value > marks.max
        if(marksMin !== null && value < marksMin)
            overflow = [value, marksMin];
        else if(marksMax !== null && value > marksMax)
            overflow = [value, marksMax];

        // unreachable indicator, dashed line:
        // if marks are outside of the potential, they serve as as scale
        // but they are unreachable.
        // between global min and marks.min if global min < marks.min
        // between global max and marks.max if global max > marks.max
        if(marksMin !== null && min < marksMin)
            unreachables.push([min, marksMin]);
        if(marksMax !== null && max > marksMax)
            unreachables.push([max, marksMax]);


        // potential may not cover magnitude
        potential = [potential];
        if (magnitude !== null) {
            potential = _cutout(potential, magnitude);
            magnitude = [magnitude];
        }

        if (overflow !== null)
            // unreachable{Low|high} may not cover overflow
            unreachables = _cutout(unreachables, overflow);


        if (magnitude !== null && overflow !== null)
            // magnitude may not cover overflow
            magnitude = _cutout(magnitude, overflow);

        _drawRanges(elem, 'potential', potential);
        _drawRanges(elem, 'unreachable', unreachables);
        if (magnitude !== null)
            _drawRanges(elem, 'magnitude', magnitude);
        if (overflow !== null)
            _drawRanges(elem, 'overflow', [overflow]);
    }

    /**
     * Attention: needs a `this` value (=state)
     */
    function _draw(container, item) {
        // jshint validthis: true
        // clean the slate
        while(container.lastChild)
            container.removeChild(container.lastChild);

        // parse the arguments of uiItem and draw the wiget accordingly.
        // TODO: UIArguments parse the values as well, or have access to
        // the parsed values.

        var uiArgs = item.uiItem.arguments.slice(1)
          , argsString = uiArgs.join(' ')
          // adhoc caching, no need to parse this for each draw
          , args = this.args = this.argsString !== argsString
                    ? parseArgs(uiArgs)
                    : this.args
          , marks = args.get('mark')
          , minMax = getMinMax(marks, item.uiItem)
          , min = minMax[0]
          , max = minMax[1]
          ;
        this.argsString = argsString;
        drawLines(container, item.uiItem.value, min, max, marks);

        // if min === max this fails
        drawItems(container, 'mark', marks.marks.map(_getValue),min, max);
        if(marks.min !== null)
            drawItems(container, 'min', [marks.min.value], min, max);
        if(marks.max !== null)
            drawItems(container, 'max', [marks.max.value], min, max);
        drawItems(container, 'handle', [item.uiItem.value], min, max);
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

            // one listener for all mousedowns for now
            element.on('mousedown', init.bind(null, ctrl.item));

            var container = element[0].ownerDocument.createElement('div')
              , redrawHandler = _draw.bind(Object.create(null), container, ctrl.item)
              , subscription = ctrl.item.on('update', redrawHandler)
              ;
            container.classList.add('slider-canvas');
            redrawHandler();
            element.append(container);
            // It's likely that item gets destroyed now as well.
            // But, you can't know that for sure in here!
            element.on('$destroy', function() {
                ctrl.item.off(subscription);
            });

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
