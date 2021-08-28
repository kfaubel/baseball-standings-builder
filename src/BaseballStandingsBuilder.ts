/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { LoggerInterface } from "./Logger";
import { KacheInterface } from "./Kache";
import { ImageWriterInterface } from "./SimpleImageWriter";
import { BaseballStandingsImage, ImageResult } from "./BaseballStandingsImage";
import { BaseballStandingsData, Conferences, Divisions } from "./BaseballStandingsData";

export class BaseballStandingsBuilder {
    private logger: LoggerInterface;
    private cache: KacheInterface;
    private writer: ImageWriterInterface;
    private standingsData: BaseballStandingsData;

    constructor(logger: LoggerInterface, cache: KacheInterface, writer: ImageWriterInterface) {
        this.logger = logger;
        this.cache = cache; 
        this.writer = writer;
        this.standingsData = new BaseballStandingsData(this.logger, this.cache);
    }
    
    public async CreateImages(): Promise<boolean>{
        try {
            // We try this once.
            const standingsArray: Conferences | null = await this.standingsData.getStandingsData();
            if (standingsArray === null) {
                this. logger.error("BaseballStandingsBuilder: no data.");
                return false;
            }

            const baseballStandingsImage = new BaseballStandingsImage(this.logger, this.cache);
    
            for (const conf of ["AL", "NL"]) {
                for (const div of ["E", "C", "W"]) {
                    const result: ImageResult = await baseballStandingsImage.getImage(standingsArray as Conferences, conf as keyof Conferences, div as keyof Divisions);            

                    if (result !== null && result.imageData !== null ) {
                        const fileName = `standings-${conf}-${div}.jpg`;
                        this.logger.info(`BaseballStandingsBuilder: Writing: ${fileName}`);
                        this.writer.saveFile(fileName, result.imageData.data);
                    } else {
                        this. logger.error(`BaseballStandingsBuilder: no image ${conf}-${div}`);
                    }
                }
            }
        } catch (e) {
            this.logger.error(`BaseballStandingsBuilder: exception: ${e}`);
            return false;
        }
        return true;
    }
}





