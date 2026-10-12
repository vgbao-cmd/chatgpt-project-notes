# ChatGPT Project Notes — English v1.1.0

A local notebook beside ChatGPT. Keep project context, decisions, notes, tasks and source conversations together. No API key or build step required. The interface is English; your notes can use any language.

## Update from v1.0 while keeping your data

1. In the old extension, use **Dữ liệu → Xuất JSON** to make a backup.
2. Extract the new ZIP into a temporary folder.
3. Copy every file and folder inside the extracted `chatgpt-project-notes` into the **original extension folder you loaded in Chrome**, replacing the old files. Keep that original location.
4. Open `chrome://extensions` and click the reload arrow on the existing Project Notes extension.
5. Close and reopen the panel, then reload your ChatGPT tab.

Do not uninstall the old extension for this update. Keeping its original folder preserves the extension identity and local storage. Existing notes and project names are kept, not translated. JSON backups use the same schema as the Vietnamese version.

## First installation

1. Extract the ZIP into a permanent folder.
2. Open `chrome://extensions` and enable **Developer mode**.
3. Click **Load unpacked** and select the folder containing `manifest.json`.
4. Open or reload `https://chatgpt.com`.
5. Click **Project Notes** at the bottom-right of the page, or pin and click its extension icon on the Chrome toolbar.

Requires Chrome 116 or later. No Python, Node, API key, server or build command is needed to use the extension. Keep the extracted folder after installation.

## Basic workflow

- **Overview:** create a project, fill its context fields, then click **Save changes**. Field edits must be saved explicitly.
- **Notes:** add a note or select text in ChatGPT and right-click **Save to Project Notes**. Choose Notes, Decision, Idea or Issue. Captured text includes a source URL.
- **Checklist:** add tasks, check them off or delete them. Tasks are saved immediately.
- **Chat:** open a conversation with its own `/c/...` URL and click **Link current chat**. Captures from linked chats go to that project; other chats use the selected project.
- **Insert context:** choose sections, review and edit the preview, then click **Insert into ChatGPT**. Review the composer and send it yourself. The extension never sends messages automatically or overwrites existing drafts.

Unconfirmed ideas and Idea notes are excluded by default. Only incomplete tasks are included. Use **Copy** if insertion is unavailable or ChatGPT changes its editor.

## Vietnamese typing and other input methods

Project creation now uses a normal HTML input instead of a browser prompt. Enter is ignored during composition when creating projects or submitting tasks. Background storage updates do not rebuild the panel while a text input is focused.

If typing still fails in the sidebar, click **↗** beside LOCAL to open the notebook in a regular browser tab. Use **Copy** there and paste into ChatGPT. Direct insertion needs the active tab to be ChatGPT, so use it from the sidebar.

Composition guards were tested using simulated DOM events. Windows UniKey/EVKey and native input methods have not been tested directly. Changing interface language alone does not guarantee a fix for an operating-system typing issue.

## History and backup

**Overview → History** keeps the last 30 snapshots of the eight context fields. Restoring does not change separate notes, tasks, project names or linked chats.

**Data → Export JSON** backs up all projects. **Import JSON** adds project copies without overwriting existing data. **Export Markdown** produces a readable copy of the selected project.

Data is stored in the current Chrome profile using `chrome.storage.local`. There is no cross-device sync. Uninstalling the extension or deleting the profile may remove data. Export JSON before uninstalling.

Limits: 100 projects; 1000 notes, 1000 tasks and 500 chat links per project; 20,000 characters per note/context field; 12 MB per imported file. Chrome storage quota applies; storage failures are reported.

## Permissions and privacy

- `storage`: local project data.
- `sidePanel`: project notebook beside the page.
- `contextMenus`: capture text you select.
- `activeTab` and access to `chatgpt.com` / `chat.openai.com`: get the current chat URL/title and insert context when requested.

No cookies, internal ChatGPT APIs, analytics or remote AI services are used. Notes become part of ChatGPT only when you insert and send them. Source links are bookmarks; entire conversations are not downloaded.

## Troubleshooting

- Missing launcher or connection error: reload ChatGPT after installing or updating.
- Composer not found: open a chat, reload, or use **Copy**.
- Existing draft: send/clear it, or paste manually where you want the context.
- Updated in another window: copy unsaved edits, reopen the panel and reapply them.
- Cannot link a chat: send the first message and wait for a conversation URL.
- Cannot load: select the folder containing `manifest.json`, not the ZIP or `icons` folder.

## Source and tests

Readable JavaScript, HTML, CSS and icons are included. See `VERIFICATION.md` for test coverage and limits. Optional checks for developers with Node installed:

```sh
node tests/core.test.cjs
node tests/background.test.cjs
node tests/content.test.cjs
```

Chrome API references:
https://developer.chrome.com/docs/extensions/reference/api/sidePanel
https://developer.chrome.com/docs/extensions/reference/api/contextMenus
