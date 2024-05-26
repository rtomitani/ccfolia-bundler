import { describe, expect, test } from 'vitest'
import { RoomData, bundle, addResourcesToArchive, generateToken } from './bundle'
import AdmZip from 'adm-zip'

describe('bundle', () => {
    test('should replace bundle URIs in room data and extact them to corresponding array', async () => {
        const data: RoomData = {
            entities: {
                decks: {
                    Cd5XyQIOyu0VSl79yu5h: {
                        x: 7,
                        y: -35,
                        z: 99,
                        width: 8,
                        height: 12,
                        coverImageUrl: 'bundle://mock.png',
                    },
                },
            },
            resources: {},
        }
        const expected = {
            data: {
                entities: {
                    decks: {
                        Cd5XyQIOyu0VSl79yu5h: {
                            x: 7,
                            y: -35,
                            z: 99,
                            width: 8,
                            height: 12,
                            coverImageUrl: 'wrong-id.png',
                        },
                    },
                },
                resources: {
                    '7f446feddbf04b16b11cb08bbbab12d8423dfe254ebc5e9885fc62ffb896b359.png': {
                        type: 'image/png',
                    },
                },
            },
            resources: {
                '7f446feddbf04b16b11cb08bbbab12d8423dfe254ebc5e9885fc62ffb896b359.png': {
                    sourcePath: 'mock/mock.png',
                },
            },
        }

        expect(bundle(data, './mock')).resolves.toMatchObject(expected)
    })

    test('should archive the resources at "mock/mock.png"', () => {
        const zip = addResourcesToArchive(new AdmZip(), {
            'cf0bf8eab6ada406dba81fe4ce0ccdaec4deab763469bd3ea786fff14b4d0b05.png': {
                sourcePath: 'mock/mock.png',
                type: 'image/png',
            },
        })

        const entries = zip.getEntries()
        expect(entries).toHaveLength(1)
        expect(entries[0].entryName).toBe('cf0bf8eab6ada406dba81fe4ce0ccdaec4deab763469bd3ea786fff14b4d0b05.png')
    }),
        test('should archive the resources at "./mock/mock.png', () => {
            const zip = addResourcesToArchive(new AdmZip(), {
                'cf0bf8eab6ada406dba81fe4ce0ccdaec4deab763469bd3ea786fff14b4d0b05.png': {
                    sourcePath: './mock/mock.png',
                    type: 'image/png',
                },
            })

            const entries = zip.getEntries()
            expect(entries).toHaveLength(1)
            expect(entries[0].entryName).toBe('cf0bf8eab6ada406dba81fe4ce0ccdaec4deab763469bd3ea786fff14b4d0b05.png')
        }),
        test('should generate a random token', () => {
            const token = generateToken()
            expect(token).toMatch(/^0\.[0-9a-f]{64}$/)
        })
})
