const Datamanager = require('ec.datamanager');
const cacheManager = require('cache-manager');
const nunjucks = require('nunjucks');

function setupDatamanager(config) {

  const memoryCache = cacheManager.caching({
    store: 'memory',
    max: 100,
    ttl: config.memoryCacheTtl
  }); // generic
  const entryCache = cacheManager.caching({
    store: 'memory',
    max: 100,
    ttl: config.memoryCacheTtl
  });
  const entriesCache = cacheManager.caching({
    store: 'memory',
    max: 100,
    ttl: config.memoryCacheTtl,
  });

  const datamanager = new Datamanager({ url: config.datamanagerURL });

  function loadFromDataManagerOrCache(modelName, requestType, ...args) {
    if (requestType === 'entry') {
      return Promise.resolve(args)
      .then(([entryID, levels]) => {
        return entryCache.wrap(`${modelName}-${entryID}-${levels || 0}`, () => {
          return datamanager.model(modelName).entry(entryID, levels);
        });
      });
    }
    if (requestType === 'entries') {
      return Promise.resolve(args)
      .then(([{ size, page, sort, filter }]) => ({ size, page, sort, filter }))
      .then((configObject) => {
        return entriesCache.wrap(`${modelName}-${JSON.stringify(configObject)}`, () => {
          return datamanager.model(modelName).entries(configObject);
        });
      });
    }
    throw new Error(`unknown requestType: '${requestType}'`);
  }

  function filterFile(assetID, callback) {
    if (!assetID) {
      return callback();
    }
    return datamanager.getFileUrl(assetID)
    .then(url => callback(null, url))
    .catch((error) => {
      if (error.status === 404) {
        console.error(`FileURL not found: ${assetID}`);
      } else {
        console.error(error.message);
      }
      return callback();
    });
  }

  function filterImage(assetID, minSize, callback = minSize) {
    if (!assetID) {
      return callback();
    }
    if (typeof minSize !== 'number') {
      minSize = null;
    }
    memoryCache.wrap(assetID + (minSize || ''), (cacheCallback) => {
      datamanager.getImageUrl(assetID, minSize)
      .then(url => cacheCallback(null, url))
      .catch((error) => {
        if (error.status === 404) {
          console.error(`ImageURL not found: ${assetID}`);
        } else {
          console.error(error.message);
        }
        cacheCallback();
      });
    }, callback);
  }

  function filterImageThumb(assetID, minSize, callback = minSize) {
    if (!assetID) {
      return callback();
    }
    if (typeof minSize !== 'number') {
      minSize = null;
    }
    memoryCache.wrap(assetID + (minSize || ''), (cacheCallback) => {
      datamanager.getImageThumbUrl(assetID, minSize)
      .then(url => cacheCallback(null, url))
      .catch((error) => {
        if (error.status === 404) {
          console.error(`ImageThumbURL not found: ${assetID}`);
        } else {
          console.error(error.message);
        }
        cacheCallback();
      });
    }, callback);
  }

  function filterEntry(entryID, model, levels, callback = levels) {
    loadFromDataManagerOrCache(model, 'entry', entryID, levels && levels < 4 ? levels : null)
    .then(entry => entry.value)
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
        return loadFromDataManagerOrCache(model, 'entry', configObject.entryID, configObject.levels)
        .then(entry => entry.value);
      }
      return loadFromDataManagerOrCache(model, 'entries', configObject)
      .then(entries => Array.isArray(entries) ? entries : [entries])
      .then(entries => entries.map(entry => entry.value))
    })
    .then(result => {
      return result;
    });
  }

  const TemplateLoader = nunjucks.Loader.extend({
    init() {
      // setup a process which watches templates here
      // and call `this.emit('update', name)` when a template
      // is changed
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
        .then(entry => entry.value)
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
  };
}

module.exports = setupDatamanager;