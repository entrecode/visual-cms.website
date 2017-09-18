const { PublicAPI } = require('ec.sdk');

const apiMap = new Map();

function negotiateAsset(asset, size, image = false, thumb = false) {
  let f = JSON.parse(JSON.stringify(asset.files));

  // for file url pic fist file and return - not for images
  if (!image && !thumb && asset.type !== 'image') {
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

function negotiateEmbedded(entry, field, size, image, thumb) {
  if (!('_embedded' in entry)) {
    throw new Error('no embedded in entry');
  }

  if (!field || typeof field !== 'string') {
    throw new Error(`asset helper field parameter invalid: ${field}`);
  }

  const embedKey = Object.keys(entry._embedded).find(k => k.indexOf(`/${field}/asset`) !== -1);

  if (!embedKey) {
    throw new Error(`could not find asset ${field} in embedded of entry`);
  }

  const asset = entry._embedded[embedKey];
  // if entry[field] is array it is an assets field, so return mapped
  if (Array.isArray(entry[field])) {
    return asset.map(a => negotiateAsset(a, size, image, thumb));
  }
  // if embedded is array and we are here halfred did its magic, so return first element
  if (Array.isArray(asset)) {
    return negotiateAsset(asset[0], size, image, thumb);
  }
  // if embedded is object halfred did no magic, just return
  return negotiateAsset(asset, size, image, thumb);
}

function negotiateRemote(assetID, size, image, thumb) {
  if (!('_dmConfig' in this.env.globals)) {
    throw new Error('asset negotiation with ids only need _dmConfig global in nunjucks');
  }

  const key = `${this.env.globals._dmConfig.id}/${this.env.globals._dmConfig.environment}}`;
  if (!apiMap.has(key)) {
    apiMap.set(key, new PublicAPI(
      this.env.globals._dmConfig.id,
      this.env.globals._dmConfig.environment));
  }
  const api = apiMap.get(key);

  if (thumb) {
    return api.getImageThumbUrl(assetID, size);
  }

  if (image) {
    return api.getImageUrl(assetID, size);
  }

  return api.getFileUrl(assetID);
}

function negotiate(input, field, size, image, thumb) {
  return Promise.resolve()
  .then(() => {
    if (Array.isArray(input)) {
      return Promise.all(input.map(i => negotiate(i, field, size, image, thumb)));
    } else if (typeof input === 'object' && 'assetID' in input) {
      // input signature changes
      // input => asset, field => size, size => image, image => thumb
      return negotiateAsset(input, field, size, image);
    } else if (typeof input === 'object' && '_embedded' in input) {
      return negotiateEmbedded(input, field, size, image, thumb);
    } else if (typeof input === 'string') {
      // input signature changes
      // input => asset, field => size, size => image, image => thumb
      return negotiateRemote(input, field, size, image);
    }

    throw new Error('cannot handle input type');
  });
}

function fileFilter(input, field, callback) {
  negotiate(input, field)
  .then(res => callback(null, res))
  .catch(callback);
}

function imageFilter(input, field, size, callback) {
  negotiate(input, field, size, true)
  .then(res => callback(null, res))
  .catch(callback);
}

function thumbFilter(input, field, size, callback) {
  negotiate(input, field, size, true, true)
  .then(res => callback(null, res))
  .catch(callback);
}

module.exports = {
  fileFilter,
  imageFilter,
  thumbFilter,
};
