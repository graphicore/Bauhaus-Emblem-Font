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

line:i(0),
line:i(1) {
    baseline: 100;
    fontSize: 42;
    /*
    vGrid: 65;
    spacing: .075;
    */
    vGrid: 53;
    spacing: .058;
}

line:i(0) {
    fontSize: -42;
    baseline: 142;
}

line:i(0) command {
    transform: translate * (Scaling 1 -1) * rotate;
    sweepFlag: (List 1 0)[baseNode:sweepFlag];
}

line {
    previous: parent:children[ index - 1 ];
    baseline: previous:baseline - lineHeight * fontSize;
    fontSize: previous:fontSize * .75;
    spacing: previous:spacing;
    lineHeight: 1.5;
    vGrid: previous:vGrid * 1.3;
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

/* does the job of kerning */

@namespace(line:i(1)) {
glyph:i(8) {
    before: .06;
}

glyph:i(14) {
    /* the second S in EXPRESSIVE */
    after: .03;
}
}

@namespace(line:i(0)) {
glyph:i(0) {
    /* A of ATEM */
    after: -.05;
}

glyph.ref_T {
    width: baseNode:width * hu * scaleWidth;
    scaleWidth: 1.3;
}

glyph.ref_T command {
    _coord: (Scaling 1 parent:scaleWidth) * baseNode:coord;
}
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
