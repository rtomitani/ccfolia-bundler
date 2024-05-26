import { createHash, randomBytes } from 'node:crypto'
import mime from 'mime'
import AdmZip from 'adm-zip'
import { join } from 'node:path'
import { cwd } from 'node:process'
import { readFile } from 'node:fs/promises'

const bundlePrefix = 'bundle://'

export type RoomData = {
    resources: Record<string, { type: string }>
} & Record<string, unknown>

export type Resources = Record<string, { sourcePath: string; type: string }>

export const bundle = async (
    data: RoomData,
    basePath: string
): Promise<{
    data: RoomData
    resources: Resources
}> => {
    const woResources = Object.fromEntries(Object.entries(data).filter(([key]) => key !== 'resources'))
    const bundled = await bundleInner(woResources, basePath)
    const roomResources = Object.entries(bundled.resources).reduce((acc, [key, { type }]) => ({ ...acc, [key]: { type } }), {})

    return {
        data: {
            ...(bundled.data as RoomData),
            resources: roomResources,
        },
        resources: bundled.resources,
    }
}

type BundleInnerResult = { data: unknown; resources: Resources }

const bundleInner = async (data: unknown, basePath: string): Promise<BundleInnerResult> => {
    if (typeof data !== 'object' || data === null) return { data, resources: {} }
    if (Array.isArray(data)) {
        const results = await Promise.all(data.map((d) => bundleInner(d, basePath)))
        return {
            data: results.map((r) => r.data),
            resources: results.reduce((acc, r) => ({ ...acc, ...r.resources }), {}),
        }
    } else {
        let resources: Resources = {}
        const entries = await Promise.all(
            Object.entries(data).map(async ([key, value]) => {
                if (typeof value === 'object' && value !== null) {
                    const { data, resources: innerResources } = await bundleInner(value, basePath)
                    resources = { ...resources, ...innerResources }
                    return [key, data]
                } else if (typeof value === 'string' && value.startsWith(bundlePrefix)) {
                    const sourcePath = getPathFromBundleUri(value, basePath)
                    const buffer = await readFile(join(cwd(), sourcePath))
                    const dest = `${getSha256FromBuffer(buffer)}.${sourcePath.split('.').pop()}`
                    resources[dest] = { sourcePath, type: mime.getType(dest) || 'application/octet-stream' }
                    return [key, dest]
                } else {
                    return [key, value]
                }
            })
        )
        return {
            data: Object.fromEntries(entries),
            resources,
        }
    }
}

export const addResourcesToArchive = (zip: AdmZip, resources: Resources): AdmZip => {
    for (const [dest, { sourcePath }] of Object.entries(resources)) {
        zip.addLocalFile(sourcePath, '', dest)
    }
    return zip
}

export const generateToken = (): string => `0.${randomBytes(32).toString('hex')}`

const getPathFromBundleUri = (uri: string, basePath: string): string => {
    if (!uri.startsWith(bundlePrefix)) throw new TypeError('Invalid bundle URI')
    return join(basePath, uri.replace(bundlePrefix, ''))
}

const getSha256FromBuffer = (buffer: Buffer): string => {
    const hash = createHash('sha256')
    hash.update(buffer)
    return hash.digest('hex')
}
