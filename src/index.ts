import puppeteer from 'puppeteer'
import { promises as fs } from 'fs'

const URL = process.argv[2]
const DIR = process.argv[3] || 'contracts/'

const COPY_TO_CLIPBOARD_BUTTONS = '.js-clipboard.mr-1'
const FILENAME_SPANS =
  'div.d-flex.justify-content-between > span.text-secondary'

export async function download(url: string, dir: string): Promise<void> {
  console.log(`download '${url}' and save to '${dir}'`)
  const browser = await puppeteer.launch()
  const context = browser.defaultBrowserContext()
  context.overridePermissions(url, ['clipboard-read'])
  const page = await browser.newPage()
  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/61.0.3163.100 Safari/537.36'
  )
  await page.setViewport({ width: 960, height: 768 })
  page.goto(url)
  await Promise.race([
    page.waitForNavigation({ waitUntil: 'domcontentloaded' }),
    page.waitForNavigation({ waitUntil: 'load' }),
  ])
  await page.waitForSelector(COPY_TO_CLIPBOARD_BUTTONS)
  const copyToClipboardButtons = await page.$$(COPY_TO_CLIPBOARD_BUTTONS)

  await page.waitForSelector(FILENAME_SPANS)
  const filenames = (
    await page.evaluate(
      (selector) =>
        Array.from(
          document.querySelectorAll(selector),
          (element) => element.innerHTML
        ),
      FILENAME_SPANS
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
      await button.evaluate((b) => (b as any).click())
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
