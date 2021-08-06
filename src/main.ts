import fs from "fs";
import { BaseballStandingsImage, ImageResult } from "./BaseballStandingImage";
import { Logger } from "./Logger";
import { Cache } from "./Cache";

async function run() {
    const logger: Logger = new Logger("standings-builder", "verbose"); 
    const cache: Cache = new Cache(logger, "baseball-standings-cache.json");
   
    const baseballStandingsImage = new BaseballStandingsImage(logger, __dirname, cache);
    
    const result: ImageResult = await baseballStandingsImage.getImageStream("AL", "E");
    
    // We now get result.jpegImg
    logger.info("Main: Writing: image.jpg");

    if (result !== null && result.imageData !== null ) {
        fs.writeFileSync("image.jpg", result.imageData.data);
    } else {
        logger.error("main: no jpegImg returned from baseballStandingsImage.getImageStream");
        process.exit(1);
    }
    
    logger.info("main: Done"); 
}

run();