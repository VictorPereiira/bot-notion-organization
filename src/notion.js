require('dotenv').config()
const { Client } = require('@notionhq/client')
const readlineSync = require('readline-sync')

const notion = new Client({ auth: process.env.NOTION_KEY })

async function initBot() {
    console.clear()
    console.log('🤖 Wellcome to Notion Organization Bot')
    console.log('\n')

    const info = await getInfo()
    return { info, data: await getData() }
}

async function getInfo() {
    const info = {}
    info.homePage_Title = readlineSync.question('How would you like to call your home page? \nR: ')

    console.log('\n')
    info.platform_Link = readlineSync.question('What is the access link for your study platform? \nR: ')

    return info
}

async function getData() {
    resetInterface()
    setStatus('📥 GetData...')

    const DB01 = await notion.databases.retrieve({
        database_id: process.env.NOTION_DB01_ID
    })

    const homePage = await notion.pages.retrieve({
        page_id: process.env.NOTION_PAGE_ID
    })

    return { DB01, homePage }
}

async function setSettings(homePage, newTitle) {
    resetInterface()
    setStatus('🆙 Update Home Page Title...')

    await notion.pages.update({
        page_id: homePage.id,
        properties: {
            title: {
                title: [{
                    text: {
                        content: newTitle
                    }
                }]
            },
        }
    })
}

async function createSubject({ title, prefix, type, link, step, teacher, pageId, DB01 }) {
    const pageMainURL = await (await notion.pages.retrieve({ page_id: pageId })).url

    const page = await notion.pages.create({
        parent: {
            database_id: DB01.id
        },
        properties: {
            [DB01.properties.Name.id]: {
                title: [{
                    text: {
                        content: title
                    }
                }]
            },
            // [DB01_Type]: {
            //     select: [{
            //         select: category.map(cat => { id: cat.id })
            //     }]
            // }
            [DB01.properties.Links.id]: {
                rich_text: [
                    {
                        text: {
                            content: "Main Page",
                            link: {
                                url: pageMainURL
                            }
                        }
                    },
                    {
                        text: {
                            content: "   |   ",
                        }
                    },
                    {
                        text: {
                            content: `${prefix}-Site`,
                            link: {
                                url: link
                            }
                        }
                    }
                ]
            },
            // DB01_Step: { type: [{}]},
            [DB01.properties.Mentor.id]: {
                rich_text: [{
                    text: {
                        content: teacher
                    }
                }]
            }
        },
        children: [
            {
                paragraph: {
                    text: [{
                        text: {
                            content: 'Start Block'
                        }
                    }]
                }
            },
            {
                to_do: {
                    text: [{
                        type: "text",
                        text: {
                            content: "Lacinato kale"
                        }
                    }],
                    checked: false
                }
            }
        ]
    })

    console.log('✅ Page Create!!!');
}

function resetInterface() {
    console.clear()
    console.log('🤖 Notion Organization Bot')
    console.log('\n')
}

function setStatus(message) {
    console.log(`Status: ${message}`)
}


initBot().then((arguments) => {
    (async () => {
        // await setSettings(
        //     arguments.data.homePage,
        //     arguments.info.homePage_Title
        // )

        await createSubject({
            title: readlineSync.question('Subject title: ') || 'ABC',
            prefix: readlineSync.question('Subject prefix: ') || 'AB',
            type: arguments.data.DB01,
            link: arguments.info.platform_Link,
            step: arguments.data.DB01,
            teacher: readlineSync.question('Subject teacher: '),
            pageId: arguments.data.homePage.id,
            DB01: arguments.data.DB01
        })

        // resetInterface()
        setStatus('🏁 Finished')
    })();
})


