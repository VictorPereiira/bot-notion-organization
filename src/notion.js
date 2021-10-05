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

async function getInfo() {
    const info = {}
    info.homePage_Title = readlineSync.question('How would you like to call your home page? \nR: ')

    console.log('\n')
    info.plataform_Link = readlineSync.question('What is the access link for your study platform? \nR: ')

    return info
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
        await setSettings(
            arguments.data.homePage,
            arguments.info.homePage_Title
        )

        resetInterface()
        setStatus('🏁 Finished')
    })();
})


