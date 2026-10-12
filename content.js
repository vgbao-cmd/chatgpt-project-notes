'use strict';
(() => {
  if(globalThis.__projectNotesLoaded) return;globalThis.__projectNotesLoaded=true;
  function composer() {
    const candidates=[...document.querySelectorAll('#prompt-textarea, textarea[data-id="root"], form textarea, form [contenteditable="true"][role="textbox"]')];
    return candidates.find(e=>e.getClientRects().length && !e.disabled && e.getAttribute('contenteditable')!=='false');
  }
  chrome.runtime.onMessage.addListener((msg,_sender,reply)=>{
    if(msg.type!=='insertContext') return;
    const e=composer();
    if(!e) {reply({ok:false,error:'ChatGPT composer not found. Open a chat and reload the page, or use Copy.'});return;}
    if((e.value??e.innerText??'').trim()) {reply({ok:false,error:'The composer already contains a draft. Send or clear it first, or use Copy.'});return;}
    if(typeof msg.text!=='string' || msg.text.length>200000) {reply({ok:false,error:'Context is too long.'});return;}
    e.focus();
    if(e.tagName==='TEXTAREA') {
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(e,msg.text);
      e.dispatchEvent(new Event('input',{bubbles:true}));
    } else {
      const sel=window.getSelection();const range=document.createRange();range.selectNodeContents(e);sel.removeAllRanges();sel.addRange(range);
      const inserted=document.execCommand('insertText',false,msg.text);
      if(!inserted) {reply({ok:false,error:'The editor did not accept the text. Use Copy and paste it into the chat.'});return;}
    }
    const actual=(e.value??e.innerText??'').replace(/\r\n/g,'\n').trim();
    reply(actual===msg.text.trim()?{ok:true}:{ok:false,error:'Could not verify all inserted text. Check the composer or use Copy.'});
  });
  const host=document.createElement('div');host.id='project-notes-launcher';
  const shadow=host.attachShadow({mode:'closed'});
  const style=document.createElement('style');style.textContent=':host{position:fixed;right:14px;bottom:18px;z-index:2147483000}button{font:600 12px system-ui;background:#18594b;color:white;border:1px solid #76c4ac;border-radius:20px;padding:10px 13px;cursor:pointer;box-shadow:0 3px 14px #0003}button:hover{background:#22745f}';
  const button=document.createElement('button');button.textContent='▤ Project Notes';button.title='Open project notes';
  button.addEventListener('click',()=>chrome.runtime.sendMessage({type:'openPanel'},r=>{if(chrome.runtime.lastError || !r?.ok)button.title='Click the extension icon in Chrome to open the panel.';}));
  shadow.append(style,button);document.documentElement.append(host);
})();
