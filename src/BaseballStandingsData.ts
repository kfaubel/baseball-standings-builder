/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from "axios";
import { LoggerInterface } from "./Logger";
import { KacheInterface } from "./Kache";
import { AxiosRequestConfig } from "axios";
import { AxiosResponse } from "axios";
import { TeamInfo } from "./TeamInfo";

// eslint-disable-next-line @typescript-eslint/no-var-requires
// const testJSONData = require("../sample-standings.json");

// Docs https://statsapi.mlb.com/docs/endpoints/standings#tag/standings
// AL (league 103): https://statsapi.mlb.com/api/v1/standings?leagueId=103&season=2018
// NL (league 104): https://statsapi.mlb.com/api/v1/standings?leagueId=104&season=2021
// Standings call returns standings for a league (3 divisions of 5 teams each as of March 2022)
// {
//     "records": [
//         {
//             "standingsType": "regularSeason",
//             "league": { "id": 103, ...},   // 103: AL            
//             "division": { "id": 201, ...}, // 201: ALE, 202: ALC, 203: ALW
//             "teamRecords": [
//                 {
//                     "team": { "id": 111, "name": "Boston Red Sox", ... },
//                     "divisionRank": "1",
//                     "gamesBack": "-",
//                     "divisionGamesBack": "-",
//                     "clinchIndicator": "z",
//                     "clinched": true,
//                     "wins": 108,
//                     "losses": 54,
//                 }, ... 5 records total
//             ]
//         }, ... 3 records total for the 3 divisions
//     ]
// }

type FeedRecords = {
    league: {
        id: number;                        // 103 - AL, 104 - NL
        link: string;                      // "/api/v1/league/103"
    };
    division: {
        id: number;                        // 201 - ALE
        link: string;                      // "/api/v1/division/201"
    };
    teamRecords: {
        team: {
            id: string;                        // 111
            name: string;                      // Boston Red Sox
        };
        streak: {
            streakCode: string;
        };
        dividionRank: string;              // "1"
        gamesBack: string;                 // '-', '1', 2.5', ...
        clinchIndicator: string;           // z
        clinched?: boolean;                // true
        eliminationNumber: string;         // "-", "E"
        wildCardEliminationNumber: string; // "-", "E"
        magicNumber?: string;              // "-", 
        wins: number;                      // 108
        losses: number;                    // 54
        records: {
            splitRecords: {
                wins: number;
                losses: number;
                type: string;              // "home", "away", left", "leftHome", "leftAway", ... "lastTen" , "extraInnings", "oneRun", ...
                pct: string;               // ".600"
            }[]
        }
    }[]
}[];

interface SplitRecord {
    wins: number;
    losses: number;
    type: string;              // "home", "away", left", "leftHome", "leftAway", ... "lastTen" , "extraInnings", "oneRun", ...
    pct: string;               // ".600"
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
    location: string;
    wins: number;
    losses: number;
    gamesBack: number;
    streak: string;
    lastTen: string;
    clinchIndicator: string;           // z
    clinched?: boolean;                // true
    eliminationNumber: string;         // "-", "E"
    wildCardEliminationNumber: string; // "-", "E"
    magicNumber: string;                // "-", 
}

export class BaseballStandingsData {
    private logger: LoggerInterface;
    private cache: KacheInterface;

    constructor(logger: LoggerInterface, cache: KacheInterface) {
        this.logger = logger;
        this.cache = cache;
    }    
    
    public async getStandingsData(year: number): Promise<Conferences | null> {
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

            const options: AxiosRequestConfig = {
                responseType: "json",
                headers: {                        
                    "Content-Encoding": "gzip"
                },
                timeout: 20000
            };
            
            for (const conf of ["103", "104"]) {
                const url = `https://statsapi.mlb.com/api/v1/standings?leagueId=${conf}&season=${year + ""}`;
                this.logger.verbose(`BaseballStandingsData: URL: ${url}`);

                let feedRecords: FeedRecords = [];

                const startTime = new Date();
                await axios.get(url, options)
                    .then((res: AxiosResponse) => {
                        if (typeof process.env.TRACK_GET_TIMES !== "undefined" ) {
                            this.logger.info(`BaseballStandingsData: GET TIME: ${new Date().getTime() - startTime.getTime()}ms`);
                        }

                        if (res.data?.records) {
                            feedRecords = res.data?.records;
                        } 
                    })
                    .catch((error) => {
                        this.logger.warn(`BaseballStandingsData: No data: ${error})`);
                    });
                

                if (feedRecords.length === 0) {
                    return null;
                }
                // Loop through all the teams adding them to the division within each conference
                // Teams are given in the order of standing within each conference/division (1 2 3 4 5  or  1 2 2 3 4)
                
                const teamInfo = new TeamInfo();

                for (const feedRecord of feedRecords) { 
                    const conference = teamInfo.lookupConferenceById(feedRecord.league.id)?.abbreviation;
                    const division   = teamInfo.lookupDivisionById(feedRecord.division.id)?.abbreviation;

                    for (const teamRecord of feedRecord.teamRecords) {
                        this.logger.verbose(`BaseballStandingsData: adding team: ${teamRecord.team.id}`);
                        
                        const lastTenRecord: SplitRecord | undefined = teamRecord.records.splitRecords.find(
                            (splitRecord: SplitRecord) => {
                                splitRecord.type === "lastTen";
                            }
                        );

                        const lastTen = lastTenRecord !== undefined ? `${lastTenRecord.wins}-${lastTenRecord.losses}` : "";

                        // Pick out the values we need.  Some are just a copy, some are computed
                        const teamData: TeamData = {
                            wins:                      teamRecord.wins,
                            losses:                    teamRecord.losses,
                            clinchIndicator:           teamRecord.clinchIndicator,
                            clinched:                  teamRecord.clinched,
                            eliminationNumber:         teamRecord.eliminationNumber,
                            wildCardEliminationNumber: teamRecord.wildCardEliminationNumber,
                            magicNumber:               teamRecord.magicNumber ?? "",
                            
                            location: teamInfo.lookupTeamById(teamRecord.team.id)?.location ?? "???",
                            streak: teamRecord.streak?.streakCode ?? "",
                            gamesBack:  (teamRecord.gamesBack === "-") ? 0 : +teamRecord.gamesBack, // string to number
                            lastTen: lastTen,
                        };
                        conferences[conference as keyof Conferences][division as keyof Divisions].push(teamData);
                    }
                }   
            } 

            // This expires at 4AM tomorrow
            // const tomorrow: Date = new Date();
            // tomorrow.setDate(tomorrow.getDate() +1);
            // tomorrow.setHours(4, 0, 0, 0);
            // this.cache.set("standings", conferences, tomorrow.getTime());
            
            // this.logger.verbose(`BaseballStandingsData: Full: ${JSON.stringify(standingsJSON, null, 4)}`);

            return conferences;
        } catch(error: any) {
            this.logger.error(`BaseballStandingsData: Error parsing data: ${error}`);
            this.logger.error(error.stack);
            return null;
        }
    }
}