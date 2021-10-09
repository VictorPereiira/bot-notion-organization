require('dotenv').config()
const { Client } = require('@notionhq/client')
const readlineSync = require('readline-sync')
const puppeteer = require('puppeteer')

const notion = new Client({ auth: process.env.NOTION_KEY })

// Get data
async function initBot() {
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
    console.log(`Process: 📃 Creating Subjects Pages...`)
    console.log('\n');

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
            classAmount: subjectInfo[i].classAmount,
            classTitle: subjectInfo[i].classTitle
        })

        i++
        console.log(`✅ Page for ${prefix} - Created!!!`)
        if (i < infoAmount) await runCreateSubject(subjectInfo)
    }

    await runCreateSubject(subjectInfo)
    console.log('\n');
    return subjects
}

async function createSubjectContent(subjects) {
    console.log('Process: 📕 Creating Subjects Content...')
    console.log('\n');

    let i = 0
    const loop = subjects.length

    const browser = await puppeteer.launch({
        headless: false,
        devtools: false
    });

    const page = await browser.newPage()
    page.setViewport({ width: 1366, height: 768 })

    async function runCreateSubjectContent(subjects) {
        const urlPage = (await notion.pages.retrieve({ page_id: subjects[i].pageId })).url

        await Promise.all([
            page.waitForNavigation(),
            await page.goto(urlPage, {
                waitUntil: "networkidle0",
            })
        ])

        if (i === 0) {
            await Promise.all([
                page.waitForNavigation(),
                await page.type('[id="notion-email-input-1"]', process.env.NOTION_EMAIL),
                await page.keyboard.press("Enter", { delay: 1000 }),
                await page.type("#notion-password-input-2", process.env.NOTION_PW),
                await page.keyboard.press("Enter", { delay: 2000 })
            ])
        }

        let classCount = 0
        let classAmount = subjects[i].classAmount
        let classTitle = subjects[i].classTitle

        await page.waitForTimeout(1500)
        await page.click('.notion-page-content .notranslate')
        await page.keyboard.type('/Quote', { delay: 100 })
        await page.keyboard.press("Enter", { delay: 100 })
        await page.keyboard.type('**⚓ Index**', { delay: 50 })
        await page.keyboard.type('/Gray background')
        await page.keyboard.press("Enter", { delay: 100 })
        await page.keyboard.press("Enter", { delay: 100 })

        async function loopClassIndex(classCount, classTitle) {
            if ((classCount + 1) <= 9) {
                if (classCount == 0) await page.keyboard.type(`[]Class 0${classCount + 1} - ${classTitle[classCount]}`)
                else await page.keyboard.type(`Class 0${classCount + 1} - ${classTitle[classCount]}`)
            } else {
                await page.keyboard.type(`Class ${classCount + 1} - ${classTitle[classCount]}`)
            }

            classCount++
            await page.keyboard.press("Enter", { delay: 100 })
            if (classCount < classAmount) await loopClassIndex(classCount, classTitle)
        }

        await loopClassIndex(classCount, classTitle)
        await page.keyboard.press("Enter", { delay: 100 })
        await page.keyboard.press("Enter", { delay: 100 })

        classCount = 0
        async function loopClassTopic(classCount, classTitle) {
            await page.keyboard.type('/H3', { delay: 50 })
            await page.keyboard.press("Enter", { delay: 100 })

            if ((classCount + 1) <= 9) await page.keyboard.type(`**Class 0${classCount + 1} - ${classTitle[classCount]}**`, { delay: 50 })
            else await page.keyboard.type(`**Class ${classCount + 1} - ${classTitle[classCount]}**`, { delay: 50 })

            await page.keyboard.press("Enter", { delay: 100 })
            await page.keyboard.type('---')
            await page.keyboard.press("Enter", { delay: 100 })

            await page.keyboard.type('-')
            await page.keyboard.press("Space")
            await page.keyboard.type('👇🏾 Content here')

            await page.keyboard.press("Enter", { delay: 100 })
            await page.keyboard.press("Enter", { delay: 100 })
            await page.keyboard.press("Enter", { delay: 100 })

            classCount++
            if (classCount < classAmount) await loopClassTopic(classCount, classTitle)
        }

        await loopClassTopic(classCount, classTitle)
        console.log(`✅ Subject ${i} Content - Created!!!`)

        i++
        await page.waitForTimeout(1000)
        if (i < loop) await runCreateSubjectContent(subjects)
    }

    await runCreateSubjectContent(subjects)
    await page.waitForTimeout(2000)
    await browser.close()
}

async function createPrefix(pfx) {
    let prefix = ''

    pfx.split(' ').map(el => el[0]).forEach(el => {
        return prefix += el.toUpperCase()
    });

    return prefix
}

async function classInfo(classAmount) {
    let info = []

    for (let i = 0; i < classAmount; i++) {
        info.push(readlineSync.question(`Title of Class ${i + 1}: `))
    }

    return info
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

        const optionsTitle = ['Create Subject']
        const option = readlineSync.keyInSelect(optionsTitle, 'Choose an option: ')

        if (option == 0) {
            resetInterface()
            setStatus('🔨 Creating Subjects...')

            const subjectAmount = readlineSync.question('How many subjects do you want to create: ')
            let subjectCount = 0
            let subjectInfo = []

            resetInterface()
            console.log('Status: 🔨 Creating Subjects...')
            console.log(`Process: 📥 Get info of ${subjectAmount} Subjects...`);
            console.log('\n');

            async function createSubjectInfo(arguments) {
                console.log(`Subject - ${subjectCount + 1}`);

                let classAmount = null

                async function getClassAmount(params) {
                    classAmount = readlineSync.question('Class Amount: ')
                    return classAmount
                }

                subjectInfo.push({
                    title: readlineSync.question('Subject title: ') || 'ABC',
                    teacher: readlineSync.question('Subject teacher: '),
                    classAmount: await getClassAmount(),
                    classTitle: await classInfo(classAmount),
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

        if (option === '0') {
            // await setSettings(
            //     arguments.data.homePage,
            //     arguments.info.homePage_Title
            // )
        }

        resetInterface()
        setStatus('🏁 Finished')
        setTimeout(() => console.clear(), 1200)
    })();
})


