/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { LoggerInterface } from "./Logger";
import { KacheInterface } from "./Kache";
import { ImageWriterInterface } from "./SimpleImageWriter";
import { BaseballStandingsImage, ImageResult } from "./BaseballStandingsImage";
import { BaseballStandingsData, LeagueData, Divisions } from "./BaseballStandingsData";

export class BaseballStandingsBuilder {
    private logger: LoggerInterface;
    private cache: KacheInterface;
    private writer: ImageWriterInterface;
    private standingsData: BaseballStandingsData;
    private userAgent: string;

    constructor(logger: LoggerInterface, cache: KacheInterface, writer: ImageWriterInterface, userAgent: string) {
        this.logger = logger;
        this.cache = cache; 
        this.writer = writer;
        this.standingsData = new BaseballStandingsData(this.logger, this.cache);
        this.userAgent = userAgent;
    }
    
    public async CreateImages(): Promise<boolean>{
        try {
            const now = new Date();
            const standingsArray: LeagueData | null = await this.standingsData.getStandingsData(now.getFullYear());
            if (standingsArray === null) {
                this. logger.error("BaseballStandingsBuilder: no data.");
                return false;
            }

            const baseballStandingsImage = new BaseballStandingsImage(this.logger, this.cache);
    
            for (const conf of ["AL", "NL"]) {
                for (const div of ["E", "C", "W"]) {
                    const result: ImageResult = await baseballStandingsImage.getImage(standingsArray as LeagueData, conf as keyof LeagueData, div as keyof Divisions);            

                    if (result !== null && result.imageData !== null ) {
                        const fileName = `standings-${conf}-${div}.jpg`;
                        this.logger.info(`BaseballStandingsBuilder: Writing: ${fileName}`);
                        this.writer.saveFile(fileName, result.imageData.data);
                    } else {
                        this. logger.error(`BaseballStandingsBuilder: no image ${conf}-${div}`);
                    }
                }
            }

            // One more for now
            const result: ImageResult = await baseballStandingsImage.getImage(standingsArray as LeagueData, "AL", "E", "Fenway");            

            if (result !== null && result.imageData !== null ) {
                const fileName = "standings-Fenway.jpg";
                this.logger.info(`BaseballStandingsBuilder: Writing: ${fileName}`);
                this.writer.saveFile(fileName, result.imageData.data);
            } else {
                this. logger.error("BaseballStandingsBuilder: no image for Fenway");
            }

        } catch (e) {
            if (e instanceof Error) {
                this.logger.error(`BaseballStandingsBuilder: ${e.stack}`);
            } else {
                this.logger.error(`${e}`);
            }
            return false;
        }
        return true;
    }
}





