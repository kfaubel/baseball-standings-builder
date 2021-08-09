/* eslint-disable @typescript-eslint/no-unused-vars */
import jpeg from "jpeg-js";
import path from "path";
import * as pure from "pureimage";
import { LoggerInterface } from "./Logger";
import { KacheInterface } from "./Kache";
import { BaseballStandingsData, Conferences, Divisions, TeamData } from "./BaseballStandingsData";

export interface ImageResult {
    expires: string;
    imageType: string;
    imageData: jpeg.BufferRet | null;
}

export class BaseballStandingsImage {
    private standingsData: BaseballStandingsData;
    private cache: KacheInterface;
    private logger: LoggerInterface;

    constructor(logger: LoggerInterface, cache: KacheInterface) {
        this.logger = logger;
        this.cache = cache;
        this.standingsData = new BaseballStandingsData(this.logger, this.cache);
    }

    public async getImage(conf: keyof Conferences, div: keyof Divisions): Promise<ImageResult> {
        let title: string;
        if      (div === "E") { title = `${conf} EAST`;}
        else if (div === "C") { title = `${conf} CENTRAL`;}
        else if (div === "W") { title = `${conf} WEST`;}
        else {
            this.logger.error(`BaseballStandingsImage: bad division: ${div}`); 
            return {expires: "", imageType: "", imageData: null};
        }

        const standingsArray: Conferences | null = await this.standingsData.getStandingsData();

        if (standingsArray === null) {
            this.logger.warn("BaseballStandingsImage: Failed to get data, no image available.\n");
            return {expires: "", imageType: "", imageData: null};
        }

        const imageHeight = 1080; 
        const imageWidth  = 1920; 

        const backgroundColor     = "rgb(105, 135,  135)";  // Fenway Green
        const boxBackgroundColor  = "rgb(95,  121,  120)";  // Fenway Green - Dark p.setColor(Color.rgb(0x5F, 0x79, 0x78));
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
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, imageWidth, imageHeight);

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
        ctx.moveTo(borderWidth-5,  borderWidth-5);
        ctx.lineTo(borderWidth-5,  imageHeight);   // Down the left side
        ctx.lineTo(imageWidth ,    imageHeight);   // Across the bottom
        ctx.lineTo(imageWidth ,    borderWidth);   // Up to the top right
        ctx.lineTo(0,              0);             // Back across the top to the left
        ctx.stroke();
        
        // Draw the column labels - gamesBack and gamesHalf are drawn to look like a single box with one label
        ctx.font = mediumFont;
        ctx.fillText("W",    wonOffsetX +       (wonBoxWidth                             - ctx.measureText("W").width)   / 2, labelOffsetTop);
        ctx.fillText("L",    lostOffsetX +      (lostBoxWidth                            - ctx.measureText("L").width)   / 2, labelOffsetTop);
        ctx.fillText("GB",   gamesBackOffsetX + ((gamesBackBoxWidth + gamesHalfBoxWidth) - ctx.measureText("GB").width)  / 2, labelOffsetTop);
        ctx.fillText("L10",  lastTenOffsetX +   (lastTenBoxWidth                         - ctx.measureText("L10").width) / 2, labelOffsetTop);

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
            const city      = `${standingsArray[conf][div][i].city}`;
            const won       = `${standingsArray[conf][div][i].won}`;
            const lost      = `${standingsArray[conf][div][i].lost}`;
            let   gamesBack = `${standingsArray[conf][div][i].games_back}`;
            let   gamesHalf = `${standingsArray[conf][div][i].games_half}`;
            const lastTen   = `${standingsArray[conf][div][i].last_ten}`;

            if (gamesBack === "0") gamesBack = "-";
            gamesHalf =  (gamesHalf === "1") ? "\u00BD" : "";  // we will show a '1/2' char or nothing

            const rowY       = rowOffsetY + (i * rowSpacing) + textOffsetInBoxY;        

            const cityX      = cityOffsetX +      cityTextOffsetX;
            const wonX       = wonOffsetX +       (wonBoxWidth -       ctx.measureText(won).width) / 2;
            const lostX      = lostOffsetX +      (lostBoxWidth -      ctx.measureText(lost).width) / 2;
            const gamesBackX = gamesBackOffsetX + (gamesBackBoxWidth - ctx.measureText(gamesBack).width) / 2;
            const gamesHalfX = gamesHalfOffsetX + (gamesHalfBoxWidth - ctx.measureText(gamesHalf).width) / 2;
            const lastTenX   = lastTenOffsetX +   (lastTenBoxWidth -   ctx.measureText(lastTen).width) / 2;
            
            ctx.fillText(city,      cityX,       rowY);
            ctx.fillText(won,       wonX,        rowY);
            ctx.fillText(lost,      lostX,       rowY);
            ctx.fillText(gamesBack, gamesBackX,  rowY);
            ctx.fillText(gamesHalf, gamesHalfX,  rowY);
            ctx.fillText(lastTen,   lastTenX,    rowY);
        }

        const expires = new Date();
        expires.setHours(expires.getHours() + 12);

        const jpegImg = jpeg.encode(img, 50);
        
        return {
            imageData: jpegImg,
            imageType: "jpg",
            expires: expires.toUTCString()
        };
    }
}
