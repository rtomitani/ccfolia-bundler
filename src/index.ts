import { readFile } from 'node:fs/promises'
import AdmZip from 'adm-zip'
import { bundle, addResourcesToArchive, generateToken } from './bundle'
import * as path from 'node:path'

const main = async (args: string[]): Promise<number> => {
    const [source, target] = args
    if (source == null || target == null) {
        console.info('Usage: npm start -- <source> <target>')
        return 0
    }

    const data = JSON.parse((await readFile(source)).toString())
    const basePath = path.dirname(source)
    const result = await bundle(data, basePath)

    const zip = new AdmZip()
    zip.addFile('.token', Buffer.from(generateToken()))
    zip.addFile('__data.json', Buffer.from(JSON.stringify(result.data)))
    addResourcesToArchive(zip, result.resources)
    await new Promise<void>((resolve, reject) => {
        zip.writeZip(target, (err) => (err == null ? resolve() : reject(err)))
    })

    return 0
}

main(process.argv.slice(2)).then((code) => process.exit(code))
