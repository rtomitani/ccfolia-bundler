import { join } from 'node:path'
import { Resolver, getResourceKey } from './bundle'
import { readFile } from 'node:fs/promises'
import { cwd } from 'node:process'
import mime from 'mime'
import { z } from 'zod'

const localSchema = z.object({
    path: z.string(),
})

const resolveLocal: Resolver = async (data, basePath) => {
    const { path } = localSchema.parse(data)

    const source = join(basePath, path)
    const content = await readFile(join(cwd(), source))
    const ext = source.split('.').pop()
    const key = getResourceKey(content, ext)

    return { data: key, resources: { [key]: { content, type: mime.getType(key) || 'application/octet-stream' } } }
}

export const localResolver = { local: resolveLocal }
