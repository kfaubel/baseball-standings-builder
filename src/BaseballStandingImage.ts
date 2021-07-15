import stream from 'stream';
import jpeg from 'jpeg-js';

const pure = require('pureimage');

import { BaseballStandingsData, StandingJSON, Conference, Division, TeamData } from './BaseballStandingData';

const fontDir = __dirname + "/../fonts";

export class BaseballStandingsImage {
    private standingsData: any;

    private logger;

    constructor(logger: any) {
        this.logger = logger;
    }

    public setLogger(logger: any) {
        this.logger = logger;
    }

    public async getImageStream(conf: string, div: string) {
        const title: string = `${conf} ${div}`;
        
        this.standingsData = new BaseballStandingsData(this.logger);

        const standingsArray: StandingJSON = await  this.standingsData.getStandingData();

        if (this.standingsData === undefined) {
            this.logger.warn("BaseballStandingsImage: Failed to get data, no image available.\n")
            return null;
        }

        const imageHeight: number = 1080; // 800;
        const imageWidth: number  = 1920; // 1280;

        const backgroundColor: string     = 'rgb(105, 135,  135)';  // Fenway Green
        const boxBackgroundColor: string  = 'rgb(95,  121,  120)';  // Fenway Green - Dark p.setColor(Color.rgb(0x5F, 0x79, 0x78));
        const titleColor: string          = 'rgb(255, 255,  255)'; 
        const borderColor: string         = 'rgb(255, 255,  255)';
        
        const largeFont: string  = "140px 'OpenSans-Bold'";   // Title
        const mediumFont: string = "100px 'OpenSans-Bold'";   // Other text
        const smallFont: string  = "24px 'OpenSans-Bold'";   

        const fntBold     = pure.registerFont(fontDir + '/OpenSans-Bold.ttf','OpenSans-Bold');
        const fntRegular  = pure.registerFont(fontDir + '/OpenSans-Regular.ttf','OpenSans-Regular');
        const fntRegular2 = pure.registerFont(fontDir + '/alata-regular.ttf','alata-regular');

        fntBold.loadSync();
        fntRegular.loadSync();
        fntRegular2.loadSync();

        const regularStroke: number     = 2;
        const heavyStroke: number       = 30;
        const veryHeavyStroke: number   = 22;
        const borderWidth: number       = 20;

        const titleOffset: number       = 140; // down from the top of the image
        const labelOffsetTop: number    = 260;    

        const boxHeight: number         = 130;  // fillRect draws below the start point
        const rowOffsetY: number        = 290;  // 280 is upper left, fillRect draws down, fillText will need add boxHeight to get lower left 
        const rowSpacing: number        = 155;

        const cityOffsetX: number       = 50;
        const wonOffsetX: number        = 950;
        const lostOffsetX: number       = 1160;
        const gamesBackOffsetX: number  = 1360;
        const gamesHalfOffsetX: number  = 1500; // This touches and extends the games back box
        const lastTenOffsetX: number    = 1650

        const textOffsetInBoxY: number  = (boxHeight - 32); // text orgin is lower right and we want it up a bit more to center vertically in box
        
        const cityBoxWidth: number      = 850;
        const wonBoxWidth: number       = 170;
        const lostBoxWidth: number      = 170;
        const gamesBackBoxWidth: number = 140;  // if a team is 2.5 games back, gamesBack will be "2"
        const gamesHalfBoxWidth: number = 120;  //                              gamesHalf will be a '1/2' char
        const lastTenBoxWidth: number   = 210;

        const cityTextOffsetX: number   = 20;   // Set the left spacing to 20 pixels, other fields are centered.

        const img = pure.make(imageWidth, imageHeight);
        const ctx = img.getContext('2d');

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

        // The data uses a single letter for the division so assign it here.
        let dv: string = "E";
        if (div === "CENTRAL") {
            dv = "C";
        } else if (div === "WEST") {
            dv = "W"
        }

        // Now fill in the text in each row for the conf and div specified
        ctx.fillStyle = titleColor;
        ctx.font = mediumFont;
        for (let i = 0; i < 5; i++) {
            const city      = `${standingsArray[conf][dv][i].city}`;
            const won       = `${standingsArray[conf][dv][i].won}`;
            const lost      = `${standingsArray[conf][dv][i].lost}`;
            let   gamesBack = `${standingsArray[conf][dv][i].games_back}`;
            let   gamesHalf = `${standingsArray[conf][dv][i].games_half}`;
            const lastTen   = `${standingsArray[conf][dv][i].last_ten}`;

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

        const jpegImg = await jpeg.encode(img, 50);

        const jpegStream = new stream.Readable({
            read() {
                this.push(jpegImg.data);
                this.push(null);
            }
        })
        
        return {
            jpegImg: jpegImg,
            stream:  jpegStream,
            expires: expires.toUTCString()
        }
    }
}
