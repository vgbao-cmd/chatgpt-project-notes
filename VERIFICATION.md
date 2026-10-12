# Verification — English v1.1.0

Passed JavaScript syntax checks and dependency-free tests for context filtering, backup validation, source URL safety, context-menu routing, concurrent storage writes, stale-write rejection and composer safeguards.

Passed LinkeDOM UI tests for project creation, field saves, unsaved-change handling, note escaping, checklist, linked chats, context preview, history restoration, import copies and deletion. Additional simulated composition tests verify that Enter cannot create a project during composition, tasks are not submitted during composition and committed Vietnamese names/task text are preserved.

Interface labels, notifications, context menus and generated context headings are English. User-authored content is unchanged. The storage key and backup schema remain compatible with v1.0.

Not verified directly in a live Chrome/Edge browser or against the current ChatGPT page. This environment has no installed Chrome and its browser download failed. DOM tests do not verify visual layout, native browser extension behavior or Windows UniKey/EVKey compatibility. The separate-tab editor and Copy action are fallbacks for sidebar typing or composer compatibility issues.
