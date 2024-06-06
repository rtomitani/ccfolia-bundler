import { createHash, randomBytes } from 'node:crypto'

const resolveSymbol = '$'

export type Resolver = (data: Object, basePath: string) => Promise<BundleInnerResult>
export type Resolvers = Record<string, Resolver>

export type RoomData = {
    resources: Record<string, { type: string }>
    [key: string]: unknown
}

export type Resources = Record<string, { content: Buffer; type: string }>

export const bundle = async (
    data: RoomData,
    basePath: string,
    resolvers: Resolvers
): Promise<{
    data: RoomData
    resources: Resources
}> => {
    const woResources = Object.fromEntries(Object.entries(data).filter(([key]) => key !== 'resources'))
    const bundled = await bundleInner(woResources, basePath, resolvers)
    const roomResources = Object.entries(bundled.resources).reduce((acc, [key, { type }]) => ({ ...acc, [key]: { type } }), {})

    return {
        data: {
            ...(bundled.data as RoomData),
            resources: { ...data.resources, ...roomResources },
        },
        resources: bundled.resources,
    }
}

type BundleInnerResult = { data: unknown; resources: Resources }

const bundleInner = async (data: unknown, basePath: string, resolvers: Resolvers): Promise<BundleInnerResult> => {
    if (typeof data !== 'object' || data === null) return { data, resources: {} }
    if (Array.isArray(data)) {
        const results = await Promise.all(data.map((d) => bundleInner(d, basePath, resolvers)))
        return {
            data: results.map((r) => r.data),
            resources: results.reduce((acc, r) => ({ ...acc, ...r.resources }), {}),
        }
    } else {
        if (resolveSymbol in data) {
            const resolverName = data[resolveSymbol]
            if (typeof resolverName !== 'string') throw new TypeError('resolverName ($) must be a string')
            if (!(resolverName in resolvers)) throw new TypeError(`Resolver "${resolverName}" not found`)
            const result = await resolvers[resolverName](data, basePath)
            return {
                data: result.data,
                resources: result.resources,
            }
        }
        let resources: Resources = {}
        const entries = await Promise.all(
            Object.entries(data).map(async ([key, value]) => {
                if (typeof value === 'object' && value !== null) {
                    const { data, resources: innerResources } = await bundleInner(value, basePath, resolvers)
                    resources = { ...resources, ...innerResources }
                    return [key, data]
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

export const getResourceKey = (content: Buffer, ext?: string): string => {
    const hash = createHash('sha256').update(content).digest('hex')
    return ext == null ? hash : `${hash}.${ext}`
}

export const generateToken = (): string => `0.${randomBytes(32).toString('hex')}`
