import axios from "axios";
import { LoggerInterface } from "./Logger";
import { KacheInterface } from "./Kache";
import { AxiosRequestConfig } from "axios";
import { AxiosResponse } from "axios";

// eslint-disable-next-line @typescript-eslint/no-var-requires
// const testJSONData = require("../sample-standings.json");

// returned JSON
// {
//    "standings_date": "2021-07-11T23:50:00Z",
//    "standing": [
//    {
//      "rank": 1,
//    ...

interface RawJson {
    standing: Array<RawStanding>;
}

interface RawStanding {
    rank: string;
    won: number;
    lost: number;
    first_name: string;
    games_back: number;
    conference: string;
    division: string;
    last_ten: string;
}

export interface Conferences {
    "AL": Divisions;
    "NL": Divisions;
}

export interface Divisions {
    "E": Array<TeamData>;
    "C": Array<TeamData>;
    "W": Array<TeamData>;
}

export interface TeamData {
    city?: string;
    won?: number;
    lost?: number;
    games_back?: number;
    games_half?: number;
    last_ten?: string;
}

export class BaseballStandingsData {
    private logger: LoggerInterface;
    private cache: KacheInterface;

    constructor(logger: LoggerInterface, cache: KacheInterface) {
        this.logger = logger;
        this.cache = cache;
    }    
    
    public async getStandingsData(userAgent: string): Promise<Conferences | null> {
        try {
            let conferences: Conferences | null = this.cache.get("standings") as Conferences;
            if (conferences !== null) {
                return conferences;
            }

            //const conferences: 
            conferences = {
                "AL": {
                    "E": [],
                    "C": [],
                    "W": [],
                },
                "NL": {
                    "E": [],
                    "C": [],
                    "W": [],
                }
            };

            const test = false; // Don't hit real server while developing

            const url = "https://erikberg.com/mlb/standings.json";
            
            let rawJson: RawJson = {standing: []};

            if (test) {
                this.logger.log("BaseballStandingsData: Using test data");  
                rawJson = require("../sample-standings.json");
            } else {
                const options: AxiosRequestConfig = {
                    responseType: "json",
                    headers: {                        
                        "Content-Encoding": "gzip"
                    },
                    timeout: 20000
                };

                const startTime = new Date();
                await axios.get(url, options)
                    .then((res: AxiosResponse) => {
                        if (typeof process.env.TRACK_GET_TIMES !== "undefined" ) {
                            this.logger.info(`BaseballStandingsData: GET TIME: ${new Date().getTime() - startTime.getTime()}ms`);
                        }
                        rawJson = res.data;
                    })
                    .catch((error) => {
                        this.logger.warn(`BaseballStandingsData: No articles: ${error})`);
                        return null;
                    });
            }

            // Loop through all the teams adding them to the division within each conference
            // Teams are given in the order of standing within each conference/division (1 2 3 4 5  or  1 2 2 3 4)
            
            for (let index = 0; index < 30; index++) {
                const aTeam: RawStanding  = rawJson.standing[index];
                
                const teamData: TeamData = {
                    city:       aTeam.first_name,
                    won:        aTeam.won,
                    lost:       aTeam.lost,
                    games_back: Math.floor(aTeam.games_back),
                    games_half: (Math.floor(aTeam.games_back) === aTeam.games_back) ? 0 : 1,
                    last_ten:   aTeam.last_ten,
                };
                // Typescript will have to take our word for it that aTeam conference/division are keys.  Exception otherwise
                conferences[aTeam.conference as keyof Conferences][aTeam.division as keyof Divisions].push(teamData);          
            }

            // This expires at 4AM tomorrow
            const tomorrow: Date = new Date();
            tomorrow.setDate(tomorrow.getDate() +1);
            tomorrow.setHours(4, 0, 0, 0);
            this.cache.set("standings", conferences, tomorrow.getTime());
            
            // this.logger.verbose(`BaseballStandingsData: Full: ${JSON.stringify(standingsJSON, null, 4)}`);

            return conferences;
        } catch(error) {
            this.logger.error(`BaseballStandingsData: Error parsing data: ${error}`);
            return null;
        }
    }
}