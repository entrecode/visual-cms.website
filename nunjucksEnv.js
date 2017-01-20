const nunjucks = require('nunjucks');
const moment = require('moment-timezone');
const speakingurl = require('speakingurl');
const requireAll = require('require-all');
const path = require('path');
const vcms = require('visual-cms.core');
const xss = require('xss');
const config = require('config');

const xssWhitelist = {};
Object.keys(xss.whiteList).forEach((tagName) => {
  xssWhitelist[tagName] = xss.whiteList[tagName].concat(['style', 'class']);
});
//const extensions = requireAll(path.resolve(__dirname, '../extensions'));

function setupNunjucksEnv(config, datamanager) {

  const nunjucksEnv = new nunjucks.Environment([
    new nunjucks.FileSystemLoader(path.resolve(config.basedir, './views'), { watch: true }),
  ]);

  nunjucksEnv.addFilter('dm_entry', datamanager.filterEntry, true);
  nunjucksEnv.addFilter('dm_file', datamanager.filterFile, true);
  nunjucksEnv.addFilter('dm_image', datamanager.filterImage, true);
  nunjucksEnv.addFilter('dm_thumbnail', datamanager.filterImageThumb, true);
  nunjucksEnv.addFilter('dm_linkedEntryTitle', datamanager.filterLinkedEntryTitle, false);
  nunjucksEnv.addFilter('date_format', (date, format, locale, tz) => moment(date).tz(tz ||
    config.timezone).locale(locale || config.locale).format(format));
  nunjucksEnv.addFilter('date_relative', (date, locale, tz) => moment(date).tz(tz || config.timezone).locale(locale ||
    config.locale).fromNow());
  nunjucksEnv.addFilter('speakingurl', (input, options = { lang: config.locale }) => speakingurl(input, options));
  nunjucksEnv.addFilter('xss', input => xss(input, { whiteList: xssWhitelist }));
  nunjucksEnv.addFilter('vcms', vcms.toDOM);
  /*
   Object.keys(extensions)
   .map(key => extensions[key])
   .filter(extension => extension && 'name' in extension && 'ExtensionClass' in extension)
   .forEach(extension => nunjucksEnv.addExtension(extension.name, new extension.ExtensionClass()));
   */
return nunjucksEnv;
}
module.exports = setupNunjucksEnv;
