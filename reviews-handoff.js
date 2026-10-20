// Only the author's original comment enters this optional handoff. No account data.
export function attachHandoff(doc, original, t, clipboard) {
  const button = doc.getElementById("linkedin-copy");
  button.hidden = !original.trim();
  doc.getElementById("rating-only").hidden = !!original.trim();
  doc.getElementById("linkedin-manual").hidden = true;
  button.addEventListener("click", async () => {
    button.disabled = true;
    doc.getElementById("copy-status").textContent = "";
    try {
      if (!clipboard?.writeText) throw new Error("unavailable");
      await clipboard.writeText(original);
      doc.getElementById("copy-status").textContent = t.copied;
    } catch {
      doc.getElementById("linkedin-manual").hidden = false;
      const field = doc.getElementById("linkedin-text");
      field.value = original;
      field.focus();
      field.select();
      doc.getElementById("copy-status").textContent = t.manual;
    } finally {
      button.disabled = false;
    }
  });
}
