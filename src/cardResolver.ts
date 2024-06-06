import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { cwd } from 'node:process'
import { Resolver, getResourceKey } from './bundle'
import { createCanvas, loadImage, CanvasRenderingContext2D } from 'canvas'
import mime from 'mime'

const supportedMimeTypes = ['image/jpeg', 'image/png'] as const
type SupportedMimeType = (typeof supportedMimeTypes)[number]

const isSupportedMimeType = (type: string): type is SupportedMimeType => supportedMimeTypes.includes(type as SupportedMimeType)

const resolveCard: Resolver = async (data, basePath) => {
    if (!('baseImagePath' in data)) throw new TypeError('cards resolver requires a baseImagePath')
    if (typeof data.baseImagePath !== 'string') throw new TypeError('baseImagePath must be a string')
    if (!('contents' in data)) throw new TypeError('cards resolver requires contents')
    if (!Array.isArray(data.contents)) throw new TypeError('contents must be an array')

    const baseImage = await readFile(join(cwd(), basePath, data.baseImagePath))
    const ext = data.baseImagePath.split('.').pop()
    const type = mime.getType(ext ?? '') ?? ''
    if (!isSupportedMimeType(type)) throw new TypeError('Unsupported image type')

    const cards = await Promise.all(
        data.contents.map(async ({ title, memo }) => {
            if (title == null) throw new TypeError('title is required')
            if (typeof title !== 'string') throw new TypeError('title must be a string')
            const image = await generateCardImage(baseImage, title, type)
            const resourceKey = getResourceKey(image, ext)
            return {
                image,
                resourceKey,
                memo,
                type,
            }
        })
    )

    return {
        data: Object.fromEntries(cards.map(({ resourceKey, memo }) => [generateItemKey(), { imageUrl: resourceKey, memo }])),
        resources: Object.fromEntries(cards.map(({ resourceKey, image, type }) => [resourceKey, { content: image, type }])),
    }
}

const generateCardImage = async (baseImage: Buffer, title: string, mimeType: SupportedMimeType): Promise<Buffer> => {
    const image = await loadImage(baseImage)
    const canvas = createCanvas(image.width, image.height)
    const ctx = canvas.getContext('2d')
    ctx.drawImage(image, 0, 0)
    ctx.fillStyle = 'white'

    tategaki(ctx, title, { font: 'Arial', padding: 10, maxFontSize: 80 })

    return mimeType === 'image/jpeg' ? canvas.toBuffer('image/jpeg') : canvas.toBuffer('image/png')
}

function tategaki(ctx: CanvasRenderingContext2D, text: string, config: { font: string; padding: number; maxFontSize: number }) {
    const lines = text.split('\n')
    const maxLength = Math.max(...lines.map((line) => line.length))
    const fontSize = Math.floor(Math.min((ctx.canvas.height - config.padding * 2) / maxLength, config.maxFontSize))

    ctx.font = `${fontSize}px ${config.font}`

    const characterSize = ctx.measureText('あ').width

    const startY = (ctx.canvas.height - characterSize * maxLength) / 2

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i]

        const x = (ctx.canvas.width + lines.length * characterSize) / 2 - characterSize * (i + 1)
        for (let j = 0; j < line.length; j++) {
            const y = startY + characterSize * (j + 1)
            ctx.fillText(line[j], x, y)
        }
    }
}

const generateItemKey = (): string => {
    const characters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    return Array.from({ length: 20 }, () => characters[Math.floor(Math.random() * characters.length)]).join('')
}

export const cardResolver = { card: resolveCard }
