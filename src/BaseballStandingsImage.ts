/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import jpeg from "jpeg-js";
import path from "path";
import * as pure from "pureimage";
import { LoggerInterface } from "./Logger";
import { KacheInterface } from "./Kache";
import { BaseballStandingsData, Conferences, Divisions, TeamData } from "./BaseballStandingsData";

export interface ImageResult {
    imageType: string;
    imageData: jpeg.BufferRet | null;
}

export class BaseballStandingsImage {
    //private standingsData: BaseballStandingsData;
    private cache: KacheInterface;
    private logger: LoggerInterface;

    constructor(logger: LoggerInterface, cache: KacheInterface) {
        this.logger = logger;
        this.cache = cache;
        //this.standingsData = new BaseballStandingsData(this.logger, this.cache);
    }

    /**
     * Optimized fill routine for pureimage
     * - See https://github.com/joshmarinacci/node-pureimage/tree/master/src
     * - To fill a 1920x1080 image on a core i5, this saves about 1.5 seconds
     * @param img it has 3 properties height, width and data
     * @param x X position of the rect
     * @param y Y position of the rect
     * @param w Width of rect
     * @param h Height of rect
     * @param rgb Fill color in "#112233" format
     */
    private myFillRect(img: any, x: number, y: number, w: number, h: number, rgb: string) {
        const colorValue = parseInt(rgb.substring(1), 16);

        // The shift operator forces js to perform the internal ToUint32 (see ecmascript spec 9.6)
        const r = (colorValue >>> 16) & 0xFF;
        const g = (colorValue >>> 8)  & 0xFF;  
        const b = (colorValue)        & 0xFF;
        const a = 0xFF;

        for(let i = y; i < y + h; i++) {                
            for(let j = x; j < x + w; j++) {   
                const index = (i * img.width + j) * 4;   
                
                img.data[index + 0] = r;
                img.data[index + 1] = g;     
                img.data[index + 2] = b;     
                img.data[index + 3] = a; 
            }
        }
    }

    public async getImage(standingsArray: Conferences, conf: keyof Conferences, div: keyof Divisions): Promise<ImageResult> {
        let title: string;
        if      (div === "E") { title = `${conf} EAST`;}
        else if (div === "C") { title = `${conf} CENTRAL`;}
        else if (div === "W") { title = `${conf} WEST`;}
        else {
            this.logger.error(`BaseballStandingsImage: bad division: ${div}`); 
            return {imageType: "", imageData: null};
        }

        //const standingsArray: Conferences | null = await this.standingsData.getStandingsData();

        if (standingsArray === null) {
            this.logger.warn("BaseballStandingsImage: Failed to get data, no image available.\n");
            return {imageType: "", imageData: null};
        }

        const imageHeight = 1080; 
        const imageWidth  = 1920; 
        
        const backgroundColor     = "#4f7359"; //"#698785";              // Fenway Green
        const boxBackgroundColor  = "#466850"; //"rgb(95,  121,  120)";  // Fenway Green - Dark p.setColor(Color.rgb(0x5F, 0x79, 0x78));
        const titleColor          = "rgb(255, 255,  255)"; 
        const borderColor         = "rgb(255, 255,  255)";
        
        const largeFont  = "140px 'OpenSans-Bold'";   // Title
        const mediumFont = "100px 'OpenSans-Bold'";   // Other text
        const smallFont  = "24px 'OpenSans-Bold'";   

        // When used as an npm package, fonts need to be installed in the top level of the main project
        const fntBold     = pure.registerFont(path.join(".", "fonts", "OpenSans-Bold.ttf"),"OpenSans-Bold");
        const fntRegular  = pure.registerFont(path.join(".", "fonts", "OpenSans-Regular.ttf"),"OpenSans-Regular");
        const fntRegular2 = pure.registerFont(path.join(".", "fonts", "alata-regular.ttf"),"alata-regular");
        
        fntBold.loadSync();
        fntRegular.loadSync();
        fntRegular2.loadSync();

        const regularStroke     = 2;
        const heavyStroke       = 30;
        const veryHeavyStroke   = 22;
        const borderWidth       = 20;

        const titleOffset       = 140; // down from the top of the image
        const labelOffsetTop    = 260;    

        const boxHeight         = 130;  // fillRect draws below the start point
        const rowOffsetY        = 290;  // 280 is upper left, fillRect draws down, fillText will need add boxHeight to get lower left 
        const rowSpacing        = 155;

        const cityOffsetX       = 50;
        const wonOffsetX        = 950;
        const lostOffsetX       = 1160;
        const gamesBackOffsetX  = 1360;
        const gamesHalfOffsetX  = 1500; // This touches and extends the games back box
        const lastTenOffsetX    = 1650;

        const textOffsetInBoxY: number  = (boxHeight - 32); // text orgin is lower right and we want it up a bit more to center vertically in box
        
        const cityBoxWidth      = 850;
        const wonBoxWidth       = 170;
        const lostBoxWidth      = 170;
        const gamesBackBoxWidth = 140;  // if a team is 2.5 games back, gamesBack will be "2"
        const gamesHalfBoxWidth = 120;  //                              gamesHalf will be a '1/2' char
        const lastTenBoxWidth   = 210;

        const cityTextOffsetX   = 20;   // Set the left spacing to 20 pixels, other fields are centered.

        const img = pure.make(imageWidth, imageHeight);
        const ctx = img.getContext("2d");

        // Fill the bitmap
        this.myFillRect(img, 0, 0, imageWidth, imageHeight, backgroundColor);

        // Draw the title
        ctx.fillStyle = titleColor;
        ctx.font = largeFont;
        const textWidth: number = ctx.measureText(title).width;
        ctx.fillText(title, (imageWidth - textWidth) / 2, titleOffset);

        ctx.strokeStyle = borderColor;
        ctx.lineWidth = heavyStroke;

        // strokeRect is not working with lineWidth righ now.
        // ctx.strokeRect(borderWidth,borderWidth,imageWidth - 2 * borderWidth,imageHeight - 2 * borderWidth);
        
        // Some of this is a little finicky since little gaps appear with drawing individual lines
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(imageWidth, 0);
        ctx.lineTo(imageWidth, imageHeight);
        ctx.lineTo(0, imageHeight);
        ctx.lineTo(0, heavyStroke/2); 
        ctx.stroke();
        // ctx.beginPath();
        // ctx.moveTo(borderWidth-5,  borderWidth-5);
        // ctx.lineTo(borderWidth-5,  imageHeight);   // Down the left side
        // ctx.lineTo(imageWidth ,    imageHeight);   // Across the bottom
        // ctx.lineTo(imageWidth ,    borderWidth);   // Up to the top right
        // ctx.lineTo(0,              0);             // Back across the top to the left
        // ctx.stroke();
        
        // Draw the column labels - gamesBack and gamesHalf are drawn to look like a single box with one label
        ctx.font = mediumFont;
        ctx.fillText("W",    wonOffsetX +       (wonBoxWidth                             - ctx.measureText("W").width)   / 2, labelOffsetTop);
        ctx.fillText("L",    lostOffsetX +      (lostBoxWidth                            - ctx.measureText("L").width)   / 2, labelOffsetTop);
        ctx.fillText("GB",   gamesBackOffsetX + ((gamesBackBoxWidth + gamesHalfBoxWidth) - ctx.measureText("GB").width)  / 2, labelOffsetTop);
        ctx.fillText("L10",  lastTenOffsetX +    (lastTenBoxWidth                        - ctx.measureText("L10").width) / 2, labelOffsetTop);

        // Draw the boxes for the city, wins, losses and games back
        ctx.fillStyle = boxBackgroundColor;
        for (let row = 0; row < 5; row++) {
            ctx.fillRect(cityOffsetX,      rowOffsetY + row * rowSpacing,  cityBoxWidth,      boxHeight);
            ctx.fillRect(wonOffsetX,       rowOffsetY + row * rowSpacing,  wonBoxWidth,       boxHeight);
            ctx.fillRect(lostOffsetX,      rowOffsetY + row * rowSpacing,  lostBoxWidth,      boxHeight);
            ctx.fillRect(gamesBackOffsetX, rowOffsetY + row * rowSpacing,  gamesBackBoxWidth, boxHeight);
            ctx.fillRect(gamesHalfOffsetX, rowOffsetY + row * rowSpacing,  gamesHalfBoxWidth, boxHeight);
            ctx.fillRect(lastTenOffsetX,   rowOffsetY + row * rowSpacing,  lastTenBoxWidth,   boxHeight);
        }

        // Now fill in the text in each row for the conf and div specified
        ctx.fillStyle = titleColor;
        ctx.font = mediumFont;
        for (let i = 0; i < 5; i++) {
            const teamData = standingsArray[conf][div][i];
            const city      = teamData.location;
            const won       = teamData.wins + "";
            const lost      = teamData.losses + "";
            const lastTen    = teamData.lastTen; 
            const gamesBack: string   = teamData.gamesBack === 0 ? "-" : Math.floor(teamData.gamesBack) + "";
            const gamesHalf =  (Math.floor(teamData.gamesBack) === teamData.gamesBack) ? "" : "\u00BD";

            const rowY       = rowOffsetY + (i * rowSpacing) + textOffsetInBoxY;        

            const cityX      = cityOffsetX +      cityTextOffsetX;
            const wonX       = wonOffsetX +       (wonBoxWidth -       ctx.measureText(won).width) / 2;
            const lostX      = lostOffsetX +      (lostBoxWidth -      ctx.measureText(lost).width) / 2;
            const gamesBackX = gamesBackOffsetX + (gamesBackBoxWidth - ctx.measureText(gamesBack).width) / 2;
            const gamesHalfX = gamesHalfOffsetX + (gamesHalfBoxWidth - ctx.measureText(gamesHalf).width) / 2;
            const lastTenX    = lastTenOffsetX +    (lastTenBoxWidth -    ctx.measureText(lastTen).width) / 2;
            
            ctx.fillText(city,      cityX,       rowY);
            ctx.fillText(won,       wonX,        rowY);
            ctx.fillText(lost,      lostX,       rowY);
            ctx.fillText(gamesBack, gamesBackX,  rowY);
            ctx.fillText(gamesHalf, gamesHalfX,  rowY);
            ctx.fillText(lastTen,    lastTenX,     rowY);
        }

        const jpegImg = jpeg.encode(img, 50);
        
        return {
            imageData: jpegImg,
            imageType: "jpg"
        };
    }
}
