# visual-cms.website

Visual CMS Website Library. By entrecode.

Since version 0.8.0 visual-cms.website is using for running without ec.render. Use the yoman generator to create your project, this will contain everything you need to get your dynamic-website running.

This library gives you all you need to quickly setup a dynamically rendered
[Nunjucks](https://mozilla.github.io/nunjucks/) website for usage with _ec.render_.

Features:

- [Nunjucks](https://mozilla.github.io/nunjucks/)
- [ec.sdk](https://www.npmjs.com/package/ec.sdk)
- Common filters (for date formatting, speaking URLs, ...)
- Promise-based [Express Router](https://www.npmjs.com/package/express-promise-router)
- Content Security Policies
- Cache-Control headers

## Usage

> Note: All visual-cms.websites need a name in the form `mywebsite.dynamic-website`. Automatic deployment relies on this.

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
can be used in another module, or in _ec.render._

It is recommended to add a `/config/local.yml` config file
(visual-cms.website uses [node config](https://www.npmjs.com/package/config) internally) and to
specify the file with the above code as "main" in your `package.json`.

## Documentation

### base import

```js
const { config, express, router, csp, datamanager, nunjucksEnv, cache } = require('visual-cms.website')(
  'mywebsite',
  __dirname,
  false,
);
```

This is the full import with all exported properties. As seen in the minimal example above, you
only need `express` and `router` in your main file. It is required that you call the module with
a unique identifier for your website (this must be the same that you use to register your project
with ec.render). The first call in your main file also needs the \_\_dirname property set, so the
module can successfully resolve all paths to files in your module (there are fixed paths that are
expected for config, templates etc.).

The returned module instance is a Singleton. If you require the module with the same project name
as first parameter again in another sub-library of your project, you'll get the same. This makes
it possible to e.g. reuse the Nunjucks Environment and your router object.

Since version 0.3.0 there is a optional third property `disableDataManager` which defaults to `false`. You can set this to `true` if you do not want any Data Manager integration. Note that some Nunchucks filter won't be available when this is disabled.

### `config` export

The module exports a config JSON object. It is by default rendered from `/config/default.yml` and `/config/local.yml`.
If your module is mounted in ec.render, ec.render will copy all contents from all files in
`/config/*.yml` (skipping `/config/local.yml`) into its own config. You can specify config for `production.yml`, `development.yml`, `stage.yml`, `staging.yml`, and `testing.yml`.

#### Example `default.yml` config file:

```yaml
title: entrecode Dynamic Website Boilerplate
publicURL: https://www.example.com
datamanagerURL: https://datamanager.entrecode.de/api/00000000
datamanagerRootURL: https://datamanager.entrecode.de
shortID: 00000000
useSDK: true # set if ec.sdk should be used instead of datamanager.js
dataManagerID: f7bc72b0-9883-4e5b-b17d-d1ff139c3433
searchURL: https://search.entrecode.de
locale: de                # for date/time formatting
timezone: Europe/Berlin   # for date/time formatting
analyticsID: UA-0000000-0
clientID: local-development
apiKey: # add JWT here if needed
disableTemplateCache : false
memoryCacheTtl: 3600 # in seconds => 1 hour,
variableStart: '{$',    #custom variable start, default: '{{'
variableEnd: '$}'       #custom variable end, default '}}'
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
You can set `csp.script-src`, `csp.style-src`, `csp.img-src`, `csp.font-src`, `csp.child-src`, `csp.connect-src` and `csp.manifest-src` to Arrays of other values, like this:

```js
csp['script-src'] = [csp.SELF, '*.entrecode.de', '*.googleapis.com'];
```

This would allow scripts from static files, from _.entrecode.de and from _.googleapis.com.

### `cache` export

By default, no Cache-Control headers are set, because it is assumed that some load balancer / proxy
does that (e.g. Amazon CloudFront). You can, however use the `cache` export to set a custom `Cache Control`
header.

#### cache.middleware(maxAge, ...args)

Always returns an express middleware.
The argument `maxAge` is the maxAge that should be set on the response in seconds.
You may specify additional properties. The three helpers `cache.NO_CACHE`, `cache.NO_STORE` and `cache.PRIVATE`
are available for you to use. Example: `cache.middleware(60 * 60, cache.PRIVATE)` will result in
`Cache-Control: private, max-age=3600`.

#### cache.set(res, maxAge, ...args)

Same as the middleware, but not as middleware. Just give the response object to set the header to.

### `datamanager` export

Some optimized methods to load data from [ec.datamanger](https://www.npmjs.com/package/ec.datamanager) or [ec.sdk](https://www.npmjs.com/package/ec.sdk),
but with in-memory caching. When the Data Manager integration is disabled this export is `false`. Set `config.useSDK` to true to enable ec.sdk.

#### datamanager.load(json)

The argument `json` is expected to be an object with arbitrary keys and values that are objects.
Those objects need to have the property `model` which is the title of the model to load data from.
If a property `entryID` is given, a single entry is loaded. Else, you may use the properties `size`, `page`, `sort` and `filter`
as described in the [Data Manager SDK Documentation](https://www.npmjs.com/package/ec.datamanager#entriesoptionsentrylistoptions).
The function returns the single entry if `entryID` is given, or _always_ an Array of entries otherwise. (This is different from normal SDK behavior.)
The properties are directly inside the returned entries (no `value` property as in datamanager.js).
If `config.useSDK` is set, the `filter` property is omitted because filters can be directly assigned; and the lists are complete sdk `EntryList`s.
Note that the date you try to load needs to be publicly available (i.e. needs a public get policy).

There is also da Nunjucks Template loader that allows loading templates from Data Manager.

`datamanager.datamanager` is the actual SDK instance, but should only be used for writing data, not for reading.

### `newNunjucksEnv()` export

Creates a new nunjucks environment like the exported `nunjucksEnv`. Can be used to create two different environments if needed.

### `nunjucksEnv` export

Your [Nunjucks Environment](https://mozilla.github.io/nunjucks/api.html#environment).

## Other features

### Nunjucks Templating

Put your template files in a folder `./views` and use them like this:

```js
router.get('/', (req, res) => {
  return Promise.resolve({ my: data }).then((data) => res.render('main.tpl.html', data));
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
res.render('mytemplatetype-entryid');
```

Note that by default, templates are cached. Specify `disableTemplateCache: true` in your config to
disable the cache for development.

### Nunjucks filters

Additionally to the [builtin filters](https://mozilla.github.io/nunjucks/templating.html#builtin-filters), we provide a few extra filters for use inside templates:

#### dm_entry (entryID, modelTitle, [levels], [options])

Loads a full entry from the specified model. **Note:** to get the title of a linked entry, you will not need this filter: it is already included in the resources' `_links`.
This filter is only needed if you need additional properties for a given `entryID` other than the title field property.
The optional `levels` argument can be used to load nested entries as well; the maximum level depth is 3.
This filter also supports Nunjucks keyword arguments for the option "ignoreErrors":

```
{{ entryID | dm_entry(modelTitle, 2, ignoreErrors=true }}
```

This will return `null` if the entry is not found.

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
Additionally to the default settings, `style`, `id` and `class` attributes are allowed on all tags.

**Attention:**

You **always** should use this when using Nunjuck's `safe` filter:

```
{{ someVariableWithHTML | xss | safe }}
```

#### vcms(object)

Renders HTML from a Visual CMS Object, using its [toDOM](https://www.npmjs.com/package/visual-cms.core) method.

#### json(object)

Returns json string

#### Asset Helper

The nunjucks environment includes three different filter for assets. One for files, images, and thumbnails. The helper will handle three main input types: A string assetID, an entry with embedded assets, or a resolved asset (loaded with a leveled request).

##### file(field?)

Returns the original file for this asset. `field` is the optional field name for embedded assets.

##### image(field?, size?)

Returns an image with at least `size` dimensions. `field` is the optional field name for embedded assets.

##### thumb(field?, size?)

Returns an image thumbnail with at least `size` dimensions. `field` is the optional field name for embedded assets.

## Troubleshooting

### SyntaxError: Invalid or unexpected token

This error:

> Template render error: (...path...)
> SyntaxError: Invalid or unexpected token

is often triggered after pasting code into templates. Usually, the code contains non-displayable characters.
To find them, search for `[^\x00-\xFF]` in your code and don't forget to enable RegEx searching. The characters will be highlighted. After deletion it should work.

### Imported Partial is not being displayed

Probably the partial does something asynchronous (e.g. load an image asset URL) and your `{% include %}` statement is inside a `{% for %}` loop. Use `{% asyncAll %}` or `{% asyncEach%}` instead.
