require('dotenv').config()
const { Client } = require('@notionhq/client')
const readlineSync = require('readline-sync')
const puppeteer = require('puppeteer')

const notion = new Client({ auth: process.env.NOTION_KEY })

async function initBot() {
    console.clear()
    console.log('🤖 Wellcome to Notion Organization Bot')
    console.log('\n')

    return { data: await getData() }
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

    const homePage = await notion.pages.retrieve({
        page_id: process.env.NOTION_PAGE_ID
    })

    const DB01 = await notion.databases.retrieve({
        database_id: process.env.NOTION_DB01_ID
    })

    // const DB01_pagesID = await getPages(DB01)
    // return { homePage, DB01, DB01_pagesID }

    return { homePage, DB01 }
}

async function getPages(db) {
    const browser = await puppeteer.launch({
        headless: true,
        devtools: false
    });

    const page = await browser.newPage()
    page.setViewport({ width: 1366, height: 768 })

    await Promise.all([
        page.waitForNavigation(),
        await page.goto(`${db.url}`, {
            waitUntil: "networkidle0",
        })
    ])

    await Promise.all([
        page.waitForNavigation(),
        await page.type('[id="notion-email-input-1"]', process.env.NOTION_EMAIL),
        await page.keyboard.press("Enter", { delay: 1000 }),
        await page.type("#notion-password-input-2", process.env.NOTION_PW),
        await page.keyboard.press("Enter", { delay: 2000 })
    ])

    await page.waitForTimeout(5000)
    const pageID = await page.$$eval('.notion-table-view  div  .notion-collection-item', el => {
        return el.map(el => el.dataset.blockId)
    })

    await page.close()
    return pageID
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

async function createSubject({ title, type, link, step, teacher, pageId, DB01 }) {
    resetInterface()
    setStatus('🔨 Create Subjects...')
    console.log('\n')

    const pageMainURL = await (await notion.pages.retrieve({ page_id: pageId })).url
    const prefix = 'AA'

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
                            content: ''
                        }
                    }]
                }
            }
        ]
    })

    console.log('✅ Subject Create!!!')
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
        const option = readlineSync.question('📑 Opiton: ')

        if (option === '0') {
            const info = await getInfo()
            arguments.info = info

            // await setSettings(
            //     arguments.data.homePage,
            //     arguments.info.homePage_Title
            // )

            console.log(arguments.info);
        }

        if (option === '1') {
            await createSubject({
                title: readlineSync.question('Subject title: ') || 'ABC',
                type: arguments.data.DB01,
                link: arguments.info.platform_Link,
                step: arguments.data.DB01,
                teacher: readlineSync.question('Subject teacher: '),
                pageId: arguments.data.homePage.id,
                DB01: arguments.data.DB01
            })
        }

        // resetInterface()
        setStatus('🏁 Finished')
    })();
})


