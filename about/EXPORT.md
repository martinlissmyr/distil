# Export system

Distil exports the current story or the current project as DOCX or PDF. The File menu shows **Export story** only in a story view and **Export project** only in a project view. There is no export command in the root view. The DOCX and PDF shortcuts are Cmd/Ctrl+Shift+E and Cmd/Ctrl+Shift+P in either context.

## Data flow

1. `src/App.tsx` sends the current navigation context to `electron/appMenu.ts`. A menu command sends a scoped `ExportRequest` to the renderer.
2. `src/export/exportOrchestrator.ts` calls the matching client method and reports loading, completion, cancellation, or failure to the progress modal.
3. The IPC handlers in `electron/handlers/export.ts` validate IDs and merge the saved prose. A story is read in part order. A project reads its stories in their saved order and merges each story through the same function.
4. The main process opens a native save dialog, generates the requested format, and writes the result to the chosen local path. Canceling the dialog does not write a file.

The export is a snapshot of saved documents. No cloud service is involved.

## Document structure

- Story export includes the story title and each part, with a chapter heading when the story has multiple parts.
- Project export begins with the project title, then includes every story title and its parts in project order. Both formats reuse the story part merge and prose conversion logic.
- Empty projects still export their project title.

## DOCX

`electron/export/docxExporter.ts` converts TipTap JSON to ProseMirror nodes and serializes them with `prosemirror-docx`. The custom serializer maps TipTap node names and applies the manuscript paragraph styles in `electron/export/docxStyles.ts`. Its serialization callback must provide a section containing `state.children`; an empty sections array produces an empty Word document.

Project DOCX exports start with a project title page. Each story heading starts on a new page, followed by that story's chapters and text.

## PDF

`electron/export/pdfExporter.ts` converts saved TipTap JSON to HTML, loads it in a hidden Electron window, and calls `webContents.printToPDF()`. The project HTML contains a title cover and one section per story. `electron/export/pdfStyles.scss` imports the reading mode typography and adds print page breaks for the cover, stories, and chapters. The build compiles this stylesheet to `dist-electron/pdfStyles.css`.

The PDF conversion supports the prose nodes handled in `nodeToHTML` and `inlineNodeToHTML`. When adding a new editor node or mark, update both the PDF conversion and the DOCX schema/serializer, then verify both exported formats.
