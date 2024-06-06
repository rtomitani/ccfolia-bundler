import { join } from 'node:path'
import { Resolver, getResourceKey } from './bundle'
import { readFile } from 'node:fs/promises'
import { cwd } from 'node:process'
import mime from 'mime'

const resolveLocal: Resolver = async (data, basePath) => {
    if (!('path' in data)) throw new TypeError('local resolver requires a path')
    if (typeof data.path !== 'string') throw new TypeError('path must be a string')

    const source = join(basePath, data.path)
    const content = await readFile(join(cwd(), source))
    const ext = source.split('.').pop()
    const key = getResourceKey(content, ext)

    return { data: key, resources: { [key]: { content, type: mime.getType(key) || 'application/octet-stream' } } }
}

export const localResolver = { local: resolveLocal }
