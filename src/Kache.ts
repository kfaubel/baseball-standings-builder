/* eslint-disable @typescript-eslint/no-unused-vars */
import fs = require("fs");
import path from "path";
import { LoggerInterface } from "./Logger";

interface KacheItem {
    expiration: number;
    comment: string;
    item: unknown;
}

export interface KacheStorage {
    [key: string]: KacheItem;
}

export interface KacheInterface {
    get(key: string): unknown;
    set(key: string, newItem: unknown, expirationTime: number): void;
}

export class Kache implements KacheInterface {
    private cacheStorage: KacheStorage; 
    private cacheName: string;
    private cachePath: string;

    private logger: LoggerInterface;
    traceLogging: boolean;

    constructor(logger: LoggerInterface, cacheName: string) {
        this.logger = logger;
        this.cacheName = cacheName;
        this.cachePath = path.resolve(__dirname, "..", this.cacheName);
        this.cacheStorage = {};

        this.traceLogging = (typeof process.env.VERBOSE_CACHE !== "undefined" );

        try {
            const cacheData: Buffer | null | undefined = fs.readFileSync(this.cachePath);
            if (cacheData !== undefined && cacheData !== null) {
                this.verboseLog("Initiallizing with stored data"); // ${JSON.stringify(this.cacheStorage, null, 4)}`);
  
                this.cacheStorage = JSON.parse(cacheData.toString());

                for (const [key, value] of Object.entries(this.cacheStorage)) {
                    const cacheItem = this.cacheStorage[key];
        
                    if (cacheItem.expiration < new Date().getTime()) {
                        this.verboseLog(`Load: '${key}' has expired, deleting`);
                        delete this.cacheStorage[key];
                    } else {
                        this.verboseLog(`Load: '${key}' still good.`);
                    }
                }
            } else {
                this.verboseLog("Initializing new cache");
            }
        } catch (e) {
            this.verboseLog("Error with previous stored data, initializing new cache");
        }
    }

    private verboseLog(msg: string) {
        if (this.traceLogging) {
            this.logger.verbose(`Cache[${this.cacheName}] ${msg}`);
        }
    }

    public get(key: string): unknown {
        if (this.cacheStorage[key] !== undefined) {
            const cacheItem: KacheItem = this.cacheStorage[key as keyof CacheStorage];

            const expiration: number = cacheItem.expiration;
            const item: unknown    = cacheItem.item;

            const now = new Date();
            if (expiration > now.getTime()) {
                // object is current
                this.verboseLog(`Get: Key: '${key}' - cache hit`);
                return item;
            } else {
                // object expired
                this.verboseLog(`Get: Key: '${key}' - cache expired`);
            }
        } else {
            this.verboseLog(`Get: Key: '${key}' - cache miss`);
        }

        return null;
    }

    public set(key: string, newItem: unknown, expirationTime: number): void {
        const comment: string = new Date(expirationTime).toString();
        this.verboseLog(`Set: Key: ${key}, exp: ${comment}`);

        const cacheItem = {expiration: expirationTime, comment: comment, item: newItem};
        this.cacheStorage[key as keyof CacheStorage] =  cacheItem;

        // Does this need to be synchronous?
        fs.writeFileSync(this.cachePath, JSON.stringify(this.cacheStorage, null, 4));
    }
}