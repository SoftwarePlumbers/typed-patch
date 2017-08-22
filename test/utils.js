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
                (skip,i)    => { diff = `${diff}|${i}:${skip}` }
            );

            logger.debug(diff);

            expect(diff).to.equal("|0:-X|1:M|1:+Z|2:J|3:-Y|4:A|4:+W|4:+X|5:U|6:-Z");
        });
});