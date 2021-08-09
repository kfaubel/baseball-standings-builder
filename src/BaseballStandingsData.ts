import axios from "axios";
import { LoggerInterface } from "./Logger";
import { KacheInterface } from "./Kache";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const testJSONData = require(__dirname + "/../sample-standings.json");

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
    
    public async getStandingsData(): Promise<Conferences | null> {

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
            rawJson = testJSONData;
        } else {
            try {
                const response = await axios.get(url, {headers: {"Content-Encoding": "gzip"}});
                rawJson = response.data;
            } catch (e) {
                this.logger.error(`BaseballStandingsData: Error getting data: ${e}`);
                return null;
            }
        }

        // Loop through all the teams adding them to the division within each conference
        // Teams are given in the order of standing within each conference/division (1 2 3 4 5  or  1 2 2 3 4)
        try {
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
                conferences[aTeam.conference as keyof Conferences][aTeam.division as keyof Divisions].push(teamData);          }
        } catch (e) {        
            this.logger.error(`BaseballStandingsData: Error parsing data: ${e}`);
            return null;
        }

        // This expires at 4AM tomorrow
        const tomorrow: Date = new Date();
        tomorrow.setDate(tomorrow.getDate() +1);
        tomorrow.setHours(4, 0, 0, 0);
        this.cache.set("standings", conferences, tomorrow.getTime());
        
        // this.logger.verbose(`BaseballStandingsData: Full: ${JSON.stringify(standingsJSON, null, 4)}`);

        return conferences;
    }
}