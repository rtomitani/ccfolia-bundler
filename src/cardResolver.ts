import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { cwd } from 'node:process'
import { Resolver, getResourceKey } from './bundle'
import { createCanvas, loadImage, CanvasRenderingContext2D, registerFont } from 'canvas'
import mime from 'mime'
import { z } from 'zod'

const cardSchema = z.object({
    baseImagePath: z.string(),
    font: z
        .union([
            z.object({
                type: z.literal('name'),
                name: z.string(),
            }),
            z.object({
                type: z.literal('path'),
                path: z.string(),
                family: z.string(),
            }),
        ])
        .and(
            z.object({
                maxSize: z.number(),
            })
        ),
    padding: z.number(),
    contents: z.array(
        z.object({
            title: z.string(),
            memo: z.string().optional(),
        })
    ),
})

const supportedMimeTypes = ['image/jpeg', 'image/png'] as const
type SupportedMimeType = (typeof supportedMimeTypes)[number]

const isSupportedMimeType = (type: string): type is SupportedMimeType => supportedMimeTypes.includes(type as SupportedMimeType)

const resolveCard: Resolver = async (data, basePath) => {
    const { baseImagePath, contents, font, padding } = cardSchema.parse(data)

    // Load base image
    const baseImage = await readFile(join(cwd(), basePath, baseImagePath))
    const ext = baseImagePath.split('.').pop()
    const type = mime.getType(ext ?? '') ?? ''
    if (!isSupportedMimeType(type)) throw new TypeError('Unsupported image type')

    // Load font if specified
    if (font.type === 'path') {
        const fontPath = join(cwd(), basePath, font.path)
        registerFont(fontPath, { family: font.family })
    }

    const cards = await Promise.all(
        contents.map(async ({ title, memo }) => {
            if (title == null) throw new TypeError('title is required')
            if (typeof title !== 'string') throw new TypeError('title must be a string')
            const image = await generateCardImage(baseImage, title, type, { padding, font: { name: font.type === 'name' ? font.name : font.family, maxSize: font.maxSize } })
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

const generateCardImage = async (baseImage: Buffer, title: string, mimeType: SupportedMimeType, config: { padding: number; font: { name: string; maxSize: number } }): Promise<Buffer> => {
    const image = await loadImage(baseImage)
    const canvas = createCanvas(image.width, image.height)
    const ctx = canvas.getContext('2d')
    ctx.drawImage(image, 0, 0)
    ctx.fillStyle = 'white'

    tategaki(ctx, title, { font: config.font.name, padding: config.padding, maxFontSize: config.font.maxSize })

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
