/**
 * This is a great one to display the content:
 * ATEM
 * ATEM TOOLING EXPRESSIVE MODELS
 *
 * But The A in the first ATEM needs a better form, Like the B of the
 * original font without the bottom bar.
 * The other A is fine like that
 */

@namespace(scene) {
line glyph {
    before: baseNode:before * hu;
    width: baseNode:width * hu;
    after: baseNode:after * hu;
    advanceWidth: before + width + after;
    previous: parent:children[(index - 1)];
    /*#md Accumulate the `advanceWidth`s of the glyphs of this line. */
    startPos: previous:endPos + parent:spacing;
    endPos: startPos + advanceWidth;
}

line glyph:i(0) {
    /*#md
The first glyph has by default no `before` value, so that
it starts at the beginning of the line.

For optical alignments, this would have to be overridden. O the
`advanceWidth` property must be augmented.
    */
    before: 0;
    /* This stops the accumulation of the `advanceWidth`s. */
    startPos: 0;
}

line glyph:i(-1) {
    /* without "after" */
    endPos: startPos + before + width;
}

line:i(0) {
    baseline: 215;
    fontSize: -162;
    vGrid: 5;
    spacing: .06;
}

line:i(0) glyph:i(1) {
    before_: 0.001 * vu;
    afte_r: 0;
}

line:i(1) glyph:i(0) {
    after: -0.0002 * vu;
}

line:i(1) {
    baseline: 225;
    fontSize: 65;
    vGrid: 70;
    spacing: .02;
}

line {
    previous: parent:children[ index - 1 ];
    baseline: previous:baseline - lineHeight - fontSize;
    fontSize: previous:fontSize * .5;
    spacing: previous:spacing;
    lineHeight: 8;
    vGrid: previous:vGrid * 1;
    maxLength: deg 360;
    hu: deg 360 / vGrid;
    vu: fontSize;
    lastGlyph: children[ children:length - 1 ];
    length: lastGlyph:endPos;
}

line * {
    baseline: parent:baseline;
    vu: parent:vu;
    hu: parent:hu;
}

line:i(0) glyph command {
    sweepFlag: (List 1 0)[baseNode:sweepFlag];
    rotate: Rotation (-line:length/2 - deg -50.2);
    transform: translate * (Scaling 1 -1) * rotate;
}

glyph command {
    cmd: baseNode:cmd;
    _coord: baseNode:coord;
    _rx: baseNode:rx;
    _ry: baseNode:ry;
    translate: Translation 300 300;
    line: parent:parent;
    /* center alignment, the top of the canvas is the center */
    rotate: Rotation (-line:length/2 - deg 90);
    transform: translate * (Scaling 1 1) * rotate;
    coord: transform * Polar
        (baseline + _coord:x * vu)
        (parent:startPos + parent:before + _coord:y * hu);
    rx: baseline + (_rx * vu);
    ry: baseline + (_ry * vu);
    largeArcFlag: baseNode:largeArcFlag;
    sweepFlag: baseNode:sweepFlag;
}

@namespace("glyph.ref_A") {
command:i(-1),
command:i(-2) {
    top: parent:children[1]:coord;
    left: parent:children[0]:coord;
    right: parent:children[2]:coord;
}

command:i(-2) {
    coord: left + (top - left) * 0.25;
}

command:i(-1) {
    coord: right + (top - right) * 0.25;
}
}
}

@namespace(font) {
* {
    p0_0: Vector 0    0;
    p0_1: Vector 0    1;
    p1_0: Vector 0.28 0;
    p1_1: Vector 0.28 1;
    p2_0: Vector 0.56 0;
    p2_1: Vector 0.56 1;
    p3_0: Vector 0.75 0;
    p3_1: Vector 0.75 1;
    p4_0: Vector 1    0;
    p4_1: Vector 1    1;
    moveTo: "moveTo";
    lineTo: "lineTo";
    arcTo: "arcTo";
    close: "close";
    curveTo: "curveTo";
}

command {
    rx: coord:x;
}
}
