const Patch = require('../patch');
const chai = require('chai');
const expect = chai.expect;

let flour = { key: 1, text: 'flour' };
let eggs = { key: 2, text: 'eggs' };
let butter = { key: 3, text: 'butter' };
let milk = { key: 3, text: 'milk' };
let breakfast1 = { drink: 'coffee', meal: 'pancakes', ingredients: [ eggs, flour, milk ] };
let breakfast2 = { drink: 'oj', meal: 'pancakes', ingredients: [ eggs, flour, milk, butter ] }; 

class Article { constructor(props) { Object.assign(this, props); } static fromJSON(obj) { return new Article(obj); }}

let article1 = new Article({ key: 1, markdown: "yes", isPublic: false });
let article2 = new Article({ key: 2, markdown: "unflappable", isPublic: true });
let article3 = new Article({ key: 3, markdown: "toast", isPublic: true });

const logger = { 
    //debug(...args) { console.log(...args); } 
    debug() {}
};

describe("Diff", () => {

        it ("has names for operations", () => {
            expect(Patch.Del).to.equal("Del");
            expect(Patch.Ins).to.equal("Ins");
            expect(Patch.Nop).to.equal("Nop");
            expect(Patch.Rpl).to.equal("Rpl");
            expect(Patch.Mrg).to.equal("Mrg");
            expect(Patch.Arr).to.equal("Arr");
        });

        it("can do simple diff operations", () => {

            let a = {a : 1, b: 2, c: 3 };
            let b = {a : 1, b: 4, c: 3 };
            let patch = Patch.compare(a,b);
            expect(patch.name).to.equal(Patch.Mrg);
            logger.debug(patch);
            expect(patch.data.b.name).to.equal(Patch.Rpl);
            expect(patch.data.b.data).to.equal(4);

            let c = patch.patch(a);
            logger.debug(c);
            expect(c.b).to.equal(4);
        });

        it("Has a vaguely sane string representation for basic diff ops", () => {
            let a = {a : 1, b: 2, c: 3 };
            let b = {a : 1, b: 4, c: 3 };
            let patch = Patch.compare(a,b);
            expect(patch.toString()).to.equal("Mrg { b: Rpl 4 }");            
        });

        it("can diff arrays", () => {

            let a = [ { key: 1, text: "numpty" } ];
            let b = Array.from(a);
            b.push({ key: 4, text: "tumpty" });

            let patch = Patch.compare(a,b);
            logger.debug(patch.toString());
            expect(patch.name).to.equal(Patch.Arr);
            expect(patch.data.length).to.equal(1);
            expect(patch.data[0].op.name).to.equal(Patch.Ins); 
            expect(patch.data[0].key).to.equal(4);

            patch = Patch.compare(b,a);
            logger.debug(patch);
            expect(patch.name).to.equal(Patch.Arr);
            expect(patch.data.length).to.equal(1);
            expect(patch.data[0].op.name).to.equal(Patch.Del);
            expect(patch.data[0].key).to.equal(4);

        });

        it("Has a vaguely sane string representation for array diffs", () => {

            let a = [ { key: 1, text: "numpty" } ];
            let b = Array.from(a);
            b.push({ key: 4, text: "tumpty" });

            let patch = Patch.compare(a,b);
            logger.debug(patch.toString());
            expect(patch.toString()).to.equal("Arr [ Row { 4, Ins { key: 4, text: tumpty } } ]");

            patch = Patch.compare(b,a);
            logger.debug(patch.toString());
        });

        it("can patch arrays", () => {
            let a = [ { key: 1, text: "numpty" } ];
            let b = Array.from(a);
            b.push({ key: 4, text: "tumpty" });

            let patch = Patch.compare(a,b);
            let b2 = patch.patch(a);
            logger.debug(JSON.stringify(patch));

            expect(JSON.stringify(b2)).to.equal(JSON.stringify(b));

            let patch2 = Patch.compare(b,a);
            logger.debug(JSON.stringify(patch2));
            let a2 = patch2.patch(b);
            expect(JSON.stringify(a2)).to.equal(JSON.stringify(a));
           
        });

        it("can diff more complex objects", () => {
            let diff = Patch.compare(breakfast1, breakfast2);
            logger.debug(diff);
            logger.debug(diff.toJSON());
        });

        it("can be built from JSON", () => {
            let diff = Patch.compare(breakfast1, breakfast2);
            logger.debug(diff);
            let json = JSON.stringify(diff.toJSON());
            logger.debug(json);
            let diff2 = Patch.fromJSON(JSON.parse(json));
            logger.debug(diff2);
            let json2 = JSON.stringify(diff2.toJSON());
            logger.debug(json2);
            expect(json2).to.equal(json);
        });

        it("can patch an array of articles - adding an item in the middle", () => {
            let array1 = [ article1, article3 ];
            let array2 = [ article1, article2, article3 ];

            let diff = Patch.compare(array1, array2);
            logger.debug(diff.toString());
            let array3=diff.patch(array1, { arrayElementFactory: Article.fromJSON } );
            logger.debug(array3);
            expect(array3).to.have.lengthOf(3);
            expect(array3[1]).to.be.instanceof(Article);
        });

        it("can patch an array of articles - updateing a single item in the middle", () => {
            let array1 = [ article1, article2, article3 ];
            let array2 = [ article1, Object.assign(new Article(), article2, { markdown: "botulism"}), article3 ];

            let diff = Patch.compare(array1, array2);
            logger.debug(diff.toString());
            let array3=diff.patch(array1, { arrayElementFactory: Article.fromJSON });
            logger.debug(array3);
            expect(array3).to.have.lengthOf(3);
            expect(array3[1]).to.be.instanceof(Article);
            expect(array3[1].markdown).to.equal("botulism");
        });

        it("can patch an array of articles - via JSON", () => {
            let array1 = [ article1, article2, article3 ];
            let array2 = [ article1, Object.assign({}, article2, { markdown: "botulism"}), article3 ];

            let diff1 = Patch.compare(array1, array2);
            let json1 = JSON.stringify(diff1.toJSON());
            let obj = JSON.parse(json1);
            let diff2 = Patch.fromJSON(obj);
            let json2 = JSON.stringify(diff2.toJSON());
            expect(json1).to.equal(json2);
            let array3=diff2.patch(array1, { arrayElementFactory: Article.fromJSON });
            logger.debug(JSON.stringify(array3));
            expect(array3).to.have.lengthOf(3);
            expect(array3[1]).to.be.instanceof(Article);
            expect(array3[1].markdown).to.equal("botulism");
        });   
    }
);

