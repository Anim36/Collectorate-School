/**
 * Opens the bulk CSV import panel on the users page, so the geometry of the
 * import view can be measured.
 */
(() => {
  const button = [...document.querySelectorAll("button")].find(
    (candidate) => candidate.textContent.trim() === "Bulk CSV import",
  );

  if (!button) return "no button";
  button.click();
  return "clicked";
})();
