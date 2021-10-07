require('dotenv').config()
const { Client } = require('@notionhq/client')
const readlineSync = require('readline-sync')
const puppeteer = require('puppeteer')

const notion = new Client({ auth: process.env.NOTION_KEY })

// Get data
async function initBot() {
    console.clear()
    console.log('🤖 Wellcome to Notion Organization Bot')
    console.log('\n')

    const data = await getData()
    const info = await getInfo(data.homePage)

    return { data, info }
}

async function getInfo(homePage) {
    resetInterface()
    setStatus('📥 GetInfo...')
    const info = {}

    try {
        info.homePage_Title = homePage.properties.title.title[0].plain_text
    } catch (error) {
        info.homePage_Title = readlineSync.question('How would you like to call your home page? \nR: ')
        await setSettings(homePage, info.homePage_Title)
    }

    resetInterface()
    setStatus('🆙 Update Plataform Link...')
    // NOTION_PLATFORM_LINK = 'https://example.com/'
    info.platform_Link = process.env.NOTION_PLATFORM_LINK

    if (info.platform_Link === undefined) {
        info.platform_Link = readlineSync.question('What is the access link for your study platform? \nR: ')
    }

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

    return { homePage, DB01 }
}


// Bot functions
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

async function createSubject(subjectInfo) {
    resetInterface()
    console.log(`Status: 🔨 Create Subjects...`)
    console.log('\n')

    let i = 0
    let infoAmount = subjectInfo.length
    let subjects = []

    async function runCreateSubject(subjectInfo) {
        const prefix = await createPrefix(subjectInfo[i].title)
        const DB01_title = subjectInfo[i].DB01.properties.Name.id
        const DB01_links = subjectInfo[i].DB01.properties.Links.id
        const DB01_mentor = subjectInfo[i].DB01.properties.Mentor.id

        const page = await notion.pages.create({
            parent: {
                database_id: subjectInfo[i].DB01.id
            },
            properties: {
                [DB01_title]: {
                    title: [{
                        text: {
                            content: subjectInfo[i].title
                        }
                    }]
                },
                [DB01_links]: {
                    rich_text: [
                        {
                            text: {
                                content: "Main Page",
                                link: {
                                    url: subjectInfo[i].pageMainURL
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
                                    url: subjectInfo[i].link
                                }
                            }
                        }
                    ]
                },
                // DB01_Step: { type: [{}]},
                [DB01_mentor]: {
                    rich_text: [{
                        text: {
                            content: subjectInfo[i].teacher
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

        subjects.push({
            pageId: page.id,
            classAmount: subjectInfo[i].classAmount
        })

        i++
        console.log(`✅ Subject ${prefix} - Create!!!`)
        if (i < infoAmount) await runCreateSubject(subjectInfo)
    }

    await runCreateSubject(subjectInfo)
    return subjects
}

async function createSubjectContent(subjects) {
    const i = 0
    const loop = subjects.length

    async function runCreateSubjectContent(subjects) {
        const urlPage = (await notion.pages.retrieve({ page_id: subjects[i].pageId })).url
        const browser = await puppeteer.launch({
            headless: false,
            devtools: false
        });

        const page = await browser.newPage()
        page.setViewport({ width: 1366, height: 768 })

        await Promise.all([
            page.waitForNavigation(),
            await page.goto(urlPage, {
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

        await page.waitForTimeout(3000)
        await page.click('.notion-page-content .notranslate')
        await page.keyboard.type('/Quote')
        await page.keyboard.press("Enter", { delay: 100 })
        await page.keyboard.type('**⚓ Index**')
        await page.keyboard.press("Enter", { delay: 100 })

        await page.keyboard.type(`Class ${i} - Class Title`)

        i++
        if (i < loop) await runCreateSubjectContent(subjects)
    }

    await runCreateSubjectContent(subjects)
}


async function createPrefix(pfx) {
    let prefix = ''

    pfx.split(' ').map(el => el[0]).forEach(el => {
        return prefix += el.toUpperCase()
    });

    return prefix
}


// No async functions
function resetInterface() {
    console.clear()
    console.log('🤖 Notion Organization Bot')
    console.log('\n')
}

function setStatus(message) {
    console.log(`Status: ${message}`)
    console.log('\n')
}


// Init Bot
initBot().then((arguments) => {
    (async () => {
        resetInterface()
        setStatus('🧭 Open Menu Opitions')
        const option = readlineSync.question('Opiton: ')

        if (option === '0') {
            // await setSettings(
            //     arguments.data.homePage,
            //     arguments.info.homePage_Title
            // )
        }

        if (option === '1') {
            resetInterface()
            setStatus('🔨 Create Subjects...')

            const subjectAmount = readlineSync.question('How many subjects do you want to create: ')
            let subjectCount = 0
            let subjectInfo = []

            resetInterface()
            console.log('Status: 🔨 Create Subjects...')
            console.log(`Process: 📥 Get info of ${subjectAmount} Subjects...`);
            console.log('\n');

            async function createSubjectInfo(arguments) {
                console.log(`Subject - ${subjectCount + 1}`);

                subjectInfo.push({
                    title: readlineSync.question('Subject title: ') || 'ABC',
                    teacher: readlineSync.question('Subject teacher: '),
                    classAmount: readlineSync.question('Class Amount: '),
                    link: arguments.info.platform_Link,
                    step: arguments.data.DB01,
                    pageMainURL: arguments.data.homePage.url,
                    DB01: arguments.data.DB01
                })

                subjectCount++
                console.log('\n');
                if (subjectCount < subjectAmount) await createSubjectInfo(arguments)
            }

            await createSubjectInfo(arguments)
            const subjects = await createSubject(subjectInfo)
            await createSubjectContent(subjects)
        }

        // resetInterface()
        // setStatus('🏁 Finished')
        // setTimeout(() => console.clear(), 3000)
    })();
})


