# FTS flow api automated testing

This command line app is to automate the checking of results from the flow API endpoints to the classic API endpoints.

From the command line, just call the file directly with arguments.

Here are the available node scripts to run
 ```
node planCompare.js 2013

 ```

 Then with the values from this output

 ```
node reportCompare.js 851 954
 ```

Then to do a standard check of a set of flows
```
node flowCompare.js
```


 Note that there is an output file path for local environments to be configured in the config.js itself.