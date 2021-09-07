import dotenv from "dotenv";
import { BaseballStandingsBuilder } from "./BaseballStandingsBuilder";
import { Logger } from "./Logger";
import { Kache } from "./Kache";
import { SimpleImageWriter } from "./SimpleImageWriter";

async function run() {
    dotenv.config();  // Load var from .env into the environment
    const logger: Logger = new Logger("standings-builder", "verbose"); 
    const cache: Kache = new Kache(logger, "baseball-standings-cache.json");
    const simpleImageWriter: SimpleImageWriter = new SimpleImageWriter(logger, "images");
    const baseballStandingsBuilder: BaseballStandingsBuilder = new BaseballStandingsBuilder(logger, cache, simpleImageWriter);

    return await baseballStandingsBuilder.CreateImages();
}

run();