import dotenv from "dotenv";
import { BaseballStandingsBuilder } from "./BaseballStandingsBuilder";
import { Logger } from "./Logger";
import { Kache } from "./Kache";
import { SimpleImageWriter } from "./SimpleImageWriter";

async function run() {
    const logger: Logger = new Logger("standings-builder", "info"); 

    dotenv.config();  // Load var from .env into the environment
    const USER_AGENT: string | undefined = process.env.USER_AGENT;
    if (USER_AGENT === undefined) {
        logger.error("BaseballStandingsBuilder: USER_AGENT missing, using \"BaseballStandingsBuilder\".  May get 403");
        return;
    }

    const cache: Kache = new Kache(logger, "baseball-standings-cache.json");
    const simpleImageWriter: SimpleImageWriter = new SimpleImageWriter(logger, "images");
    const baseballStandingsBuilder: BaseballStandingsBuilder = new BaseballStandingsBuilder(logger, cache, simpleImageWriter, USER_AGENT);

    return await baseballStandingsBuilder.CreateImages();
}

run();