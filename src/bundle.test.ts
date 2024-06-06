import { describe, expect, test } from 'vitest'
import { RoomData, bundle } from './bundle'
import { localResolver } from './localResolver'
import { cardResolver } from './cardResolver'

describe('bundle', () => {
    test('returns the same data if no resources to be resolved', async () => {
        const data: RoomData = {
            entities: {
                decks: {
                    Cd5XyQIOyu0VSl79yu5h: {
                        coverImageUrl: '7f446feddbf04b16b11cb08bbbab12d8423dfe254ebc5e9885fc62ffb896b359.png',
                    },
                },
            },
            resources: {
                '7f446feddbf04b16b11cb08bbbab12d8423dfe254ebc5e9885fc62ffb896b359.png': {
                    type: 'image/png',
                },
            },
        }

        expect(bundle(data, './mock', {})).resolves.toMatchObject({ data, resources: {} })
    })

    test('resolves local paths and extract them to corresponding array', async () => {
        const data: RoomData = {
            entities: {
                decks: {
                    Cd5XyQIOyu0VSl79yu5h: {
                        coverImageUrl: {
                            $: 'local',
                            path: 'mock.png',
                        },
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
                            coverImageUrl: '7f446feddbf04b16b11cb08bbbab12d8423dfe254ebc5e9885fc62ffb896b359.png',
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
                    content: expect.any(Buffer),
                },
            },
        }

        expect(bundle(data, './mock', { ...localResolver })).resolves.toMatchObject(expected)
    })

    test('resolves duplicate local files as a single resource', async () => {
        const data: RoomData = {
            entities: {
                decks: {
                    Cd5XyQIOyu0VSl79yu5h: {
                        coverImageUrl: {
                            $: 'local',
                            path: 'mock.png',
                        },
                        items: {
                            Ghk029mKGwoZZqCTYLnw: {
                                imageUrl: {
                                    $: 'local',
                                    path: 'mock.png',
                                },
                            },
                        },
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
                            coverImageUrl: '7f446feddbf04b16b11cb08bbbab12d8423dfe254ebc5e9885fc62ffb896b359.png',
                            items: {
                                Ghk029mKGwoZZqCTYLnw: {
                                    imageUrl: '7f446feddbf04b16b11cb08bbbab12d8423dfe254ebc5e9885fc62ffb896b359.png',
                                },
                            },
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
                    content: expect.any(Buffer),
                },
            },
        }

        expect(bundle(data, './mock', { ...localResolver })).resolves.toMatchObject(expected)
    })

    test('errors if no corresponding resolver is provided', async () => {
        const data: RoomData = {
            entities: {
                decks: {
                    Cd5XyQIOyu0VSl79yu5h: {
                        coverImageUrl: {
                            $: 'local',
                            path: 'mock.png',
                        },
                    },
                },
            },
            resources: {},
        }

        expect(bundle(data, './mock', {})).rejects.toThrowError()
    })

    test('errors if file is not found', async () => {
        const data: RoomData = {
            entities: {
                decks: {
                    Cd5XyQIOyu0VSl79yu5h: {
                        coverImageUrl: {
                            $: 'local',
                            path: 'not-exist.png',
                        },
                    },
                },
            },
            resources: {},
        }

        expect(bundle(data, './mock', { ...localResolver })).rejects.toThrowError()
    })
})

describe('cardResolver', () => {
    test('generates cards and bundle them', async () => {
        const data: RoomData = {
            entities: {
                decks: {
                    Cd5XyQIOyu0VSl79yu5h: {
                        items: {
                            $: 'card',
                            baseImagePath: './mock.png',
                            contents: [{ title: 'Card 1', memo: 'This is card 1' }],
                        },
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
                            items: expect.any(Object),
                        },
                    },
                },
                resources: expect.any(Object),
            },
            resources: expect.any(Object),
        }

        const result = await bundle(data, './mock', { ...cardResolver })
        expect(result).toMatchObject(expected)

        const items = (result as any).data.entities.decks.Cd5XyQIOyu0VSl79yu5h.items
        expect(Object.values(items)).toHaveLength(1)
        expect(Object.values(items)[0]).toMatchObject({
            imageUrl: expect.any(String),
            memo: 'This is card 1',
        })
        expect(Object.values(result.data.resources)).toHaveLength(1)
        expect(Object.values(result.data.resources)[0]).toMatchObject({
            type: 'image/png',
        })
        expect(Object.values(result.resources)).toHaveLength(1)
    })
})
