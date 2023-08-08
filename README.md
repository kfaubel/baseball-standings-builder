# baseball-standings-builder

This module is used to build images in jpeg format with the standings for all 6 MLB conferences (AL-East, NL East, ...).

test.ts shows how to use the module

The normal use of this module is to build an npm module that can be used as part of a bigger progress.

index.d.ts describes the interface for the module

The Logger, Kache and ImageWriterInterface interfaces are dependency injected into the module.  Simple versions are provided and used by the test wrapper.

To use the test wrapper to build a screen, run the following command.  
```
$ npm start

or

$ node app.js
```

Once instanciated, the CreateImages() method can be called to create all 6 screens.