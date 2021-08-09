import fs from "fs";
import { BaseballStandingsBuilder } from "./BaseballStandingsBuilder";
import { Logger } from "./Logger";
import { Kache } from "./Kache";
import { SimpleImageWriter } from "./SimpleImageWriter";

async function run() {
    const logger: Logger = new Logger("standings-builder", "verbose"); 
    const cache: Kache = new Kache(logger, "baseball-standings-cache.json");
    const simpleImageWriter: SimpleImageWriter = new SimpleImageWriter(logger, "images");
    const baseballStandingsBuilder: BaseballStandingsBuilder = new BaseballStandingsBuilder(logger, cache, simpleImageWriter);

    let results = true; // Any false returned will set result to false
    results = results && await baseballStandingsBuilder.CreateImages("AL", "E");
    results = results && await baseballStandingsBuilder.CreateImages("AL", "C");
    results = results && await baseballStandingsBuilder.CreateImages("AL", "W");
    results = results && await baseballStandingsBuilder.CreateImages("NL", "E");
    results = results && await baseballStandingsBuilder.CreateImages("NL", "C");
    results = results && await baseballStandingsBuilder.CreateImages("NL", "W");

    return results ? 0 : 1;
}

run();