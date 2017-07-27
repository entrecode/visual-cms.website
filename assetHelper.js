function negotiate(asset, image = false, thumb = false, size) {
  let f = JSON.parse(JSON.stringify(asset.files));

  if (!image && !thumb && asset.type !== 'image') { // for getFileUrl pic fist file and return - not for images
    return f[0].url;
  }

  const first = f[0];
  // remove image files we have no resolution for (image/svg+xml; fix for CMS-1091)
  f = f.filter(file => file.resolution);
  if (f.length === 0) { // if no file is left pick first of original data
    return first.url;
  }
  f.sort((left, right) => { // sort by size descending
    const leftMax = Math.max(left.resolution.height, left.resolution.width);
    const rightMax = Math.max(right.resolution.height, right.resolution.width);
    if (leftMax < rightMax) {
      return 1;
    }
    if (leftMax > rightMax) {
      return -1;
    }
    return 0;
  });
  let imageFiles = f.filter((file) => {
    if (thumb) {
      return file.url.indexOf('_thumb') !== -1; // is thumbnail
    }
    return file.url.indexOf('_thumb') === -1; // is not a thumbnail
  });
  if (!imageFiles || imageFiles.length === 0) {
    imageFiles = f;
  }
  const largest = imageFiles[0];
  if (size) {
    // remove all image resolutions that are too small
    imageFiles = imageFiles
    .filter(file => file.resolution.height >= size || file.resolution.width >= size)
    // choose smallest image of all that are greater than size parameter
    .slice(-1);
  }

  if (imageFiles.length > 0) { // if all is good, we have an image now
    return imageFiles[0].url;
  }
  // if the requested size is larger than the original image, we take the largest possible one
  return largest.url;
}

function negotiateForEmbedded(entry, field, image, thumb, size) {
  if (!('_embedded' in entry)) {
    return undefined;
  }

  const embedKey = Object.keys(entry._embedded).find(k => k.indexOf(`/${field}/asset`) !== -1);
  if (!embedKey) {
    return undefined;
  }

  const asset = entry._embedded[embedKey];
  // if entry[field] is array it is an assets field, so return mapped
  if (Array.isArray(entry[field])) {
    return asset.map(a => negotiate(a, image, thumb, size));
  }
  // if embedded is array and we are here halfred did its magic, so return first element
  if (Array.isArray(asset)) {
    return negotiate(asset[0], image, thumb, size);
  }
  // if embedded is object halfred did no magic, just return
  return negotiate(asset, image, thumb, size);
}

function fileFilter(entry, field) {
  return negotiateForEmbedded(entry, field);
}

function imageFilter(entry, field, size) {
  return negotiateForEmbedded(entry, field, true, false, size);
}

function thumbFilter(entry, field, size) {
  return negotiateForEmbedded(entry, field, true, true, size);
}

function altText(entry, field) {
  if (!('_embedded' in entry)) {
    throw new Error('no_embeds');
  }

  const embedKey = Object.keys(entry._embedded).find(k => k.indexOf(`/${field}/asset`) !== -1);
  if (!embedKey) {
    throw new Error('no_embed_for_field');
  }

  const asset = entry._embedded[embedKey];
  // if entry[field] is array it is an assets field, so return mapped
  if (Array.isArray(entry[field])) {
    return asset.map(a => a.title);
  }
  // if embedded is array and we are here halfred did its magic, so return first element
  if (Array.isArray(asset)) {
    return asset[0].title;
  }
  // if embedded is object halfred did no magic, just return
  return asset.title;
}

module.exports = {
  fileFilter,
  imageFilter,
  thumbFilter,
  altText,
};
