import { args, BaseCommand } from '@adonisjs/core/build/standalone'
import puppeteer from 'puppeteer'
import Event from "@ioc:Adonis/Core/Event";
import Tournament from 'App/DTO/Tournament'

export default class Fetch extends BaseCommand {
    public static commandName = 'fetch'
    public static description = 'Read FFE website and get all found tournaments'

    @args.string({
        description: 'The department or comite targetted',
        name: 'department'
    })
    public dpt: string

    public static settings = {
        loadApp: true,
    }

    public async run() {
        const options: puppeteer.PuppeteerLaunchOptions = {
            headless: true,
            ignoreDefaultArgs: ['--disable-extensions']
        };

        if (process.env.CHROME_EXEC_PATH) {
            options.executablePath = process.env.CHROME_EXEC_PATH;
        }

        const browser = await puppeteer.launch(options);
        const page = await browser.newPage();

        this.logger.info('Browser opened');

        await page.goto(`http://www.echecs.asso.fr/ListeTournois.aspx?Action=TOURNOICOMITE&ComiteRef=${this.dpt}`);
        await page.waitForSelector('.page-mid');

        this.logger.info('Page loaded');

        const lines: string[] = await page.evaluate(() => {
            const lines = Array.from(document.querySelectorAll('.page-mid > table > tbody tr'));
            return lines.map((td: any) => td.innerText);
        });

        let links: string[] = await page.evaluate(() => {
            const links = Array.from(document.querySelectorAll('.page-mid > table > tbody tr .lien_texte'));
            return links.map((a: any) => a.href);
        });

        let month: string;
        lines.forEach((line: string, index: number) => {
            const cells = line.split(/\t/);

            if (cells.length <= 2) {
                month = cells.join(' ');
                links.splice(index, 0, '');
                return;
            }

            const link = links[index];
            const tournamentDate = this.toDate(cells[4], month);
            const tournament: Tournament = {
                postcode: cells[0],
                city: cells[1],
                dpt: cells[2],
                label: cells[3],
                link: link,
                date: tournamentDate,
                federation: cells[5],
                opt1: cells[6],
                opt2: cells[7],
            };

            Event.emit('tournament:found', tournament);
        })
    }

    /**
     * Extract day of month from string
     *
     * @param dateString
     * @returns
     */
    private getDayNumber(dateString: string): number {
        const regex: RegExp = new RegExp(/(\d{1,2})/g);
        const dayNumber: any = dateString.match(regex);

        return dayNumber[0];
    }

    /**
     * Transform french date string into JS date
     *
     * @param dateString
     * @param month
     * @returns
     */
    private toDate(dateString: string, month: string): Date {

        const dayNumber = this.getDayNumber(dateString);
        const fullFrenchDateString = dayNumber + " " + month;

        return new Date(fullFrenchDateString);
    }
}
