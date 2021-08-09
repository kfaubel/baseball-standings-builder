/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { LoggerInterface } from "./Logger";
import { KacheInterface } from "./Kache";
import { ImageWriterInterface } from "./SimpleImageWriter";
import { BaseballStandingsImage, ImageResult } from "./BaseballStandingsImage";
import { Conferences, Divisions } from "./BaseballStandingsData";

export class BaseballStandingsBuilder {
    private logger: LoggerInterface;
    private cache: KacheInterface;
    private writer: ImageWriterInterface;

    constructor(logger: LoggerInterface, cache: KacheInterface, writer: ImageWriterInterface) {
        this.logger = logger;
        this.cache = cache; 
        this.writer = writer;
    }
    
    public async CreateImages(conf: string, div: string): Promise<boolean>{
        try {
            const baseballStandingsImage = new BaseballStandingsImage(this.logger, this.cache);
    
            const result: ImageResult = await baseballStandingsImage.getImage(conf as keyof Conferences, div as keyof Divisions);            

            if (result !== null && result.imageData !== null ) {
                const fileName: string = `standings-${conf}-${div}.jpg`;
                this.logger.info(`BaseballStandingsBuilder: Writing: ${fileName}`);
                this.writer.saveFile(fileName, result.imageData.data);
                return true;
            } else {
               this. logger.error(`BaseballStandingsBuilder: no image ${conf}-${div}`);
                return false;
            }
        } catch (e) {
            this.logger.error(`BaseballStandingsBuilder: exception: ${e}`);
            return false;
        }
    }
}





