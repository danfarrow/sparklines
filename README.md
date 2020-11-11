# Sparklines

Tiddlywiki macro to display multiple SVG sparklines from data in markdown table format

## Usage:

```
<<sparkline4 "
    |!Date|!Val|!Percentage|...|
    |12/02|50|44%|...|
    |11/02|42|32%|...|
    |10/02|48|07%|...|"
    false false true>>
```

In addition to the sparklines the macro will display stats on the longest
continuous daily chain (useful for daily goals), and will echo the
original markdown table data.

The default display of these elements can be over-ridden with the three
boolean parameters:
`<hideChainInfo> <hideDataEcho> <hideSparkline>`

![a preview of the generated sparklines](sparklines.png)

## Installation

* Create a [tiddlywiki](https://tiddlywiki.com/)
* Create a new tiddler
* Set the __Type__ to `application/javascript`
* Add a field named `module-type` with the value `macro`
* Paste the javascript source into the body of the tiddler
* Save and close the tiddler
* Save and reload the tiddlywiki
* Use the macro to track your daily goals!