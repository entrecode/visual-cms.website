const { PublicAPI } = require('ec.sdk');

const apiMap = new Map();

const helper = {
  negotiateAsset: (asset, size, image = false, thumb = false) => {
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
  },

  negotiateEmbedded: (entry, field, size, image = false, thumb = false) => {
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
      return asset.map(a => helper.negotiateAsset(a, size, image, thumb));
    }
    // if embedded is array and we are here halfred did its magic, so return first element
    if (Array.isArray(asset)) {
      return helper.negotiateAsset(asset[0], size, image, thumb);
    }
    // if embedded is object halfred did no magic, just return
    return helper.negotiateAsset(asset, size, image, thumb);
  },

  negotiateRemote: (dmConfig, assetID, size, image = false, thumb = false) => {
    if (!dmConfig) {
      throw new Error('asset negotiation with ids only need _dmConfig global in nunjucks');
    }

    const key = `${dmConfig.id}/${dmConfig.environment}}`;
    if (!apiMap.has(key)) {
      apiMap.set(key, new PublicAPI(dmConfig.id, dmConfig.environment));
    }
    const api = apiMap.get(key);

    if (thumb) {
      return api.getImageThumbUrl(assetID, size);
    }

    if (image) {
      return api.getImageUrl(assetID, size);
    }

    return api.getFileUrl(assetID);
  },

  negotiate: (dmConfig, input, field, size, image, thumb) => Promise.resolve()
  .then(() => {
    if (Array.isArray(input)) {
      return Promise.all(input.map(i =>
        helper.negotiate(dmConfig, i, field, size, image, thumb)));
    } else if (typeof input === 'object' && 'assetID' in input) {
      // input signature changes
      // input => asset, field => size, size => image, image => thumb
      return helper.negotiateAsset(input, size, image, thumb);
    } else if (typeof input === 'object' && '_embedded' in input) {
      return helper.negotiateEmbedded(input, field, size, image, thumb);
    } else if (typeof input === 'string') {
      // input signature changes
      // input => asset, field => size, size => image, image => thumb
      return helper.negotiateRemote(dmConfig, input, size, image, thumb);
    }

    throw new Error('cannot handle input type');
  }),
};

function fileFilter(input, field, callback) {
  if (typeof field === 'function') {
    callback = field;
    field = undefined;
  }

  helper.negotiate(this.env.globals._dmConfig, input, field)
  .then(res => callback(null, res))
  .catch(callback);
}

function imageFilter(input, field, size, callback) {
  if (typeof field === 'function') {
    callback = field;
    field = undefined;
  } else if (typeof field === 'number' && typeof size === 'function') {
    callback = size;
    size = field;
    field = undefined;
  } else if (typeof size === 'function') {
    callback = size;
    size = undefined;
  }

  helper.negotiate(this.env.globals._dmConfig, input, field, size, true)
  .then(res => callback(null, res))
  .catch(callback);
}

function thumbFilter(input, field, size, callback) {
  if (typeof field === 'function') {
    callback = field;
    field = undefined;
  } else if (typeof field === 'number' && typeof size === 'function') {
    callback = size;
    size = field;
    field = undefined;
  } else if (typeof size === 'function') {
    callback = size;
    size = undefined;
  }

  helper.negotiate(this.env.globals._dmConfig, input, field, size, true, true)
  .then(res => callback(null, res))
  .catch(callback);
}

module.exports = {
  fileFilter,
  imageFilter,
  thumbFilter,
};
