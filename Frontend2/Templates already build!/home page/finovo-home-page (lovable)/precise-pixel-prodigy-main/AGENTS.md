<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Application rules
- Implement the Finovo home page at `src/routes/index.jsx`, with plain JSX presentation sections and JavaScript artwork mappings in `src/components/finovo`; preserve the typed TanStack bootstrap and shared UI infrastructure so routing remains compatible.
- Define all visual roles in `src/styles.css` and use the shared Button for interactions so the PDF-derived design stays consistent.
- Store extracted PDF artwork as Lovable Assets pointers; keep original media out of the repository to preserve asset delivery.
