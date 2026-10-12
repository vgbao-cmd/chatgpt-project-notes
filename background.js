'use strict';
importScripts('core.js');
const KEY='projectNotesV1';
let queue=Promise.resolve();
function serialized(fn) { const work=queue.then(fn);queue=work.catch(()=>{});return work; }
async function state() {return (await chrome.storage.local.get(KEY))[KEY] || PN.emptyState();}
async function mutate(msg) {
  const s=await state(); let p=s.projects.find(x=>x.id===msg.projectId);
  if(msg.type==='create') {
    if(s.projects.length>=100) throw Error('Maximum 100 projects.');
    p=PN.newProject(PN.str(msg.name,100));s.projects.push(p);s.activeId=p.id;
  } else if(msg.type==='select') {
    if(!p) throw Error('This project no longer exists.');s.activeId=p.id;
  } else if(msg.type==='import') {
    const incoming=PN.validateBackup(msg.data);
    if(s.projects.length+incoming.projects.length>100) throw Error('Total projects would exceed 100.');
    for(const item of incoming.projects) {item.id=PN.uid();s.projects.push(item);}
    if(incoming.projects.length) s.activeId=incoming.projects[0].id;
  } else {
    if(!p) throw Error('Select a project first.');
    if(msg.type==='delete') {s.projects=s.projects.filter(x=>x.id!==p.id);if(s.activeId===p.id)s.activeId=s.projects[0]?.id??null;}
    else {
      if(msg.type==='saveFields') {
        if(p.revision!==msg.revision) throw Error('This project was updated in another window. Copy your edits, then reopen the panel.');
        const next=Object.fromEntries(Object.keys(PN.fields).map(k=>[k,PN.str(msg.fields[k]??'')]));
        const name=PN.str(msg.name.trim(),100);if(!name)throw Error('Project name cannot be empty.');
        if(JSON.stringify(next)!==JSON.stringify(p.fields)) {p.history.unshift({at:PN.now(),fields:{...p.fields}});p.history=p.history.slice(0,30);}
        p.fields=next;p.name=name;
      } else if(msg.type==='addNote') {
        if(p.notes.length>=1000) throw Error('Maximum 1000 notes per project.');
        const text=PN.str(msg.text).trim();if(!text)throw Error('Note cannot be empty.');
        p.notes.unshift({id:PN.uid(),text,category:PN.categories[msg.category]?msg.category:'note',source:PN.url(msg.source),title:PN.str(msg.title??'',300),createdAt:PN.now()});
      } else if(msg.type==='deleteNote') p.notes=p.notes.filter(x=>x.id!==msg.id);
      else if(msg.type==='addTask') {if(p.tasks.length>=1000)throw Error('Maximum 1000 tasks.');const text=PN.str(msg.text,1000).trim();if(!text)throw Error('Task cannot be empty.');p.tasks.push({id:PN.uid(),text,done:false});}
      else if(msg.type==='toggleTask') {const t=p.tasks.find(x=>x.id===msg.id);if(t)t.done=msg.done===true;}
      else if(msg.type==='deleteTask') p.tasks=p.tasks.filter(x=>x.id!==msg.id);
      else if(msg.type==='addChat') {const url=PN.url(msg.url);if(!url)throw Error('URL is missing.');if(!p.chats.some(c=>c.url===url)){if(p.chats.length>=500)throw Error('Maximum 500 linked chats.');p.chats.unshift({id:PN.uid(),url,title:PN.str(msg.title||'ChatGPT',300),createdAt:PN.now()});}}
      else if(msg.type==='deleteChat') p.chats=p.chats.filter(x=>x.id!==msg.id);
      else if(msg.type==='restore') {const h=p.history[msg.index];if(!h || h.at!==msg.expectedAt)throw Error('History changed. Close and reopen History to select a snapshot.');p.history.unshift({at:PN.now(),fields:{...p.fields}});p.fields={...h.fields};p.history=p.history.slice(0,30);}
      else throw Error('Invalid operation.');
      p.updatedAt=PN.now();p.revision++;
    }
  }
  await chrome.storage.local.set({[KEY]:s});return s;
}
chrome.runtime.onMessage.addListener((msg,sender,respond)=>{
  // Only extension pages may read/write project data. Content script has a narrow open-panel command.
  if(msg.type==='openPanel' && sender.tab) {chrome.sidePanel.open({windowId:sender.tab.windowId}).then(()=>respond({ok:true}),e=>respond({ok:false,error:e.message}));return true;}
  if(sender.tab || !sender.url?.startsWith(chrome.runtime.getURL(''))) return false;
  serialized(()=>msg.type==='get'?state():mutate(msg)).then(s=>respond({ok:true,state:s}),e=>respond({ok:false,error:e.message}));return true;
});
chrome.sidePanel.setPanelBehavior({openPanelOnActionClick:true}).catch(console.error);
chrome.runtime.onInstalled.addListener(()=>{
  chrome.contextMenus.removeAll(()=>{
    for(const [key,label] of Object.entries(PN.categories)) chrome.contextMenus.create({id:'save-'+key,title:'Save to Project Notes: '+label,contexts:['selection'],documentUrlPatterns:['https://chatgpt.com/*','https://chat.openai.com/*']});
  });
});
chrome.contextMenus.onClicked.addListener((info,tab)=>{
  if(!info.menuItemId.startsWith('save-') || !info.selectionText || !tab) return;
  // Open immediately while the browser still recognizes the user gesture.
  chrome.sidePanel.open({windowId:tab.windowId}).catch(console.error);
  serialized(async()=>{
    let s=await state();let id=s.activeId;
    if(!id){s=await mutate({type:'create',name:'ChatGPT notes'});id=s.activeId;}
    const linked=s.projects.find(p=>p.chats.some(c=>c.url===info.pageUrl));
    await mutate({type:'addNote',projectId:linked?.id||id,text:info.selectionText,category:info.menuItemId.slice(5),source:info.pageUrl,title:(tab.title||'ChatGPT').slice(0,300)});
    if(linked) await mutate({type:'select',projectId:linked.id});
  }).catch(e=>{chrome.storage.local.set({lastCaptureError:e.message});console.error(e);});
});
