#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const mkdirp = require('mkdirp');
const program = require('commander');
const inquirer = require('inquirer');
const Handlebars = require('handlebars');

const VERSION = require('../package').version;
const MODE_0755 = parseInt('0755', 8);
const TEMPLATE_DIR = path.join(__dirname, '..', 'templates')

program.name('expg')
  .version(VERSION)
  .usage('[dir]')
  .parse(process.argv);

main();

function main() {
  // Path
  const destinationPath = program.args.shift() || '.';
  // App name
  const appName = createAppName(path.resolve(destinationPath)) || 'expg-demo';

  isEmptyDir(destinationPath, (isEmpty) => {
    if (isEmpty) {
      inquirer.prompt([{
        type: 'confirm',
        name: 'confirm',
        message: `${appName} already exists, continue? [y/N]`,
        default: false
      }]).then((answers) => {
        if (answers.confirm) {
          createApplication(appName, destinationPath);
        }
      });
    } else {
      createApplication(appName, destinationPath);
    }
  });
}

function createAppName(appPath) {
  return path.basename(appPath)
    .replace(/[^A-Za-z0-9.-]+/g, '-')
    .replace(/^[-_.]+|-+$/g, '')
    .toLowerCase();
}

function isEmptyDir(dirPath, fn) {
  fs.readdir(dirPath, (err, files) => {
    if (err && err.code !== 'ENOENT') {
      throw err;
    }
    fn(files && files.length > 0);
  });
}

async function createApplication(appName, dir) {
  const answers = await inquirer.prompt([{
    type: 'input',
    name: 'version',
    message: 'Please enter the version.',
    default: '0.0.1'
  }, {
    type: 'input',
    name: 'description',
    message: 'Please enter the description.',
    default: `the repo of ${appName}`
  }, {
    type: 'input',
    name: 'author',
    message: 'Please enter the author.',
    default: ''
  }, {
    type: 'list',
    name: 'license',
    message: 'Please select the license.',
    choices: ['Apache', 'BSD', 'MIT']
  }, {
    type: 'confirm',
    name: 'persistent',
    message: 'Do you need to persistent log? [y/N]',
    default: false,
  }]);

  Object.assign(answers, { appName });

  const templatePath = path.join(TEMPLATE_DIR);
  copyDir(templatePath, appName);
  generateFile(templatePath, answers);
}

function copyDir(templatePath, parentPath) {
  const dirs = fs.readdirSync(templatePath);
  dirs.forEach((d) => {
    const targetPath = path.join(templatePath, d);
    if (fs.statSync(targetPath).isDirectory()) {
      const path = `./${parentPath}/${d}`;
      mkdirp.sync(path, MODE_0755);
      copyDir(targetPath, path);
    }
  });
}

function generateFile(templatePath, variables) {
  if (fs.statSync(templatePath).isFile()) {
    const content = Handlebars.compile(Buffer.from(fs.readFileSync(templatePath), 'UTF-8').toString())(variables);
    fs.writeFileSync(templatePath.replace(TEMPLATE_DIR, `./${variables.appName}`).replace('.hjs', ''), content);
  } else {
    const templates = fs.readdirSync(templatePath);
    templates.forEach((t) => {
      const targetPath = path.join(templatePath, t);
      generateFile(targetPath, variables);
    });
  }
}
