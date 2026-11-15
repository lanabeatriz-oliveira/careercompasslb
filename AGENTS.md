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

- Keep Make callback validation and field mapping in the client-safe integration helper so limits are testable without executing a route.
- Receive real diagnostics through the secret-verified notes callback; never seed placeholder scores during onboarding.
- Poll posts silently only in visible tabs, comparing IDs/statuses and preserving active editors/dialogs; bound diagnostic polling to two minutes.
- Read the shared Make webhook URL inside the authenticated handler, with the existing user configuration as fallback.
- Use the shared page metadata helper in each content route so page-specific social titles and descriptions remain complete.
