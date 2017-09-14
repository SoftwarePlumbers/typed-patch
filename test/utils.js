const utils = require('../utils');
const chai = require('chai');
const expect = chai.expect;


const logger = { 
    //debug(...args) { console.log(...args); } 
    debug() {}
};

describe("Utils", () => {

        it ("calulates LCS Table", () => {

            let s1 = [ 'X', 'M', 'J', 'Y', 'A', 'U', 'Z' ];
            let s2 = [ 'M', 'Z', 'J', 'A', 'W', 'X', 'U' ];

            let result = [];
            result[0] = [ 0, 0, 0, 0, 0, 0, 0, 0 ]
            result[1] = [ 0, 0, 0, 0, 0, 0, 1, 1 ]
            result[2] = [ 0, 1, 1, 1, 1, 1, 1, 1 ]
            result[3] = [ 0, 1, 1, 2, 2, 2, 2, 2 ]
            result[4] = [ 0, 1, 1, 2, 2, 2, 2, 2 ]
            result[5] = [ 0, 1, 1, 2, 3, 3, 3, 3 ]
            result[6] = [ 0, 1, 1, 2, 3, 3, 3, 4 ]
            result[7] = [ 0, 1, 2, 2, 3, 3, 3, 4 ]

            let lengths = utils.lcsTable(s1, s2);

            for (row of lengths) logger.debug(row);

            expect(lengths).to.deep.equal(result);
        });

        it ("does array diff", () => {

            let s1 = [ 'X', 'M', 'J', 'Y', 'A', 'U', 'Z' ];
            let s2 = [ 'M', 'Z', 'J', 'A', 'W', 'X', 'U' ];
            let diff = "";

            utils.diff(s1, s2, 
                (add,i)     => { diff = `${diff}|${i}:+${add}` },
                (remove,i)  => { diff = `${diff}|${i}:-${remove}` },
                (a,b,i)     => { diff = `${diff}|${i}:${a}` },
                (a,b)       => a === b
            );

            logger.debug(diff);

            expect(diff).to.equal("|0:-X|1:M|1:+Z|2:J|3:-Y|4:A|4:+W|4:+X|5:U|6:-Z");
        });

        it ("does array diff with comparator", () => {

            let s1 = [ {k:'X'}, {k:'M'}, {k:'J'}, {k:'Y'}, {k:'A'}, {k:'U'}, {k:'Z'} ];
            let s2 = [ {k:'M'}, {k:'Z'}, {k:'J'}, {k:'A'}, {k:'W'}, {k:'X'}, {k:'U'} ];
            let diff = "";

            utils.diff(s1, s2, 
                (add,i)     => { diff = `${diff}|${i}:+${add.k}` },
                (remove,i)  => { diff = `${diff}|${i}:-${remove.k}` },
                (a,b,i)     => { diff = `${diff}|${i}:${a.k}` },
                (a,b)       => a.k === b.k
            );

            logger.debug(diff);

            expect(diff).to.equal("|0:-X|1:M|1:+Z|2:J|3:-Y|4:A|4:+W|4:+X|5:U|6:-Z");
        });
});