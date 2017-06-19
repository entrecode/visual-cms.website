const Datamanager = require('ec.datamanager');
const cacheManager = require('cache-manager');
const nunjucks = require('nunjucks');

let dmCache;

function setupDatamanager(config) {

  const memoryCache = cacheManager.caching({
    store: 'memory',
    max: 100,
    ttl: config.memoryCacheTtl
  }); // generic (asset helpers)

  const datamanager = new Datamanager({ url: config.datamanagerURL });

  function loadFromDataManagerOrCache(modelName, requestType, ...args) {
    if (requestType === 'entry') {
      return Promise.resolve(args)
      .then(([entryID, levels, fields]) => {
        if (dmCache) {
          return dmCache.getEntry(modelName, entryID, fields, levels);
        }
        return datamanager.model(modelName).entry(entryID, levels, fields);
      })
      .then(entry => Object.assign({}, entry.value, { dmCacheHitFrom: 'dmCacheHitFrom' in entry ? entry.dmCacheHitFrom : null}));
    }
    if (requestType === 'entries') {
      return Promise.resolve(args)
      .then(([{ size, page, sort, filter, fields }]) => ({ size, page, sort, filter, fields }))
      .then((configObject) => {
        if (dmCache) {
          return dmCache.getEntries(modelName, configObject);
        }
        return datamanager.model(modelName).entryList(configObject);
      })
      .then((entryList) => {
        if (!('dmCacheHitFrom' in entryList)) {
          return entryList.entries;
        }
        return entryList.entries.map(entry => Object.assign(entry.value, { dmCacheHitFrom: entryList.dmCacheHitFrom }));
      });
    }
    throw new Error(`unknown requestType: '${requestType}'`);
  }

  function filterFile(assetID, callback) {
    return Promise.resolve()
    .then(() => {
      if (!assetID) {
        throw new Error('empty callback');
      }
      if (!(typeof assetID === 'string')) {
        if ('assetID' in assetID && typeof assetID.assetID === 'string') {
          return assetID.assetID;
        }
        console.error(`FileURL in visual-cms.website filterFile is invalid: ${assetID}`);
        throw new Error('empty callback');
      }
      return assetID;
    })
    .then(id => datamanager.getFileUrl(id))
    .then(url => callback(null, url))
    .catch((error) => {
      if (error.status === 404) {
        console.error(`FileURL not found: ${assetID}`);
      } else if (error.message !== 'empty callback') {
        console.error(error.message);
      }
      return callback();
    });
  }

  function filterImage(assetID, minSize, callback = minSize) {
    return Promise.resolve()
    .then(() => {
      if (!assetID) {
        throw new Error('no assetID');
      }
      if (!(typeof assetID === 'string')) {
        if ('assetID' in assetID && typeof assetID.assetID === 'string') {
          return assetID.assetID;
        }
        console.error(`FileURL in visual-cms.website filterImage is invalid: ${assetID}`);
        throw new Error('invalid assetID');
      }
      return assetID;
    })
    .then((id) => {
      if (typeof minSize !== 'number') {
        minSize = null;
      }
      memoryCache.wrap(id + (minSize || ''), (cacheCallback) => {
        datamanager.getImageUrl(id, minSize)
        .then(url => cacheCallback(null, url))
        .catch((error) => {
          if (error.status === 404) {
            console.error(`ImageURL not found: ${id}`);
          } else {
            console.error(error.message);
          }
          cacheCallback();
        });
      }, callback);
    })
    .catch(() => callback());
  }

  function filterImageThumb(assetID, minSize, callback = minSize) {
    return Promise.resolve()
    .then(() => {
      if (!assetID) {
        throw new Error('no assetID');
      }
      if (!(typeof assetID === 'string')) {
        if ('assetID' in assetID && typeof assetID.assetID === 'string') {
          return assetID.assetID;
        }
        console.error(`FileURL in visual-cms.website filterImageThumb is invalid: ${assetID}`);
        throw new Error('invalid assetID');
      }
      return assetID;
    })
    .then((id) => {
      if (typeof minSize !== 'number') {
        minSize = null;
      }
      memoryCache.wrap(id + (minSize || ''), (cacheCallback) => {
        datamanager.getImageThumbUrl(id, minSize)
        .then(url => cacheCallback(null, url))
        .catch((error) => {
          if (error.status === 404) {
            console.error(`ImageThumbURL not found: ${id}`);
          } else {
            console.error(error.message);
          }
          cacheCallback();
        });
      }, callback);
    })
    .catch(() => callback());
  }

  function filterEntry(entryID, model, levels, callback = levels) {
    loadFromDataManagerOrCache(model, 'entry', entryID, levels && levels < 4 ? levels : null)
    .then(entry => callback(null, entry))
    .catch(e => callback(new Error(e.title)));
  }

  function filterLinkedEntryTitle(entry, field) {
    const relations = entry['_links'][`${datamanager.id}:${entry._modelTitle}/${field}`];
    if (!Array.isArray(relations)) {
      return entry;
    }
    const titles = relations.map(relation => relation.title);
    if (titles.length > 1) {
      return titles;
    }
    return titles[0];
  }

  function loadData(configObject) {
    if (!configObject.model) {
      return Promise.reject(new Error('missing model property'));
    }
    return Promise.resolve(configObject.model)
    .then((model) => {
      if (configObject.entryID) {
        return loadFromDataManagerOrCache(model, 'entry', configObject.entryID, configObject.levels, configObject.fields);
      }
      return loadFromDataManagerOrCache(model, 'entries', configObject);
    })
    .then(result => {
      return result;
    });
  }

  let templateLoaderEmitter;

  const TemplateLoader = nunjucks.Loader.extend({
    init() {
      // setup a process which watches templates here
      // and call `this.emit('update', name)` when a template
      // is changed
      templateLoaderEmitter = this;
    },
    async: true,
    getSource(name, callback) {
      return Promise.resolve(name)
      .then(n => n.split('-'))
      .then((nameParts) => {
        if (nameParts.length < 2) {
          throw new Error(`invalid template name '${name}': should be of the form xxx-entryID`);
        }
        let [templateType, ...entryID] = nameParts;
        entryID = entryID.join('-');
        if (!config.dynamicTemplates || !config.dynamicTemplates[templateType]) {
          throw new Error(`dynamic templates '${templateType}' not defined`)
        }
        return loadFromDataManagerOrCache(config.dynamicTemplates[templateType].model, 'entry', entryID)
        .then(template => ({
          path: name,
          src: `
        <style>${template.style}</style>
        ${template.content}
      `,
          noCache: config.disableTemplateCache,
        }))
        .catch(error => {
          if (error.status === 404) {
            throw new Error(`template with id ${entryID} not found.`);
          }
          throw error;
        });
      })
      .then((result) => callback(null, result))
      .catch(callback);
    },
  });

  function useDMCache(dmCacheInstance) {
    dmCache = dmCacheInstance;
    dmCache.eventEmitter.on('entryUpdated', ({ type, model, entryID }) => {
      const dynamicTemplateModels = Object.keys(config.dynamicTemplates)
      .map(templateType => ({ [config.dynamicTemplates[templateType].model]: templateType }))
      .reduce((a, b) => Object.assign(a, b), {});
      if (model in dynamicTemplateModels) {
        console.log(`emitted nunjucks update ${dynamicTemplateModels[model]}-${entryID}`);
        templateLoaderEmitter.emit('update', `${dynamicTemplateModels[model]}-${entryID}`);
      }
    });
  }

  return {
    load(toLoad) {
      const results = {};
      return Promise.all(Object.keys(toLoad).map((key) => {
        return loadData(toLoad[key])
        .then((data) => {
          results[key] = data;
        });
      }))
      .then(() => results);
    },
    loadFromDataManagerOrCache,
    filterEntry,
    filterFile,
    filterImage,
    filterImageThumb,
    filterLinkedEntryTitle,
    TemplateLoader,
    datamanager,
    useDMCache,
  };
}

module.exports = setupDatamanager;
