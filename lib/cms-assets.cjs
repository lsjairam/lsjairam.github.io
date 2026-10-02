// Decap core treats root-relative URLs as already public. For this site's own
// uploads, ask getAsset for the repository asset instead, so unsaved blob
// previews work too. Stored content/public URLs are not modified.
function cmsAssetPath(path) {
  const prefix = "/assets/uploads/";
  return typeof path === "string" && path.startsWith(prefix) ? path.slice(prefix.length) : path;
}
module.exports = { cmsAssetPath };
