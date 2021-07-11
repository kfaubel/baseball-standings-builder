package org.faubel.daydreamone;

import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.Rect;
import android.graphics.Typeface;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;

import static java.lang.System.currentTimeMillis;

// http://gd2.mlb.com/components/game/mlb/year_2017/month_04/day_21/grid.json

// http://gd2.mlb.com/components/game/mlb/

// https://erikberg.com/mlb/standings.json

/*
with a bitmap of 1280x800 we have a 8 - 12 pixel white boarder
background green: 698787
background numbers: 5f7978
We have 5 rows that are 80 pixels high, there is a 26px buffer below each box
   40 spacer (from edge)
   65 AL East
   72 spacer
   65 headers
   25 spacer
   105 Row 1 - 80 + 25
   105 Row 2 - 80 + 25
   105 Row 3 - 80 + 25
   105 Row 4 - 80 + 25
   105 Row 5 - 80 + 25
    20 spacer
Each row has:
   40 spacer
  400 day city
   20 spacer
  110 date
   20 spacer
  110 opponent
   20 spacer
  110 GB
   20 spacer
  110 GB halves
   20 spacer
  180 streak
   40 spacer
5 rows
 */


public class DisplayBaseballStandings implements DisplayItem, DataSource {
    private static final String TAG = "DisplayBBStandings";
    private final Object lock = new Object();
    private String friendlyName;
    //private long lastUpdateDate;
    private String standingsURL;
    private long expirationPeriodMins;
    private long displayDurationSecs;
    private final Context context;
    private ArrayList<DisplayBaseballStandings.Standing> standingsList;
    private final UpdateScheduler updateScheduler;

    private class Standing {
        // We use this as a struct so we will just make the members public and not use getters and setters
        final String team;  // City
        final String wins;
        final String losses;
        final String gamesBack;
        final String gamesBackFraction;
        final String streak;
        final String lastTen;

        Standing(String team, String wins, String losses, String gamesBack, String gamesBackFraction, String streak, String lastTen) {
            this.team              = team;
            this.wins              = wins;
            this.losses            = losses;
            this.gamesBack         = gamesBack;
            this.gamesBackFraction = gamesBackFraction;
            this.streak            = streak;
            this.lastTen           = lastTen;
        }
    }

    DisplayBaseballStandings(Context context, JSONObject configData, ContentManager ContentManager) {
        this.context = context;
        try {
            this.friendlyName         = configData.getString("friendlyName");
            this.expirationPeriodMins = configData.getLong("expirationPeriodMins");
            this.displayDurationSecs  = configData.getLong("displayDurationSecs");

            this.standingsURL         = configData.getString("resource");
        } catch (JSONException e) {
            Klog.e(TAG, "constructor" + e.toString());
            e.printStackTrace();
        }

        Klog.v(TAG, "Creating: " + friendlyName);

        standingsList = new ArrayList<>();
        //standingsList.add(new Game("BOSTON", "100", "62", "-", "", "W5", "9-1"));

        updateScheduler = new UpdateScheduler(0, 5, false);

        ContentManager.addModel(this);
    }

    @Override
    public String getTAG() {
        return TAG;
    }

    @Override
    public String getFriendlyName() {
        return friendlyName;
    }

    @Override
    public long getDisplayDurationSecs() {
        return displayDurationSecs;
    }

    @Override
    public int size() {
       return 1;
    }

    @Override
    public Bitmap getBitmap(int index) {
        Bitmap imageBitmap = Bitmap.createBitmap(1280, 800, Bitmap.Config.RGB_565);
        Canvas canvas = new Canvas(imageBitmap);
        Paint p = new Paint();
        Rect bounds = new Rect();
        canvas.drawRGB(0x69, 0x87, 0x87);  // Fenway Green
        p.setTypeface(Typeface.create("sans-serif-black", Typeface.NORMAL));
        p.setColor(Color.WHITE);

        p.setStrokeWidth(40);
        canvas.drawLine(0, 0, 1280, 0, p);
        canvas.drawLine(0, 0, 0, 800, p);
        canvas.drawLine(1280, 0, 1280, 800, p);
        canvas.drawLine(0, 800, 1280, 800, p);

        String divisionStr = "AL EAST";
        p.setTextSize(110);
        p.getTextBounds(divisionStr, 0, divisionStr.length(), bounds);
        canvas.drawText(divisionStr, 640 - bounds.width()/2, 125, p);

        p.setTextSize(90);
        canvas.drawText("W",    630, 242, p);
        canvas.drawText("L",    840, 242, p);
        canvas.drawText("GB",   1030, 242, p);
        //canvas.drawText("L10", 1020, 242, p);


        for (int row = 0; row < 5; row++) {
            int left;
            int top;
            int right;
            int bottom;

            p.setColor(Color.rgb(0x5F, 0x79, 0x78));

            // Draw the day city box (400x80)
            left = 80;
            top = 267 + (row * 105);
            right = left + 450;
            bottom = top + 80;
            Rect cityRect = new Rect(left, top, right, bottom);
            canvas.drawRect(cityRect, p);

            // Draw the Wins box(110x80)
            left = 590;
            top = 267 + (row * 105);
            right = left + 150;
            bottom = top + 80;
            cityRect = new Rect(left, top, right, bottom);
            canvas.drawRect(cityRect, p);

            // Draw the losses boxes (110x80)
            left = 780;
            top = 267 + (row * 105);
            right = left + 150;
            bottom = top + 80;
            cityRect = new Rect(left, top, right, bottom);
            canvas.drawRect(cityRect, p);

            // Draw the GB boxes (110x80)
            left = 970;
            top = 267 + (row * 105);
            right = left + 240;
            bottom = top + 80;
            cityRect = new Rect(left, top, right, bottom);
            canvas.drawRect(cityRect, p);

//            // Draw the GB fraction boxes (110x80)
//            left = 1030;
//            top = 267 + (row * 105);
//            right = left + 100;
//            bottom = top + 80;
//            cityRect = new Rect(left, top, right, bottom);
//            canvas.drawRect(cityRect, p);

//            // Draw the Streak boxes (250x80)
//            left = 1000;
//            top = 267 + (row * 105);
//            right = left + 230;
//            bottom = top + 80;
//            cityRect = new Rect(left, top, right, bottom);
//            canvas.drawRect(cityRect, p);

            if (!standingsList.isEmpty()) {
                Standing standing = standingsList.get(row);

                p.setColor(Color.WHITE);
                p.setTextSize(70);
                if (standing.team.equalsIgnoreCase("Boston")) {
                    p.setColor(Color.rgb(255, 255, 100));
                }
                canvas.drawText(standing.team, 100, 330 + (row * 105), p);

                p.setColor(Color.WHITE);

                p.getTextBounds(standing.wins, 0, standing.wins.length(), bounds);
                canvas.drawText(standing.wins, 665 - bounds.width() / 2, 330 + (row * 105), p);

                p.getTextBounds(standing.losses, 0, standing.losses.length(), bounds);
                canvas.drawText(standing.losses, 855 - bounds.width() / 2, 330 + (row * 105), p);

                p.getTextBounds(standing.gamesBack, 0, standing.gamesBack.length(), bounds);
                canvas.drawText(standing.gamesBack, 1045 - bounds.width() / 2, 330 + (row * 105), p);

                p.getTextBounds(standing.gamesBackFraction, 0, standing.gamesBackFraction.length(), bounds);
                canvas.drawText(standing.gamesBackFraction, 1130 - bounds.width() / 2, 330 + (row * 105), p);

                //canvas.drawText(standing.lastTen, 1020, 330 + (row * 105), p);
            } else {
                return null;
            }
        }

        return imageBitmap;
    }

    @Override
    public void update() {
        if (!updateScheduler.shouldUpdateNow()) {
            return;
        }

        JSONObject standingsJSON;

        Klog.i(TAG, "Updating: " + friendlyName);

        ArrayList<DisplayBaseballStandings.Standing> tempStandingsList = new ArrayList<>();
        standingsJSON = Utils.loadJSONFromURL(standingsURL);

        if (standingsJSON == null) {
            // We will try again in a minute
            Klog.e(TAG, "Unable to get standings from source");
            updateScheduler.updateFailed();
            return;
        }
        
        //{
        //    "rank": 1,
        //        "won": 94,
        //        "lost": 67,
        //        "streak": "W3",
        //        "first_name": "Cleveland",
        //        "games_back": 0,
        //        "last_ten": "6-4",
        //        "conference": "AL",
        //        "division": "C",
        //
        //},
        try {
            JSONArray standings = standingsJSON.getJSONArray("standing");

            for (int i = 0; i < standings.length(); i++) {
                JSONObject standingObj = standings.getJSONObject(i);
                if (standingObj.getString("conference").equals("AL") && standingObj.getString("division").equals("E")) {

                    String city    = standingObj.getString("first_name").toUpperCase();
                    String wins    = standingObj.getString("won");
                    String losses  = standingObj.getString("lost");
                    String streak  = standingObj.getString("streak");
                    String lastTen = standingObj.getString("last_ten");

                    // games back is either 0, n.0 or n.5
                    String rawGamesBack = standingObj.getString("games_back");
                    String gamesBack;
                    String gamesBackFraction;

                    if (rawGamesBack.equals("0.0")) {
                        gamesBack = "-";
                        gamesBackFraction = "";
                    } else if (rawGamesBack.equals(("0.5"))) {
                        gamesBack = "";
                        gamesBackFraction = "\u00BD"; // 1/2 character
                    } else if (rawGamesBack.contains(".5")) {
                        gamesBack = rawGamesBack.replace(".5", "");
                        gamesBackFraction = "\u00BD"; // 1/2 character
                    } else {
                        gamesBack = rawGamesBack.replace(".0", "");
                        gamesBackFraction = "";
                    }


                    Standing standing = new  Standing(city, wins, losses, gamesBack, gamesBackFraction, streak, lastTen);
                    Klog.v(TAG, "Game: " + city + " " + wins + "-" + losses + " GB " + gamesBack + ":" + gamesBackFraction + " " + streak + " " + lastTen);

                    tempStandingsList.add(standing);
                }
            }

        } catch (JSONException e) {
            e.printStackTrace();
        }

        // Block the UI thread from using trendList while we change it.
        synchronized(lock) {
            if (tempStandingsList.size() != 0) {
                standingsList = tempStandingsList;
            }
        }
        updateScheduler.updateSuccessful();
    }
}
