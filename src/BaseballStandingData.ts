import axios from 'axios';

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

export interface StandingJSON {
    AL: Conference;
    NL: Conference;
}

export interface Conference {
    E: Division;
    C: Division;
    W: Division;
}

export interface Division {
    0: {};
    1: {};
    2: {};
    3: {};
    4: {};
}

export interface TeamData {
    city: string;
    won: number;
    lost: number;
    games_back: number;
    games_half: number;
    last_ten: string;
}

const standingsJSON: StandingJSON = {
    AL: {
        E: { 0: {}, 1: {}, 2: {}, 3: {}, 4: {}, },
        C: { 0: {}, 1: {}, 2: {}, 3: {}, 4: {}, },
        W: { 0: {}, 1: {}, 2: {}, 3: {}, 4: {}, },
    },
    NL: {
        E: { 0: {}, 1: {}, 2: {}, 3: {}, 4: {}, },
        C: { 0: {}, 1: {}, 2: {}, 3: {}, 4: {}, },
        W: { 0: {}, 1: {}, 2: {}, 3: {}, 4: {}, },
    }
}

export class BaseballStandingsData {
    private logger;

    constructor(logger: any) {
        this.logger = logger;
    }    

    public async getStandingData() {

        let test:boolean = true; // Don't hit real server while developing

        const url: string = `https://erikberg.com/mlb/standings.json`;
        
        let rawJson: RawJson = {standing: []};

        if (test) {
            this.logger.log(`BaseballStandingsData: Using test data`);  
            rawJson = testJSONData;
        } else {
            await axios.get(url)
                .then((response: any) => {
                    rawJson = response.data;
                })
                .catch((error: any) => {
                    this.logger.error("BaseballStandingsData: Error getting data: " + error);
                });
        }

        // Loop through all the stands looking for ones that match the conference and division
        // Results are in standings order.  The ranks may show 1, 2, 2, 4, 5 if two teams are tied.
        for (const conf in standingsJSON) {
            for (const div in standingsJSON[conf]) {
                let index: number = 0;
                for (let aTeam of rawJson.standing) {
                    if (aTeam.conference === conf && aTeam.division === div) {
                        const teamData: TeamData = {
                            city:       aTeam.first_name,
                            won:        aTeam.won,
                            lost:       aTeam.lost,
                            games_back: Math.floor(aTeam.games_back),
                            games_half: (Math.floor(aTeam.games_back) === aTeam.games_back) ? 0 : 1,
                            last_ten:   aTeam.last_ten,
                        }
            
                        standingsJSON[conf][div][index] = teamData;
                        index++;
                    }
                }
            }
        }

        // this.logger.verbose(`BaseballStandingsData: Full: ${JSON.stringify(standingsJSON, null, 4)}`);

        return standingsJSON;
    }
}