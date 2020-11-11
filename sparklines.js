/*\
type: application/javascript
module-type: macro
\*/

/**
 * Tiddlywiki macro to display multiple SVG sparklines from data in markdown table format
 *
 * @author danfarrow
 * @version 4.0
 *
 * Usage:
 * <<sparkline4 "
 *     |!Date|!Val|!Percentage|...|
 *     |12/02|50|44%|...|
 *     |11/02|42|32%|...|
 *     |10/02|48|07%|...|"
 *     false false true>>
 *
 * In addition to the sparklines the macro will display stats on the longest
 * continuous daily chain (useful for daily goals), and will echo the
 * markdown table. Display of these elements can be over-ridden with the three
 * boolean parameters:
 * <hideChainInfo> <hideDataEcho> <hideSparkline>
 *
 * @todo Add text columns to hover text
 * @todo Date field should accept dates with or without years
 *     In dates without years the date is implied by
 *     the chronologically previous entry
 * @todo Checkbox could autopopulate if today's date has been logged
 * @todo Scale horizontal coordinates using date field
 *
 */

(function() {
  /*jslint node: true, browser: true */
  /*global $tw: false */
  "use strict";

  exports.name = "sparkline4";
  exports.params = [{name: "input"},{name: "hideChains"},{name: "hideInput"},{name: "hideSparklines"}];

  /**
   * Run the macro
   *
   * @param str input The input
   * @param bool timeFormat Is the input in `hh:mm:ss`` format
   */
  exports.run = function(input, hideChains = "false", hideInput = "false", hideSparklines = "false") {
    hideChains = hideChains === "true";
    hideInput = hideInput === "true";
    hideSparklines = hideSparklines === "true";

   /**
   * Calculate difference between two dates
   * in milliseconds & convert back to days
   */
    Date.daysDifference = function( date1, date2 = new Date() ) {
      return Math.round( (date1.getTime() - date2.getTime()) / (1000*60*60*24) );
    }

    Date.toDaysAndWeeks = function( days ){
      let output;

      // Convert to weeks
      if (days > 7){
          let weeks = Math.floor( days/7 );
          days = days%7;

          // Omit days to avoid outputs like "2 weeks, 0 days"
          if (days === 0){
              output = `${weeks} week${weeks == 1 ? "" : "s"}`;
          } else {
              output = `${weeks} week${weeks == 1 ? "" : "s"}, ${days} day${days === 1 ? "" : "s"}`;
          }

       } else {
            output = `${days} day${days == 1 ? "" : "s"}`;
       }

       return output;
    }

    /**
     * Check if supplied year is this year
     */
    Date.sameYear = function(date){
      return date.getFullYear() === new Date().getFullYear();
    }

    /**
     * Format date to short string
     */
    Date.shortString = function(date){
      let sameYear = Date.sameYear(date),
          year = sameYear ? "" : "/" + `${date.getFullYear()}`.substr(-2);

      return `${ date.getDate() }/${ date.getMonth() + 1 }${ year }`;
    }

    // @todo Move helper functions?

    /**
     * Convert time string in format "mm:ss" into seconds
     */
    let timeToSeconds = function(t) {
      let split = t.split(":"),
          m = parseInt(split[0], 10);
      return m * 60 + parseInt(split[1], 10);
    };

    /**
     * Convert time in seconds to string format "mm:ss"
     */
    let secondsToTime = function(s) {
      let secs = s % 60,
        mins = Math.floor(s / 60);

      if (secs < 10) { secs = `0 ${secs}`; }

      return `${mins}:${secs}`;
    };

    /**
     * Parse cell value
     */
    let cleanValue = function(v, timeFormat = false){
      if (timeFormat) { return timeToSeconds(v); }
      return parseInt(v, 10);
    }

    /**
     * Parse date format "10/12[/19]" into date object
     */
    let parseDate = function(dateString){
      let dateStringSplit = dateString.split("/"),
        day = dateStringSplit[0],
        month = dateStringSplit[1],
        year = dateStringSplit[2],
        date = new Date(),
        d,m,y;

      if( undefined === year){
        y = date.getFullYear();
      } else if ( 2 === year.length){
        year = "20" + year;
        y = parseInt(year,10);
      } else {
        y = parseInt(year,10);
      }

      d = parseInt(day,10);
      m = parseInt(month,10)-1;

      date.setDate(d);
      date.setMonth(m);
      date.setYear(y);

      return date;
    }

    /**
     * Return the min & max dates from the supplied array of ordered dates
     */
    let getDateRange = function(datesArray){
      let minDate = datesArray[0];
      let maxDate = datesArray[ datesArray.length - 1 ];
    }

    /**
     * Return the longest run of consecutive days
     * from the supplied array of date chains
    */
    let getLongestFromChains = function(chainsArray){
      let longest = [];

      for( let i = 0; i < chainsArray.length; i++ ){
        if( chainsArray[i].length > longest.length ){
          longest = chainsArray[i];
        }
      }

      return longest;
    }

    /**
     * Get current chain from array of dates
     */
    // let getCurrentChain = function(datesArray){
    //   // @todo
    //   let chains = getChains(datesArray);
    // }

   /**
     * Split the supplied array of dates into chains
     * Assume dates are ordered with oldest first
     */
    let getChains = function(datesArray){

      let chains = [],
          currentChain = [],
          currentDate,
          previousDate;

      for( let i = 0; i < datesArray.length; i++ ){
        currentDate = datesArray[i];

        if ( previousDate ){
          // Get distance between current date & previous date
          let diff = Math.abs(Date.daysDifference( currentDate, previousDate ));

          if ( diff > 1 ){
            // Finish current chain
            chains.push(currentChain);
            currentChain = [];
          }
        }
        currentChain.push( currentDate );
        previousDate = currentDate;
      }

      chains.push(currentChain);
      return chains;
    }


    // Split input into lines, then split lines on
    // `|` symbol to get an array of values
    const lines = input.trim().split("\n");

    // Line has format `| 31/12 | 47 | 55 |...|`
    let linesArray = lines.map(line => {
      // Split line & remove empty first and last entries
      let lineSplit = line.split("|");
      lineSplit.pop();
      lineSplit.shift();
      return lineSplit;
    });


    // Reverse data array so sparkline runs from left to right
    linesArray.reverse();

    // Date is in first column, values are in remaining columns
    let plots = [],
        dates = [],
        colours = ["#85144b","#0074D9","#3D9970"];

    // Get max & min values for each array of values
    for( let i = 0; i < linesArray.length; i++ ){
      for( let y = 0; y < linesArray[i].length; y++ ){

        // The first value is always the date column, the rest are to be plotted
        let value = linesArray[i][y];

        // Check for header
        if( y === 0 && value.indexOf("!") !== 0){
          dates.push( parseDate(value) );
          continue;
        }

        // Make plot object if not already made
        if ( undefined === plots[y] ){
          plots[y] = {
            data:[],
            header:"",
            max:0,
            min:9999999,
            svg:"",
            total:0,
            columnType:""
          }

          // Check data for `%` or `:` and set column type accordingly
          if (linesArray[i][y].indexOf("%") > -1){
            plots[y].columnType = "%";
          } else if( linesArray[i][y].indexOf(":") > -1){
            plots[y].columnType = "time";
          }
        }

        // Check for title row
        if( value.indexOf("!") === 0 ){
          plots[y].header = value.substring(1);
          continue;
        }

        value = cleanValue(linesArray[i][y], "time" === plots[y].columnType);
        if ( isNaN(value) ){
          plots[y].columnType = "text";
        }
        plots[y].data.push(value);

        // Track maximumm, minimum & total
        plots[y].total += value;
        plots[y].max = Math.max(plots[y].max, value);
        plots[y].min = Math.min(plots[y].min, value);

      }// y loop
    }// i loop

    let plotsKeyText = [],
        svg = "";

    // Loop through plots (ignoring first column which is dates (for now))
    if ( plots.length < 1 ){ hideSparklines = true; }
    if ( !hideSparklines ){
      for( let j = 1; j < plots.length; j++ ){

        let plot = plots[j],
            header = plot.header,
            columnType = plot.columnType,
            unit = ("%" === columnType) ? "%":"",
            timeFormat = ("time" === columnType),
            parts = plot.data,
            mn = plot.min,
            mx = plot.max,
            tot = plot.total;

        let x1 = 0,
            y1 = 0,
            x2 = 0,
            y2 = 100 - (100 * (parts[0] - mn)) / (mx - mn),
            avg = Math.round(tot / parts.length),
            title;

        // Don't plot text columns
        if ( "text" === columnType ){ continue; }

        // Update title text
        if (timeFormat) {
          plotsKeyText.push(`<span class="p${j}"><strong>${header}</strong> ${secondsToTime(mn)}&ndash;${secondsToTime(mx)} Avg ${secondsToTime(avg)}</span>`);
        } else {
          plotsKeyText.push(`<span class="p${j}"><strong>${header}</strong> ${mn}${plot.columnType}&ndash;${mx}${unit} Avg ${avg}${unit}</span>`);
        }

        for (let i = 0; i < parts.length; i++) {
          y1 = y2;
          x1 = x2;
          x2 = 100 * (i / (parts.length - 1)); // Data points are evenly spaced (for now!)
          y2 = 100 - (100 * (parts[i] - mn)) / (mx - mn);

          // Trim precision
          x1 = (Math.round(x1 * 1000)/1000);
          y1 = (Math.round(y1 * 1000)/1000);
          x2 = (Math.round(x2 * 1000)/1000);
          y2 = (Math.round(y2 * 1000)/1000);

          // Title for tooltip
          if (timeFormat) {
            title = `${ secondsToTime(parts[i] )} [${ Date.shortString(dates[i]) }]`;
          } else {
            title = `${parts[i]}${unit} [${ Date.shortString(dates[i]) }]`;
          }

          // Create SVG line, circle (with transparent stroke to increase hitbox) & title node
          plot.svg +=
            `<line class="p${j}" x1="${x1}%" x2="${x2}%" y1="${y1}%" y2="${y2}%"></line>
            <circle class="p${j} clear" cx="${x2}%" cy="${y2}%" r="12"><title>${title}</title></circle>
            <circle class="p${j}" cx="${x2}%" cy="${y2}%" r="3"><title>${title}</title></circle>`;
        }//for (let i = 0; i < parts.length; i++)

        svg += plot.svg;

      }
    }// if( !hideSparklines )

    let chainsInfo = "";

    // Calculate chain info
    if( !hideChains ){
      let chains = getChains(dates),
          longestChainLength = getLongestFromChains(chains).length,
          mostRecentChain = chains.pop(),
          mostRecentChainLength = mostRecentChain.length,
          daysSinceEndOfMostRecentChain = Date.daysDifference( new Date(), mostRecentChain.pop() ),
          currentlyInChain = daysSinceEndOfMostRecentChain <= 1,
          isNewRecord = mostRecentChainLength >= longestChainLength && currentlyInChain,

          currentChainText = currentlyInChain ?
            `Current chain <strong>${Date.toDaysAndWeeks(mostRecentChainLength)}</strong>`
            : "<strong>Don't break the chain!</strong>",

          longestChainText = isNewRecord ?
            "<strong>NEW RECORD!</strong>"
            : `Previous best <strong>${ Date.toDaysAndWeeks(longestChainLength) }</strong>`;

          chainsInfo = `<p><$checkbox tag="GTDone"> Done
                          | ${currentChainText}
                          | ${longestChainText}
                        </$checkbox></p>`;

      // Some tiddlers use this macro with no sparklines...
      //if( !svg ){ return chainsInfo + `\n\n${input}`; }
    }

    // @todo Don't rely on <<countup>> macro
    let subtitle = `<small style="display:block; text-align:center;">${plotsKeyText.join(" | ")}</small>`,
        output = `<div class="sparkline4">`;

    if( !hideChains ){
      output += chainsInfo;
    }

    if( !hideSparklines ){
        output += `\n\n<style>
          .sparkline4 svg {
            border-bottom:1px solid #ddd;
            border-top:1px solid #ddd;
            max-width: 100%;
            overflow: visible;
            padding:2px 0;
          }
          .sparkline4 circle { stroke-width:0; fill-opacity:0.6; }
          .sparkline4 circle.clear { fill-opacity:0; }
          .sparkline4 line { stroke-width:1px; stroke-opacity:0.8; }
          .sparkline4 .p1 { color:${colours[0]}; fill:${colours[0]}; stroke:${colours[0]}; }
          .sparkline4 .p2 { color:${colours[1]}; fill:${colours[1]}; stroke:${colours[1]}; }
          .sparkline4 .p3 { color:${colours[2]}; fill:${colours[2]}; stroke:${colours[2]}; }
        </style>
        <svg
          version="1.1" baseProfile="full" xmlns="http://www.w3.org/2000/svg"
          xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:ev="http://www.w3.org/2001/xml-events"
          width="100%" height="80px"
        >${svg}</svg>
        `;
      }

      output += `${subtitle}</div>`;

      if( !hideInput ) {
        output += `\n\n${input}`;
      }

      return output;

  };
})();