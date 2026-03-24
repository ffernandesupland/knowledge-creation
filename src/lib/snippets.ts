export interface RASnippet {
  id: string;
  name: string;
  html: string;
  description: string;
}

export const RA_SNIPPETS: RASnippet[] = [
  {
    id: "note",
    name: "NOTE",
    description: "Used for general attention or minor side-information.",
    html: `<p><span class="ra-content-note-1 mceNonEditable ra-content-att" style="color: #468847;"><span><img class="ra-att-img" src="https://qa-develop.rightanswers.com/solutionmanager/resources/images/content_note.gif" alt="" width="18px" height="17px" />&nbsp;<strong class="ra-att-title">NOTE:</strong>&nbsp;</span><span class="ra-att-desc mceEditable">Attention</span></span>&nbsp;</p>`
  },
  {
    id: "tip",
    name: "TIP",
    description: "A helpful suggestion or shortcut.",
    html: `<p><span class="ra-content-tip-1 mceNonEditable ra-content-att" style="color: #3a87ad;"><span><img class="ra-att-img" src="https://qa-develop.rightanswers.com/solutionmanager/resources/images/content_tip.gif" alt="" width="18px" height="17px" />&nbsp;<strong class="ra-att-title">TIP:</strong>&nbsp;</span><span class="ra-att-desc mceEditable">Tip</span></span>&nbsp;</p>`
  },
  {
    id: "caution",
    name: "CAUTION",
    description: "Warning about potential issues or errors if instructions aren't followed.",
    html: `<p><span class="ra-content-caution-1 mceNonEditable ra-content-att" style="color: #b94a48;"><span><img class="ra-att-img" src="https://qa-develop.rightanswers.com/solutionmanager/resources/images/content_caution.gif" alt="" width="18px" height="17px" />&nbsp;<strong class="ra-att-title">CAUTION:</strong>&nbsp;</span><span class="ra-att-desc mceEditable">Caution</span></span>&nbsp;</p>`
  },
  {
    id: "example",
    name: "EXAMPLE",
    description: "An illustrative example of the concept.",
    html: `<p><span class="ra-content-example-1 mceNonEditable ra-content-att" style="color: #000000;"><span><img class="ra-att-img" src="https://qa-develop.rightanswers.com/solutionmanager/resources/images/content_example.gif" alt="" width="18px" height="17px" />&nbsp;<strong class="ra-att-title">EXAMPLE:</strong>&nbsp;</span><span class="ra-att-desc mceEditable">Example</span></span>&nbsp;</p>`
  },
  {
    id: "new",
    name: "NEW",
    description: "Signifies new content or features.",
    html: `<p><span class="ra-content-new-1 mceNonEditable ra-content-att" style="color: #6e6e6e;"><span><img class="ra-att-img" src="https://qa-develop.rightanswers.com/solutionmanager/resources/images/content_new.gif" alt="" width="18px" height="17px" />&nbsp;<strong class="ra-att-title">NEW:</strong>&nbsp;</span><span class="ra-att-desc mceEditable">New</span></span>&nbsp;</p>`
  },
  {
    id: "updated",
    name: "UPDATED",
    description: "Signifies content that has been recently updated.",
    html: `<p><span class="ra-content-updated-1 mceNonEditable ra-content-att" style="color: #e39b00;"><span><img class="ra-att-img" src="https://qa-develop.rightanswers.com/solutionmanager/resources/images/content_updated.gif" alt="" width="18px" height="17px" />&nbsp;<strong class="ra-att-title">UPDATED:</strong>&nbsp;</span><span class="ra-att-desc mceEditable">Updated</span></span>&nbsp;</p>`
  }
];
