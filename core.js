'use strict';
(function (root) {
  const fields = {goal:'Goal',tech:'Tools / platform',decisions:'Confirmed decisions',ideas:'Unconfirmed ideas',completed:'Completed',current:'In progress',issues:'Current issues',next:'Next steps'};
  const categories = {note:'Notes',decision:'Decision',idea:'Idea',issue:'Issue'};
  const uid = () => crypto.randomUUID();
  const now = () => new Date().toISOString();
  function str(value, max = 20000) {
    if (typeof value !== 'string' || value.length > max) throw Error('Invalid text data or text exceeds the size limit.');
    return value;
  }
  function url(value) {
    if (!value) return '';
    const u = new URL(str(value, 2048));
    if (u.protocol !== 'https:' || u.username || u.password || u.port || !['chatgpt.com','chat.openai.com'].includes(u.hostname)) throw Error('Source must be a valid ChatGPT link.');
    return u.href;
  }
  function newProject(name) {
    return {id:uid(), name:str(name.trim(),100) || 'New project', fields:Object.fromEntries(Object.keys(fields).map(k=>[k,''])),notes:[],tasks:[],chats:[],history:[],revision:0,createdAt:now(),updatedAt:now()};
  }
  function emptyState() { return {version:1,projects:[],activeId:null}; }
  function validateBackup(value) {
    if (!value || value.version !== 1 || !Array.isArray(value.projects) || value.projects.length > 100) throw Error('Invalid Project Notes v1 backup (maximum 100 projects).');
    const seen = new Set();
    const projects = value.projects.map(raw => {
      if (!raw || typeof raw !== 'object') throw Error('Invalid project.');
      const id = str(raw.id,100);
      if (!id || seen.has(id)) throw Error('Duplicate or missing project ID.');
      seen.add(id);
      const p = newProject(str(raw.name,100)); p.id = id;
      for (const key of Object.keys(fields)) p.fields[key] = str(raw.fields?.[key] ?? '');
      const list = (key,limit) => { if(!Array.isArray(raw[key]) || raw[key].length > limit) throw Error('Invalid list: '+key+'.'); return raw[key]; };
      p.notes = list('notes',1000).map(n=>({id:uid(),text:str(n.text),category:categories[n.category]?n.category:'note',source:url(n.source),title:str(n.title??'',300),createdAt:str(n.createdAt??now(),100)}));
      p.tasks = list('tasks',1000).map(t=>({id:uid(),text:str(t.text,1000),done:t.done===true}));
      p.chats = list('chats',500).map(c=>({id:uid(),title:str(c.title,300),url:url(c.url),createdAt:str(c.createdAt??now(),100)}));
      p.history = list('history',30).map(h=>({at:str(h.at,100),fields:Object.fromEntries(Object.keys(fields).map(k=>[k,str(h.fields?.[k]??'')]))}));
      p.createdAt = str(raw.createdAt??now(),100); p.updatedAt=now();
      return p;
    });
    return {version:1,projects,activeId:seen.has(value.activeId)?value.activeId:(projects[0]?.id??null)};
  }
  function buildContext(p,selected,includeNotes=true,includeTasks=true) {
    let text = '# Project context: '+p.name+'\n';
    for(const key of selected) if(fields[key] && p.fields[key].trim()) text+='\n## '+fields[key]+'\n'+p.fields[key].trim()+'\n';
    const notes=p.notes.filter(n=>n.category!=='idea' || selected.includes('ideas'));
    if(includeNotes && notes.length) text+='\n## Saved notes\n'+notes.map(n=>'['+categories[n.category]+'] '+n.text+(n.source?'\nSource: '+n.source:'')).join('\n\n')+'\n';
    if(includeTasks && p.tasks.some(t=>!t.done)) text+='\n## Incomplete tasks\n'+p.tasks.filter(t=>!t.done).map(t=>'- '+t.text).join('\n')+'\n';
    return text+'\nUse this context to continue the project. Items labeled "Idea" are proposals, not confirmed decisions.\n';
  }
  function markdown(p) {
    let out = buildContext(p,Object.keys(fields),true,false);
    if(p.tasks.length) out+='\n## Checklist\n'+p.tasks.map(t=>'- ['+(t.done?'x':' ')+'] '+t.text).join('\n')+'\n';
    if(p.chats.length) out+='\n## Conversations\n'+p.chats.map(c=>'- '+c.title+'\n  '+c.url).join('\n')+'\n';
    return out;
  }
  root.PN = {fields,categories,uid,now,str,url,newProject,emptyState,validateBackup,buildContext,markdown};
})(globalThis);
