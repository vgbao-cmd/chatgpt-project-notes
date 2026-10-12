const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
let listener,events=[],editor,execAllowed=true,execCalls=0;
class TextArea {constructor(){this.tagName='TEXTAREA';this._value='';this.disabled=false;}get value(){return this._value}set value(v){this._value=v}getClientRects(){return [1]}getAttribute(){return null}focus(){this.focused=true}dispatchEvent(e){events.push(e.type)}}
class Editable {constructor(){this.tagName='DIV';this.innerText=''}getClientRects(){return [1]}getAttribute(){return 'true'}focus(){this.focused=true}}
const ctx=vm.createContext({console,HTMLTextAreaElement:TextArea,Event:class{constructor(type){this.type=type}},window:{getSelection:()=>({removeAllRanges(){},addRange(){}})},document:{querySelectorAll:()=>editor?[editor]:[],createRange:()=>({selectNodeContents(){}}),createElement:()=>({attachShadow:()=>({append(){}}),addEventListener(){}}),documentElement:{append(){}},execCommand:(command,_,text)=>{assert.equal(command,'insertText');execCalls++;if(execAllowed)editor.innerText=text;return execAllowed}},chrome:{runtime:{onMessage:{addListener:fn=>listener=fn},sendMessage(){}}}});
vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'..','content.js'),'utf8'),ctx);
function send(text){let result;listener({type:'insertContext',text},null,r=>result=r);return result}
editor=new TextArea();assert.equal(send('Hello\nSushi').ok,true);assert.equal(editor.value,'Hello\nSushi');assert.deepEqual(events,['input']);assert.equal(send('Overwrite').ok,false);assert.equal(editor.value,'Hello\nSushi');
editor=new Editable();assert.equal(send('<script>literal</script>\nSushi').ok,true);assert.equal(editor.innerText,'<script>literal</script>\nSushi');assert.equal(execCalls,1);assert.equal(send('Replace').ok,false);
editor=new Editable();execAllowed=false;assert.equal(send('Test').ok,false);editor=null;assert.equal(send('Missing').ok,false);
editor=new TextArea();assert.equal(send('x'.repeat(200001)).ok,false);assert.equal(editor.value,'');
console.log('Content checks passed: textarea input, plain-text contenteditable insertion, existing-draft protection, missing editor, failed command, size limit. No submit operation exists.');
