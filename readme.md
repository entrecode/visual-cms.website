# visual-cms.website

Visual CMS Website Library. By entrecode.

This library gives you all you need to quickly setup a dynamically rendered 
[Nunjucks](https://mozilla.github.io/nunjucks/) website for usage with *ec.render*.

Features:

- [Nunjucks](https://mozilla.github.io/nunjucks/)
- [ec.datamanger](https://www.npmjs.com/package/ec.datamanager)
- Common filters (for date formatting, speaking URLs, ...)
- Promise-based [Express Router](https://www.npmjs.com/package/express-promise-router)
- Content Security Policies

## Usage

This module requires Node.js ≥ 6.0.0. It uses ES2016 features.

Minimal example:
```js
const { router, express } = require('visual-cms.website')('mywebsite', __dirname);

router.get('/', (req, res) => res.send('hello world'));

if (module.parent) {
  module.exports = express;
} else {
  const port = process.env.npm_package_config_port || 3000;
  express.listen(port, () => {
    console.log(`dev server listening at http://localhost:${port}/`);
  });
}
```

This file will run a development server when started with node. It also exports an express app that
can be used in another module, or in *ec.render.*

It is recommended to add a `/config/default.yml` config file
(visual-cms.website uses [node config](https://www.npmjs.com/package/config) internally) and to 
specify the file with the above code as "main" in your `package.json`.

## Documentation

### base import

```js
const {
  config,
  express,
  router,
  csp,
  datamanager,
  nunjucksEnv,
} = require('visual-cms.website')('mywebsite', __dirname);
```

This is the full import with all exported properties. As seen in the minimal example above, you 
only need `express` and `router` in your main file. It is required that you call the module with
a unique identifier for your website (this must be the same that you use to register your project 
with ec.render). The first call in your main file also needs the __dirname property set, so the
module can successfully resolve all paths to files in your module (there are fixed paths that are
expected for config, templates etc.). 

The returned module instance is a Singleton. If you require the module with the same project name
as first parameter again in another sub-library of your project, you'll get the same. This makes
it possible to e.g. reuse the Nunjucks Environment and your router object.

### `config` export
The module exports a config JSON object. It is by default rendered from `/config/default.yml`.
However, if your module is mounted in ec.render, the configuration will be overwritten with the 
production config defined in ec.render.

#### Example `default.yml` config file:
```yaml
title: entrecode Dynamic Website Boilerplate
publicURL: https://www.example.com
datamanagerURL: https://datamanager.entrecode.de/api/00000000
datamanagerRootURL: https://datamanager.entrecode.de
shortID: 00000000
dataManagerID: f7bc72b0-9883-4e5b-b17d-d1ff139c3433
searchURL: https://search.entrecode.de
locale: de                # for date/time formatting
timezone: Europe/Berlin   # for date/time formatting
analyticsID: UA-0000000-0
clientID: local-development
apiKey: # add JWT here if needed
disableTemplateCache : false
memoryCacheTtl: 3600 # in seconds => 1 hour
```

### `express` export
This is your express app instance. It can be run with `express.listen(…)` or mounted in another
express app.

### `router` export
The main [Express Promise Router](https://www.npmjs.com/package/express-promise-router) object.
Use this to define your routes and build your application. It is automatically mounted in your 
express app.

### `csp` export
By default, the express app uses a 
[Content Security Policy](https://en.wikipedia.org/wiki/Content_Security_Policy) middleware. 
It allows common stuff, but e.g. disallows loading JavaScript from other servers. If you want that,
you have to add the hostnames to the CSP. The returned `csp` object has the following constants
defined: `csp.NONE`, `csp.UNSAFEINLINE`, `csp.SELF`.
You can set `csp.script-src`, `csp.style-src`, `csp.font-src` and `csp.connect-src` to Arrays of other values, like this:
```js
csp['script-src'] = [
  csp.SELF,
  '*.entrecode.de',
  '*.googleapis.com',
]
```
This would allow scripts from static files, from *.entrecode.de and from *.googleapis.com.

### `datamanager` export
Some optimized methods to load data from [ec.datamanger](https://www.npmjs.com/package/ec.datamanager),
but with in-memory caching.

#### datamanager.load(json)
The argument `json` is expected to be an object with arbitrary keys and values that are objects.
Those objects need to have the property `model` which is the title of the model to load data from.
If a property `entryID` is given, a single entry is loaded. Else, you may use the properties `size`, `page`, `sort` and `filter` 
as described in the [Data Manager SDK Documentation](https://www.npmjs.com/package/ec.datamanager#entriesoptionsentrylistoptions).
The function returns the single entry if `entryID` is given, or *always* an Array of entries otherwise. (This is different from normal SDK behavior.)
The properties are directly inside the returned entries (no `value` property as in the SDK). 
Note that the date you try to load needs to be publicly available (i.e. needs a public get policy).

There is also da Nunjucks Template loader that allows loading templates from Data Manager.

`datamanager.datamanager` is the actual SDK instance, but should only be used for writing data, not for reading.
 
### `nunjucksEnv` export
Your [Nunjucks Environment](https://mozilla.github.io/nunjucks/api.html#environment).

## Other features

### Nunjucks Templating

Put your template files in a folder `./views` and use them like this:
```js
router.get('/', (req, res) => {
  return Promise.resolve({my: data})
  .then(data => res.render('main.tpl.html', data));
});
```

### Nunjucks Extensions

Put `.js` files in a folder `./extensions`. They need to export a function accepting a nunjucks Instance
(which you don't have to use, but is there for you if you need `nunjucks.runtime.SafeString`).
The function has to return a valid [Nunjucks Extension](https://mozilla.github.io/nunjucks/api.html#custom-tags)
with properties `name` and `ExtensionClass`. They will be loaded automatically.


### Data Manager Template loading

Put following in your `config/default.yml`:

```yaml
dynamicTemplates:
  mytemplatetype:
    model: 'modelname'
```
(Of course, you need a Data Manager set up in the config already).

The model `modelname` needs two text-based fields `style` and `content`
that will be used to build the template. Use it like this:

```js
res.render('mytemplatetype-entryid')
```

Note that by default, templates are cached. Specify `disableTemplateCache: true` in your config to
disable the cache for development.

### Nunjucks filters

Additionally to the [builtin filters](https://mozilla.github.io/nunjucks/templating.html#builtin-filters), we provide a few extra filters for use inside templates:

#### dm_entry (entryID, modelTitle, [levels])

Loads a full entry from the specified model. **Note:** to get the title of a linked entry, you will not need this filter: it is already included in the resources' `_links`. 
This filter is only needed if you need additional properties for a given `entryID` other than the title field property.
The optional `levels` argument can be used to load nested entries as well; the maximum level depth is 3.

#### dm_file (assetID)

Loads the URL of an asset identified by `assetID`. **Note:** This filter is for non-image assets. Use the `dm_image` and `dm_thumbnail` filters for image assets.

#### dm_image (assetID, minSize)

Loads the URL of an image asset identified by `assetID`. Specify `minSize` in pixels to get the right size of the asset. Note that the image behind the returned URL may also be larger than `minSize`, so use CSS accordingly. 

#### dm_thumbnail (assetID, minSize)

Loads the Thumbnail-URL of an image asset identified by `assetID`. Thumbnails are always squared. 
Specify `minSize` in pixels to get the right size of the thumbnail. Note that the image behind the returned URL may also be larger than `minSize`, so use CSS accordingly. 

#### dm_linkedEntryTitle (entry, property)

Returns the title field value of a linked entry property. 

#### date_format (date, [format, locale, timezone])

Formats a given `date`. Internally uses [Moment.js](http://momentjs.com/), see [moment.format](http://momentjs.com/docs/#/displaying/format/) documentation for format details.
If `locale` or `timezone` are given, the defaults from the config can be overridden.

#### date_relative (date, [locale, timezone])

Formats a given `date` in words. Internally uses [Moment.js](http://momentjs.com/).
If `locale` or `timezone` are given, the defaults from the config can be overridden.

#### speakingurl (string, [options])

Generates a slug for usage inside a URL, using [speakingurl](https://www.npmjs.com/package/speakingurl)
`options` may be given for customization, as described in the [speakingurl Doc](https://www.npmjs.com/package/speakingurl#getsluginput-options). 
If no `options` is given, the language is set to the configured default locale. If you supply an `options` object, you'll need to set the `lang` yourself or it will fall back to english.

#### xss (string)

Protects from common Cross-Site-Scripting (XSS) Attacks, using [js-xss](https://www.npmjs.com/package/xss).
Additionally to the default settings, `style` and `class` attributes are allowed on all tags.

**Attention:**

You **always** should use this when using Nunjuck's `safe` filter:

```
{{ someVariableWithHTML | xss | safe }}
```
#### vcms(object)

Renders HTML from a Visual CMS Object, using its [toDOM](https://www.npmjs.com/package/visual-cms.core) method.

