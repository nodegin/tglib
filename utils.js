const fs = require('fs')
const path = require('path')
const ref = require('ref-napi')
const inquirer = require('inquirer')

const mkdirp = dir => path
    .resolve(dir)
    .split(path.sep)
    .reduce((acc, cur) => {
        const currentPath = path.normalize(acc + path.sep + cur)
        try {
            fs.statSync(currentPath)
        } catch (e) {
            if (e.code === 'ENOENT') {
                fs.mkdirSync(currentPath)
            } else {
                throw e
            }
        }
        return currentPath
    }, '')

const ensureDir = p => fs.statSync(mkdirp(p)).isDirectory()

const utils = {
  buildQuery(query) {
    const buffer = Buffer.from(JSON.stringify(query) + '\0', 'utf-8')
    buffer.type = ref.types.CString
    return buffer
  },
  async getInput(type, message) {
    let input = ''
    while (!input.length) {
      const result = await inquirer.prompt([
        { type, name: 'input', message },
      ])
      input = result.input
    }
    return input
  },
  emptyFunction() {},
  ensureDir,
}

module.exports = utils
