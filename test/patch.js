const Patch = require('../patch');
const chai = require('chai');
const expect = chai.expect;

let flour = { uid: 1, text: 'flour' };
let eggs = { uid: 2, text: 'eggs' };
let butter = { uid: 3, text: 'butter' };
let milk = { uid: 3, text: 'milk' };
let breakfast1 = { drink: 'coffee', meal: 'pancakes', ingredients: [ eggs, flour, milk ] };
let breakfast2 = { drink: 'oj', meal: 'pancakes', ingredients: [ eggs, flour, milk, butter ] }; 

class Article { constructor(props) { Object.assign(this, props); } static fromObject(obj) { return new Article(obj); }}

let article1 = new Article({ uid: 1, markdown: "yes", isPublic: false });
let article2 = new Article({ uid: 2, markdown: "unflappable", isPublic: true });
let article3 = new Article({ uid: 3, markdown: "toast", isPublic: true });

describe("Diff", () => {

        it("can do simple diff operations", () => {

            let a = {a : 1, b: 2, c: 3 };
            let b = {a : 1, b: 4, c: 3 };
            let patch = Patch.compare(a,b);
            expect(patch.name).to.equal(Patch.Mrg);
            console.log(patch);
            expect(patch.data.b.name).to.equal(Patch.Rpl);
            expect(patch.data.b.data).to.equal(4);

            let c = patch.patch(a);
            expect(c.b).to.equal(4);
        });
/*
        it("can diff arrays", () => {

            let a = [ { uid: 1, text: "numpty" } ];
            let b = Array.from(a);
            b.push({ uid: 4, text: "tumpty" });

            let diff = Diff.compare(a,b);
            expect(diff.op).to.equal(Diff.ARRAY);
            expect(diff.data.length).to.equal(1);
            expect(diff.data[0].op).to.equal(Diff.INSERT);
            expect(diff.data[0].data.uid).to.equal(4);

            diff = Diff.compare(b,a);
            expect(diff.op).to.equal(Diff.ARRAY);
            expect(diff.data.length).to.equal(1);
            expect(diff.data[0].op).to.equal(Diff.REMOVE);
            expect(diff.data[0].uid).to.equal(4);
        });

        it("can patch arrays", () => {
            let a = [ { uid: 1, text: "numpty" } ];
            let b = Array.from(a);
            b.push({ uid: 4, text: "tumpty" });

            let b2 = Diff.compare(a,b).patch(a);

            expect(JSON.stringify(b2)).to.equal(JSON.stringify(b));

            let a2 = Diff.compare(b,a).patch(b);
            expect(JSON.stringify(a2)).to.equal(JSON.stringify(a));
           
        });

        it("can diff more complex objects", () => {
            let diff = Diff.compare(breakfast1, breakfast2);
            //console.log(JSON.stringify(diff)); 
        });

        it("can be built from JSON", () => {
            let diff = Diff.compare(breakfast1, breakfast2);
            let astring = JSON.stringify(diff);
            let json = JSON.parse(astring);
            let diff2 = Diff.fromObject(json);
            expect(JSON.stringify(diff2)).to.equal(astring);
        });

        it("can patch an array of articles - adding an item in the middle", () => {
            let array1 = [ article1, article3 ];
            let array2 = [ article1, article2, article3 ];

            let diff = Diff.compare(array1, array2);
            //console.log(JSON.stringify(diff));
            let array3=diff.patch(array1, Article.fromObject);

            expect(array3).to.have.lengthOf(3);
            expect(array3[1]).to.be.instanceof(Article);
        });

        it("can patch an array of articles - updateing a single item in the middle", () => {
            let array1 = [ article1, article2, article3 ];
            let array2 = [ article1, article2.setMarkdown("botulism"), article3 ];

            let diff = Diff.compare(array1, array2);
            //console.log(JSON.stringify(diff));
            let array3=diff.patch(array1, Article.fromObject);

            expect(array3).to.have.lengthOf(3);
            expect(array3[1]).to.be.instanceof(Article);
            expect(array3[1].markdown).to.equal("botulism");
        });

        it("can patch an array of articles - via JSON", () => {
            let array1 = [ article1, article2, article3 ];
            let array2 = [ article1, article2.setMarkdown("botulism"), article3 ];

            let diff1 = Diff.compare(array1, array2);
            let json1 = JSON.stringify(diff1);
            let obj = JSON.parse(json1);
            let diff2 = Diff.fromObject(obj);
            let json2 = JSON.stringify(diff2);
            expect(json1).to.equal(json2);
            let array3=diff2.patch(array1, Article.fromObject);

            expect(array3).to.have.lengthOf(3);
            expect(array3[1]).to.be.instanceof(Article);
            expect(array3[1].markdown).to.equal("botulism");
        });

*/
    }
);

