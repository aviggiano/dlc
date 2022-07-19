import puppeteer from 'puppeteer'
import { promises as fs } from 'fs'

const URL = process.argv[2]
const DIR = process.argv[3] || 'contracts/'

export async function download(url: string, dir: string): Promise<void> {
  console.log(`download '${url}' and save to '${dir}'`)
  const browser = await puppeteer.launch({ headless: false })
  const context = browser.defaultBrowserContext()
  context.overridePermissions(url, ['clipboard-read'])
  const page = await browser.newPage()
  await page.goto(url)
  const copyToClipboardButtons = await page.$$('.js-clipboard.mr-1')
  const filenames = (
    await page.evaluate(() =>
      Array.from(
        document.querySelectorAll(
          'div.d-flex.justify-content-between > span.text-secondary'
        ),
        (element) => element.innerHTML
      )
    )
  )
    .map((text) => text.match(/File.*: (.*)/)?.[1])
    .filter((match) => match) as string[]

  console.log(`Found ${filenames.length} files`)

  await fs.mkdir(dir, { recursive: true })

  let i = 0
  for (const button of copyToClipboardButtons) {
    const filename = filenames[i]
    i += 1
    if (filename) {
      await button.click()
      const code = await page.evaluate(() => navigator.clipboard.readText())

      console.log(`Saving file ${filename}`)
      await fs.writeFile(`${dir}${filename}`, code)
    }
  }

  console.log(`Closing session`)
  await page.close()
  await browser.close()
}

download(URL, DIR)
