const Patch = require('../patch');
const Ops = require('../operations')
const chai = require('chai');
const expect = chai.expect;
const debug = require('debug')('typed-patch~tests');

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

const MAP_PROPS = { map: true, key: e=>e.key, value: e=>e, entry: (k,v)=>v };
const ARTICLE_MAP_PROPS = { map: true, key: e=>e.key, value: e=>e, entry: (k,v)=>v, collectionElementFactory: Article.fromJSON };

describe("Patch", () => {

        it("can do simple diff operations", () => {

            let a = {a : 1, b: 2, c: 3 };
            let b = {a : 1, b: 4, c: 3 };
            let patch = Patch.compare(a,b);
            expect(patch.name).to.equal(Ops.Mrg.name);
            debug(patch);
            expect(patch.data.b.name).to.equal(Ops.Rpl.name);
            expect(patch.data.b.data).to.equal(4);

            let c = patch.patch(a);
            debug(c);
            expect(c.b).to.equal(4);
        });

        it("Has a vaguely sane string representation for basic diff ops", () => {
            let a = {a : 1, b: 2, c: 3 };
            let b = {a : 1, b: 4, c: 3 };
            let patch = Patch.compare(a,b);
            expect(patch.toString()).to.equal("Mrg { b: Rpl 4 }");            
        });

        it("can diff maps", () => {

            let a = new Map([[ 1, "numpty" ]]);
            let b = new Map(a.entries());
            b.set(4,"tumpty");

            let patch = Patch.compare(a,b);
            debug(patch);
            expect(patch.name).to.equal(Ops.Map.name);
            expect(patch.data.length).to.equal(1);
            expect(patch.data[0].op.name).to.equal(Ops.Ins.name); 
            expect(patch.data[0].key).to.equal(4);

            patch = Patch.compare(b,a);
            debug(patch);
            expect(patch.name).to.equal(Ops.Map.name);
            expect(patch.data.length).to.equal(1);
            expect(patch.data[0].op.name).to.equal(Ops.DEL.name);
            expect(patch.data[0].key).to.equal(4);

        });

        it("can diff arrays as if they are maps", () => {

            let a = [ { key: 1, text: "numpty" } ];
            let b = Array.from(a);
            b.push({ key: 4, text: "tumpty" });

            let patch = Patch.compare(a,b, MAP_PROPS);
            debug(patch.toString());
            expect(patch.name).to.equal(Ops.Map.name);
            expect(patch.data.length).to.equal(1);
            expect(patch.data[0].op.name).to.equal(Ops.Ins.name); 
            expect(patch.data[0].key).to.equal(4);

            patch = Patch.compare(b,a,MAP_PROPS);
            debug(patch);
            expect(patch.name).to.equal(Ops.Map.name);
            expect(patch.data.length).to.equal(1);
            expect(patch.data[0].op.name).to.equal(Ops.DEL.name);
            expect(patch.data[0].key).to.equal(4);

        });

        it("Has a vaguely sane string representation for map diffs", () => {

            let a = [ { key: 1, text: "numpty" } ];
            let b = Array.from(a);
            b.push({ key: 4, text: "tumpty" });

            let patch = Patch.compare(a,b,MAP_PROPS);
            debug(patch.toString());
            expect(patch.toString()).to.equal("Map [ Row { 4, Ins { key: 4, text: tumpty } } ]");

            patch = Patch.compare(b,a,MAP_PROPS);
            debug(patch.toString());
        });

        it("Has a vaguely sane string representation for array diffs", () => {

            let a = [ { text: "numpty" } ];
            let b = Array.from(a);
            b.push({ text: "tumpty" });

            let patch = Patch.compare(a,b);
            debug(patch.toString());
            expect(patch.toString()).to.equal("Arr [ Row { 1, Ins { text: tumpty } } ]");

            patch = Patch.compare(b,a);
            debug(patch.toString());
            expect(patch.toString()).to.equal("Arr [ Row { 1, Del } ]");
        });

        it("can patch maps", () => {
            let a = new Map([[ 1, "numpty" ]]);
            let b = new Map(a.entries());
            b.set(4,"tumpty");

            let patch = Patch.compare(a,b);
            let b2 = patch.patch(a);
            debug(patch,b,b2);

            expect(b2).to.deep.equal(b);

            let patch2 = Patch.compare(b,a);
            debug(JSON.stringify(patch2));
            let a2 = patch2.patch(b);
            expect(JSON.stringify(a2)).to.equal(JSON.stringify(a));
           
        });

        it("can patch arrays as maps", () => {
            let a = [ { key: 1, text: "numpty" } ];
            let b = Array.from(a);
            b.push({ key: 4, text: "tumpty" });

            let patch = Patch.compare(a,b,MAP_PROPS);
            let b2 = patch.patch(a,MAP_PROPS);
            debug(JSON.stringify(patch));

            expect(JSON.stringify(b2)).to.equal(JSON.stringify(b));

            let patch2 = Patch.compare(b,a,MAP_PROPS);
            debug(JSON.stringify(patch2));
            let a2 = patch2.patch(b,MAP_PROPS);
            expect(JSON.stringify(a2)).to.equal(JSON.stringify(a));      
        });

        it("can patch arrays", () => {
            let a = [ { text: "numpty" } ];
            let b = Array.from(a);
            b.push({ text: "tumpty" });

            let patch = Patch.compare(a,b);
            let b2 = patch.patch(a);
            debug(JSON.stringify(patch));

            expect(JSON.stringify(b2)).to.equal(JSON.stringify(b));

            let patch2 = Patch.compare(b,a);
            debug(JSON.stringify(patch2));
            let a2 = patch2.patch(b);
            expect(JSON.stringify(a2)).to.equal(JSON.stringify(a));
        });

        it("can diff more complex objects", () => {
            let diff = Patch.compare(breakfast1, breakfast2);
            debug(diff);
            debug(diff.toJSON());
        });

        it("can be built from JSON", () => {
            let diff = Patch.compare(breakfast1, breakfast2);
            debug(diff);
            let json = JSON.stringify(diff.toJSON());
            debug(json);
            let diff2 = Patch.fromJSON(JSON.parse(json));
            debug(diff2);
            let json2 = JSON.stringify(diff2.toJSON());
            debug(json2);
            expect(json2).to.equal(json);
        });

        it("can patch an map of articles - adding an item in the middle", () => {
            let array1 = [ article1, article3 ];
            let array2 = [ article1, article2, article3 ];

            let diff = Patch.compare(array1, array2, ARTICLE_MAP_PROPS);
            debug(diff.toString());
            let array3=diff.patch(array1, ARTICLE_MAP_PROPS);
            debug(array3);
            expect(array3).to.have.lengthOf(3);
            expect(array3[1]).to.be.instanceof(Article);
        });

        it("can patch an array of articles - adding an item in the middle", () => {
            let array1 = [ article1, article3 ];
            let array2 = [ article1, article2, article3 ];

            let diff = Patch.compare(array1, array2, ARTICLE_MAP_PROPS);
            debug(diff.toString());
            let array3=diff.patch(array1, ARTICLE_MAP_PROPS );
            debug(array3);
            expect(array3).to.have.lengthOf(3);
            expect(array3[1]).to.be.instanceof(Article);
        });

        it("can patch an map of articles - updateing a single item in the middle", () => {
            let map1 = new Map([
                [ article1.key, article1 ], 
                [ article2.key, article2 ],
                [ article3.key, article3 ]
            ]);

            let map2 = new Map(map1.entries());
            
            map2.set(article2.key, Object.assign(new Article(), article2, { markdown: "botulism"} ));

            let diff = Patch.compare(map1, map2);
            debug(diff.toString());
            let map3=diff.patch(map1, { collectionElementFactory: Article.fromJSON });
            debug(map3);
            expect(map3.size).to.equal(3);
            expect(map3.get(article2.key)).to.be.instanceof(Article);
            expect(map3.get(article2.key).markdown).to.equal("botulism");
        });

        it("can patch an array of articles - replacing a single item in the middle", () => {
            let array1 = [ article1, article2, article3 ];
            let array2 = [ article1, Object.assign(new Article(), article2, { markdown: "botulism"}), article3 ];

            let diff = Patch.compare(array1, array2, ARTICLE_MAP_PROPS);
            debug(diff.toString());
            let array3=diff.patch(array1, ARTICLE_MAP_PROPS);
            debug(array3);
            expect(array3).to.have.lengthOf(3);
            expect(array3[1]).to.be.instanceof(Article);
            expect(array3[1].markdown).to.equal("botulism");
        });

        it("can patch an map of articles - via JSON", () => {
            let array1 = [ article1, article2, article3 ];
            let array2 = [ article1, Object.assign({}, article2, { markdown: "botulism"}), article3 ];

            let diff1 = Patch.compare(array1, array2, ARTICLE_MAP_PROPS);
            let json1 = JSON.stringify(diff1.toJSON());
            let obj = JSON.parse(json1);
            let diff2 = Patch.fromJSON(obj);
            let json2 = JSON.stringify(diff2.toJSON());
            expect(json1).to.equal(json2);
            let array3=diff2.patch(array1, ARTICLE_MAP_PROPS);
            debug(JSON.stringify(array3));
            expect(array3).to.have.lengthOf(3);
            expect(array3[1]).to.be.instanceof(Article);
            expect(array3[1].markdown).to.equal("botulism");
        });

        it("ingores calculated attrbutes", () => {
            class C1 { constructor(a,b) { this.a = a; this.b = b; } get sum() { return this.a + this.b; } }
            let c1 = new C1(1,2);
            let c2 = new C1(1,3);
            let diff = Patch.compare(c1,c2);
            debug(diff);
            let c3 = diff.patch(c1, { elementType: C1 } );
            expect(c3).to.be.an.instanceof(C1);
            expect(c3.a).to.equal(1);
            expect(c3.b).to.equal(3);
            expect(c3.sum).to.equal(4);
        });
    }
);

