'use strict';
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let data=PN.emptyState(),displayId=null,view='overview',dirty=false,editRevision=0,toastTimer;
const composingTargets=new WeakSet();
document.addEventListener('compositionstart',e=>composingTargets.add(e.target),true);
document.addEventListener('compositionend',e=>{const target=e.target;setTimeout(()=>composingTargets.delete(target),0);},true);
document.addEventListener('keydown',e=>{
  if(e.key==='Enter' && (e.isComposing || e.keyCode===229 || composingTargets.has(e.target)) && e.target.closest('form')) e.preventDefault();
},true);
function textHasFocus(){return document.activeElement?.matches('textarea, input:not([type="checkbox"]):not([type="file"])');}
const project=()=>data.projects.find(p=>p.id===(displayId??data.activeId));
const date=s=>{const d=new Date(s);return isNaN(d)?'':d.toLocaleString('en-US');};
function toast(text,error=false){$('toast').textContent=text;$('toast').className=error?'error':'';$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,error?9000:4000);}
async function request(type,args={}) {
  const r=await chrome.runtime.sendMessage({type,projectId:displayId??data.activeId,...args});
  if(!r?.ok)throw Error(r?.error||'Could not connect to the extension. Reopen the panel.');
  data=r.state;return data;
}
function action(fn){return async(...args)=>{try{await fn(...args);}catch(e){toast(e.message,true);}};}
function bind(id,fn){$(id)?.addEventListener('click',action(fn));}
function askDiscard(){return !dirty || confirm('You have unsaved changes. Discard your edits?');}
function render(){
  displayId=data.activeId;
  const p=project();
  $('projectSelect').innerHTML=data.projects.length?data.projects.map(x=>'<option value="'+esc(x.id)+'">'+esc(x.name)+'</option>').join(''):'<option value="">No projects yet</option>';
  $('projectSelect').value=p?.id||'';$('context').disabled=!p;
  document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('active',b.dataset.view===view));
  $('saveStatus').textContent=p?'Updated: '+date(p.updatedAt):'Saved in this browser';
  if(!p && view!=='settings') {
    $('main').innerHTML='<div class="empty"><div class="symbol">▤</div><h1>Pick up where<br>you left off.</h1><p class="muted">Keep goals, decisions and next steps in a notebook beside ChatGPT.</p><button id="start" class="primary">Create your first project</button><p class="tiny">No API key needed · No token fees</p></div>';bind('start',newProject);return;
  }
  if(view==='overview')renderOverview(p);
  if(view==='notes')renderNotes(p);
  if(view==='tasks')renderTasks(p);
  if(view==='chats')renderChats(p);
  if(view==='settings')renderSettings(p);
}
function renderOverview(p){
  editRevision=p.revision;
  const done=p.tasks.filter(t=>t.done).length;
  $('main').innerHTML='<div class="card hero"><span class="eyebrow">Project workspace</span><h1>'+esc(p.name)+'</h1><div class="row"><span class="muted">'+p.notes.length+' notes · '+p.chats.length+' chat</span><span class="note-count">'+done+'/'+p.tasks.length+' tasks done</span></div><div class="progress"><div style="width:'+ (p.tasks.length?Math.round(done/p.tasks.length*100):0)+'%"></div></div></div><div class="section-head"><h2>Context & progress</h2><button id="history" class="link">History</button></div><label class="field"><span>Project name</span><input id="projectName" maxlength="100" value="'+esc(p.name)+'"></label>'+Object.entries(PN.fields).map(([k,label])=>'<label class="field"><span>'+label+'</span><textarea id="field-'+k+'" maxlength="20000" placeholder="'+esc({goal:'What are you building?',tech:'For example: Unity, C#, Android',decisions:'Only include confirmed rules and decisions',ideas:'Proposals still under consideration',completed:'What has been completed?',current:'What are you working on now?',issues:'Errors, reproduction steps and attempted fixes',next:'What should happen next?'}[k])+'">'+esc(p.fields[k])+'</textarea></label>').join('')+'<button id="saveFields" class="primary">Save changes</button><p id="dirtyHint" class="tiny">Click Save changes when you finish editing.</p>';
  $('main').querySelectorAll('input,textarea').forEach(e=>e.addEventListener('input',()=>{dirty=true;$('dirtyHint').textContent='You have unsaved changes.';}));
  bind('saveFields',saveFields);bind('history',showHistory);
}
async function saveFields(){
  const fields=Object.fromEntries(Object.keys(PN.fields).map(k=>[k,$('field-'+k).value]));
  await request('saveFields',{fields,name:$('projectName').value,revision:editRevision});dirty=false;render();toast('Project context saved.');
}
function renderNotes(p){
  $('main').innerHTML='<div class="section-head"><div><span class="eyebrow">Your knowledge base</span><h1>Notes</h1></div><button id="addNote" class="primary">＋ Add</button></div><input id="noteSearch" placeholder="Search notes…" aria-label="Search notes"><p class="tiny">Select text in ChatGPT → right-click → Save to Project Notes. Linked chats save to their project; other chats save to the selected project.</p><div id="noteList"></div>';
  function list(){
    const query=$('noteSearch').value.toLocaleLowerCase('en');const notes=p.notes.filter(n=>(n.text+' '+n.title).toLocaleLowerCase('en').includes(query));
    $('noteList').innerHTML=notes.length?notes.map(n=>'<article class="card"><div class="row"><span class="badge '+esc(n.category)+'">'+PN.categories[n.category]+'</span><span class="tiny grow">'+date(n.createdAt)+'</span><button class="icon-btn" data-delete="'+esc(n.id)+'" title="Delete note">×</button></div><div class="note-text">'+esc(n.text)+'</div>'+(n.source?'<a class="tiny" href="'+esc(n.source)+'" target="_blank" rel="noopener noreferrer">↗ '+esc(n.title||'Open source chat')+'</a>':'')+'</article>').join(''):'<div class="empty muted">'+(query?'No matching notes.':'No notes yet. Save a decision or a useful response.')+'</div>';
    $('noteList').querySelectorAll('[data-delete]').forEach(b=>b.addEventListener('click',action(async()=>{if(confirm('Delete this note?')){await request('deleteNote',{id:b.dataset.delete});render();}})));
  }
  $('noteSearch').addEventListener('input',list);list();bind('addNote',noteDialog);
}
function modal(title,body){$('dialogContent').innerHTML='<div class="dialog-head"><h2>'+title+'</h2><button id="closeDialog" aria-label="Close">×</button></div>'+body;bind('closeDialog',()=>$('dialog').close());$('dialog').showModal();}
function noteDialog(){
  modal('Add note','<label class="field"><span>Category</span><select id="noteCategory">'+Object.entries(PN.categories).map(([k,v])=>'<option value="'+k+'">'+v+'</option>').join('')+'</select></label><label class="field"><span>Content</span><textarea id="noteText" maxlength="20000" rows="7"></textarea></label><label class="field"><span>Source chat URL (optional)</span><input id="noteSource" type="url" placeholder="https://chatgpt.com/c/…"></label><button id="saveNote" class="primary">Save note</button>');
  bind('saveNote',async()=>{await request('addNote',{text:$('noteText').value,category:$('noteCategory').value,source:$('noteSource').value});$('dialog').close();render();toast('Note saved.');});
}
function renderTasks(p){
  const done=p.tasks.filter(t=>t.done).length;
  $('main').innerHTML='<span class="eyebrow">One step at a time</span><h1>Checklist</h1><p class="muted">'+done+' / '+p.tasks.length+' tasks completed</p><form id="taskForm" class="row"><input id="taskText" maxlength="1000" placeholder="Add a task…" aria-label="New task" required><button class="primary" type="submit">＋</button></form><div class="divider"></div><div id="taskList">'+(p.tasks.length?p.tasks.map(t=>'<div class="card row task '+(t.done?'done':'')+'"><input type="checkbox" data-task="'+esc(t.id)+'" aria-label="'+esc(t.text)+'" '+(t.done?'checked':'')+'><span class="text">'+esc(t.text)+'</span><button class="icon-btn" data-delete="'+esc(t.id)+'" title="Delete task">×</button></div>').join(''):'<div class="empty muted">Add a small step to move the project forward.</div>')+'</div>';
  $('taskForm').addEventListener('submit',e=>{e.preventDefault();if(composingTargets.has($('taskText')))return;action(async()=>{await request('addTask',{text:$('taskText').value});render();$('taskText').focus();})();});
  $('taskList').querySelectorAll('[data-task]').forEach(b=>b.addEventListener('change',action(async()=>{await request('toggleTask',{id:b.dataset.task,done:b.checked});render();})));
  $('taskList').querySelectorAll('[data-delete]').forEach(b=>b.addEventListener('click',action(async()=>{if(confirm('Delete this task?')){await request('deleteTask',{id:b.dataset.delete});render();}})));
}
async function currentChat(){
  const [tab]=await chrome.tabs.query({active:true,currentWindow:true});
  if(!tab?.url || !/^https:\/\/(chatgpt\.com|chat\.openai\.com)\//.test(tab.url))throw Error('Open a ChatGPT tab first.');
  return tab;
}
function renderChats(p){
  $('main').innerHTML='<span class="eyebrow">Project sources</span><h1>Conversations</h1><p class="muted">Link chats to revisit them and route captured notes to the right project.</p><button id="linkChat" class="primary">＋ Link current chat</button><div class="divider"></div>'+(p.chats.length?p.chats.map(c=>'<div class="card"><div class="row"><a class="chat-title grow" href="'+esc(c.url)+'" target="_blank" rel="noopener noreferrer">'+esc(c.title)+'</a><button class="icon-btn" data-delete="'+esc(c.id)+'" title="Unlink chat">×</button></div><p class="tiny">'+date(c.createdAt)+'</p></div>').join(''):'<div class="empty muted">No linked chats yet. Open a saved ChatGPT conversation.</div>');
  bind('linkChat',async()=>{const tab=await currentChat();if(!/\/c\/[a-zA-Z0-9-]+/.test(new URL(tab.url).pathname))throw Error('This chat has no conversation URL yet. Send the first message, then link it.');await request('addChat',{url:tab.url,title:(tab.title||'ChatGPT').slice(0,300)});render();toast('Chat linked to this project.');});
  $('main').querySelectorAll('[data-delete]').forEach(b=>b.addEventListener('click',action(async()=>{await request('deleteChat',{id:b.dataset.delete});render();})));
}
function download(name,text,type){const u=URL.createObjectURL(new Blob([text],{type}));const a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),10000);}
function renderSettings(p){
  $('main').innerHTML='<span class="eyebrow">Take your work with you</span><h1>Data & backup</h1><div class="card"><h2>Back up all projects</h2><p class="muted">JSON preserves notes, tasks, chat sources and context history.</p><div class="row wrap"><button id="exportJson">Export JSON</button><button id="importJson">Import JSON</button></div><p class="tiny">Import adds project copies and keeps existing data.</p></div>'+(p?'<div class="card"><h2>Export current project</h2><p class="muted">'+esc(p.name)+'</p><button id="exportMd">Export Markdown</button></div>':'')+'<div class="card"><h2>Stored on your device</h2><p class="muted">No AI API is used. Notes stay on your device. When you insert and send context, that text becomes part of your ChatGPT conversation.</p><p class="tiny">Uninstalling the extension or deleting your Chrome profile may remove notes. Export JSON regularly. Device sync is not available.</p></div>'+(p?'<div class="card"><h2>Delete project</h2><p class="muted">Remove this project and its notes from the extension.</p><button id="deleteProject" class="danger">Delete “'+esc(p.name)+'”</button></div>':'')+'<p class="tiny">Project Notes 1.1.0 · Chrome extension</p>';
  bind('exportJson',()=>download('project-notes-backup-'+new Date().toISOString().slice(0,10)+'.json',JSON.stringify(data,null,2),'application/json'));
  bind('importJson',()=>$('importFile').click());
  bind('exportMd',()=>download('project-notes-'+p.name.replace(/[^\p{L}\p{N}_-]+/gu,'-')+'.md',PN.markdown(p),'text/markdown;charset=utf-8'));
  bind('deleteProject',async()=>{if(confirm('Delete all notes, tasks and links for “'+p.name+'”? Export JSON first if you want a backup.')){await request('delete');dirty=false;render();toast('Project deleted.');}});
}
function showHistory(){
  const p=project();modal('Context history',p.history.length?'<p class="tiny">Keeps the last 30 context snapshots. Notes and tasks are not included in this history.</p>'+p.history.map((h,i)=>'<div class="history-item"><details><summary>'+date(h.at)+'</summary><div class="note-text tiny">'+esc(Object.entries(h.fields).filter(([,v])=>v).map(([k,v])=>PN.fields[k]+': '+v).join('\n\n')||'Empty context')+'</div></details><button data-restore="'+i+'" class="link">Restore snapshot</button></div>').join(''):'<p class="muted">No history yet. Previous context is saved when you change its fields.</p>');
  $('dialogContent').querySelectorAll('[data-restore]').forEach(b=>b.addEventListener('click',action(async()=>{if(dirty)throw Error('Save or discard your edits before restoring.');if(confirm('Restore context fields from this snapshot?')){const index=Number(b.dataset.restore);await request('restore',{index,expectedAt:p.history[index].at});$('dialog').close();render();toast('Context restored.');}})));
}
function contextDialog(){
  const p=project();
  if(dirty)throw Error('Save your changes before creating context.');
  modal('Context for your next chat','<p class="muted">Choose what to include. You can edit the preview before inserting it.</p><div class="check-grid">'+Object.entries(PN.fields).map(([k,v])=>'<label><input type="checkbox" data-field="'+k+'" '+(k==='ideas'?'':'checked')+'>'+v+'</label>').join('')+'<label><input type="checkbox" id="includeNotes" checked>Saved notes</label><label><input type="checkbox" id="includeTasks" checked>Incomplete tasks</label></div><textarea id="contextPreview" class="preview" aria-label="Context preview"></textarea><p id="contextCount" class="tiny"></p><div class="row wrap"><button id="insertContext" class="primary">Insert into ChatGPT</button><button id="copyContext">Copy</button></div><p class="tiny">The extension only fills the composer. Review the text and send it yourself. Existing drafts are preserved.</p>');
  function count(){const len=$('contextPreview').value.length;$('contextCount').textContent=len.toLocaleString('en-US')+' characters'+(len>20000?' · Long context. Consider removing sections you do not need.':'');}
  function update(){const keys=[...$('dialogContent').querySelectorAll('[data-field]:checked')].map(e=>e.dataset.field);$('contextPreview').value=PN.buildContext(p,keys,$('includeNotes').checked,$('includeTasks').checked);count();}
  $('dialogContent').querySelectorAll('input[type=checkbox]').forEach(e=>e.addEventListener('change',()=>{if(!$('contextPreview').dataset.edited || confirm('Rebuild context using the new selection? Your preview edits will be replaced.')){delete $('contextPreview').dataset.edited;update();}}));
  $('contextPreview').addEventListener('input',()=>{$('contextPreview').dataset.edited='1';count();});update();
  bind('copyContext',async()=>{try{await navigator.clipboard.writeText($('contextPreview').value);toast('Context copied.');}catch{ $('contextPreview').select();throw Error('Clipboard access failed. Text is selected; press Ctrl+C to copy it.');}});
  bind('insertContext',async()=>{const tab=await currentChat();let r;try{r=await chrome.tabs.sendMessage(tab.id,{type:'insertContext',text:$('contextPreview').value});}catch{throw Error('Not connected to the ChatGPT page. Reload the tab after installing, or use Copy.');}if(!r?.ok)throw Error(r?.error||'Could not insert context. Use Copy.');$('dialog').close();toast('Context inserted. Review the composer and send it yourself.');});
}
function newProject(){
  if(!askDiscard())return;
  modal('Create project','<label class="field"><span>Project name</span><input id="newProjectName" maxlength="100" placeholder="For example: Sushi Restaurant" autocomplete="off"></label><div class="row"><button id="confirmCreateProject" class="primary">Create project</button><button id="cancelCreateProject">Cancel</button></div>');
  let creating=false;
  const create=action(async()=>{
    if(creating || composingTargets.has($('newProjectName')))return;
    const name=$('newProjectName').value.trim();if(!name)throw Error('Enter a project name.');
    creating=true;
    try{await request('create',{name});dirty=false;view='overview';$('dialog').close();render();}
    finally{creating=false;}
  });
  $('confirmCreateProject').addEventListener('click',create);
  bind('cancelCreateProject',()=>$('dialog').close());
  $('newProjectName').addEventListener('keydown',e=>{
    if(e.key!=='Enter')return;
    e.preventDefault();if(e.isComposing || e.keyCode===229 || composingTargets.has(e.target))return;create();
  });
  $('newProjectName').focus();
}
$('newProject').addEventListener('click',action(newProject));
$('projectSelect').addEventListener('change',action(async()=>{const id=$('projectSelect').value;if(!askDiscard()){$('projectSelect').value=data.activeId;return;}await request('select',{projectId:id});dirty=false;render();}));
document.querySelectorAll('nav button').forEach(b=>b.addEventListener('click',()=>{if(!askDiscard())return;dirty=false;view=b.dataset.view;render();}));
bind('context',contextDialog);
bind('openTab',()=>chrome.tabs.create({url:chrome.runtime.getURL('sidepanel.html')}));
$('importFile').addEventListener('change',action(async()=>{const file=$('importFile').files[0];$('importFile').value='';if(!file)return;if(file.size>12*1024*1024)throw Error('File exceeds 12 MB.');const incoming=PN.validateBackup(JSON.parse(await file.text()));if(!incoming.projects.length)throw Error('This file contains no projects.');if(!confirm('Add '+incoming.projects.length+' projects from this file? Existing data will be preserved.'))return;await request('import',{data:incoming});dirty=false;render();toast('Projects imported as copies.');}));
chrome.storage.onChanged.addListener((changes,area)=>{
  if(area!=='local')return;
  if(changes.projectNotesV1?.newValue){data=changes.projectNotesV1.newValue;if(!dirty && !$('dialog').open && !textHasFocus())render();else $('saveStatus').textContent='New data is available; your edits are preserved.';}
  if(changes.lastCaptureError?.newValue)toast('Could not capture text: '+changes.lastCaptureError.newValue,true);
});
window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});
action(async()=>{await request('get');render();})();
