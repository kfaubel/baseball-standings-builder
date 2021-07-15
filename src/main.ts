import fs from 'fs';
import { BaseballStandingsImage } from './BaseballStandingImage';
import { Logger } from "./Logger";

// Create a new express application instance
async function run() {
    const logger: Logger = new Logger("standings-builder"); 
   
    const baseballStandingsImage = new BaseballStandingsImage(logger);
    
    const result = await baseballStandingsImage.getImageStream("AL", "EAST");
    
    // We now get result.jpegImg
    logger.info(`Main: Writing: image.jpg`);

    if (result !== null && result.jpegImg !== null ) {
        fs.writeFileSync('image.jpg', result.jpegImg.data);
    } else {
        logger.error("main: no jpegImg returned from weatherImage.getImageStream");
        process.exit(1);
    }
    
    logger.info("main: Done"); 
}

run();