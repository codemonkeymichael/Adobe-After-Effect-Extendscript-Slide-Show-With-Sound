//Put this script in here
// If you want to make the script appear in the Window Menu and have the buttons show:
//C:\Program Files\Adobe\Adobe After Effects CC\Support Files\Scripts\ScriptUI Panels
//Then open AE. In the Window Menu at the bottom you will see this, click it and dock it.

 //In the varibles below there names for the folders where images and audio should go.
 //The image folders should be named <last>, <first> and the audio files the same way.



//Ver 03 added formula to calulate zoom based on size and duration of an image layer. 
//Ver 04 HD  Not really a new version just changed the H and W vars
//Ver 04  Add some error checking with windows alerts for TitleBG and imahe file folder and audio file name miss match
//ver 05  Update for AE 26.2 and VS Code

//This script includes all the functions that move keyframes and adds the buttons

//Note: You must have the TitleBg image in the comp for this script to work.

//To edit this file use VS Code and the Adobe extrntions


var autoStepPostion = 0;   
//Method, Layer
var autoStepKeyIndex = [
    ["Select", 3, 1],
    ["Dup", 3, 2 ],
    ["Move", 3, 2 ],
    ["Select", 4, 1],
    ["Dup", 4, 2],
    ["Move", 4, 2],
    ["Select", 5, 1],
    ["Dup", 5, 2],
    ["Move", 5, 2],
    ["Select", 8, 1],
    ["Dup", 8, 2],
    ["Move", 8, 2]
];

//This makes the short cut buttons 
var panel = (this instanceof Panel) ? this : new Window("palette", "vcsSlideShowScriptV05", undefined, {resizeable:true});
panel.text = "vcsSlideShowScriptV05";

var buttonGroup = panel.add("group");
buttonGroup.orientation = "column";
buttonGroup.alignChildren = ["fill","top"];

buttonGroup.stepOneBtn = buttonGroup.add("button", undefined, "Import Audio and Images");

buttonGroup.AutoStepBtn = buttonGroup.add("button", undefined, "Auto Step");
buttonGroup.instructionAutoStepLabel = buttonGroup.add("statictext", undefined, "Instruction: Click Import Audio and Images first. Then click Auto Step to run through the steps.");

buttonGroup.backToOne = buttonGroup.add("button", undefined, "Back to First Step " + autoStepPostion.toString());
buttonGroup.stepTwoBtn = buttonGroup.add("button", undefined, "Manualy Dup and Move First Keys");
buttonGroup.stepThreeBtn = buttonGroup.add("button", undefined, "Manualy Move Second Keys to End + u + k");

//buttonGroup.scaleSlider = buttonGroup.add("slider", undefined, 50, 0, 800);
//buttonGroup.scaleSlider.preferredSize = [200, 20];
//buttonGroup.scaleSliderLabel = buttonGroup.add("statictext", undefined, "Scale: 0%");
//buttonGroup.scaleSlider.onChanging = function() {
    //  var val = Math.round(this.value);
    // setStatus(val);
    // var comp = app.project.activeItem;
    // if (comp && comp instanceof CompItem) {
    //     // open comp in viewer
    //     comp.openInViewer();

    //     // get a layer by index or name
    //     var layer = comp.layer(3); // or comp.layer("Your Layer Name")
    //     if (layer) {
    //         // select the layer
    //         layer.selected = true;

    //         // reveal the layer in the timeline
    //         comp.openInViewer();
         
    //         layer.property("ADBE Transform Group").property("ADBE Scale").setValue([val, val]);
    //         //selectedLayers[3].property("ADBE Transform Group").property("ADBE Scale").setValue([val, val]);

    //     }
    // }
//}

var statusGroup = panel.add("group");
statusGroup.orientation = "row";
statusGroup.alignChildren = ["fill","top"];
statusGroup.statusText = statusGroup.add("edittext", undefined, "Ready", {multiline: true, scrolling: true, readonly: true});
statusGroup.statusText.alignment = ["fill","bottom"];
statusGroup.statusText.preferredSize = [400, 200];
statusGroup.statusText.minimumSize = [400, 200];

panel.status = statusGroup.statusText;

function setStatus(message) {
    if (panel.status) {
        if (panel.status.text && panel.status.text.length > 0) {
            panel.status.text += "\r\n" + message;
        } else {
            panel.status.text = message;
        }
        try {
            if (panel.status.selection) {
                panel.status.selection = [panel.status.text.length, panel.status.text.length];
            }
        } catch (e) {}
        panel.layout.layout(true);
    }
}

//Events
buttonGroup.stepOneBtn.onClick = function() {
    setStatus("Importing audio and images...");
    importContent();
}
buttonGroup.stepTwoBtn.onClick = function() {
    setStatus("Adding duplicate/move keyframes...");
    dupAndMove();
}
buttonGroup.stepThreeBtn.onClick = function() {
    setStatus("Moving second keys to end...");
    moveToEnd();
}

buttonGroup.backToOne.onClick = function() {
    setStatus("Back to Step 1");
    autoStepPostion = 0;
    var setp = autoStepKeyIndex[autoStepPostion];
    var stepName = setp[0].toString();
    buttonGroup.AutoStepBtn.text = "Auto Step: " + stepName + "  Move to Layer " + setp[1].toString() + " and select keyframe " + setp[2].toString();
}

buttonGroup.AutoStepBtn.onClick = function() {
    autoStep(); 
}

panel.layout.layout(true);

if (panel instanceof Window) {
    panel.show();    
    setStatus("VCS Slide Show App ready Ver5.06");
}

 function importContent() {
     	//setStatus(" -- importContent() \\n Please Select the slide show folder that contains the 'images' and 'audio' folders. The 'images' folder should have subfolders for each slide with the images inside. The 'audio' folder should have audio files named to match the slide subfolders.");
        var imageCount = 4;
        var compW = 1920;
        var compH = 1080
        var compPxAspect = 1.0;
        var compFrameRate = 60;
        var imageGrowPercent = 30;
        var shortestCompDuration = 15.0;
        var titleFontSizePx = 125; 
        var audioFileExt = ".wav"
        var imageFolderName = "images";
        var audioFolderName = "audio";
        var AEFolder;
        var AEComp;
        var AELayer;
        var AEinPoint = 0;
        var ImageItem;
        var AudioItem;
        var TitleItem;
        var compName;
        var imgDurationDefault = 5.5;
        var imgDuration = imgDurationDefault;
        var compDurationDefault = 20.0;
        var compDuration = compDurationDefault;       
        var TitleBGLayer;
        var imagesImported = 0; 
        var foldersProcessed = 0;   

        function debugValue(value) {
            if (value == null) {
                return String(value);
            }
            try {
                if (value instanceof Folder || value instanceof File) {
                    return value.fsName || value.name || String(value);
                }
                if (typeof value === "object") {
                    if (value.fsName) return value.fsName;
                    if (value.name) return value.name;
                    if (value instanceof Array) return "[Array " + value.length + "]";
                    return String(value);
                }
                return String(value);
            } catch (e) {
                return "<debug error: " + e.toString() + ">";
            }
        }

        var TitleBG = null;
        for (var i = 1; i <= app.project.numItems; i++) {
            var item = app.project.item(i);
            if (item.name === "TitleBG") {
                TitleBG = item;
                break;
            }
        }
        if (TitleBG == null) {
            setStatus("TitleBG not found in project.");
            Window.alert("TitleBG item not found in the project. Add an item named TitleBG before running this script.", "TitleBG Element");
            return;
        }

        setStatus("Waiting for folder selection...");
        var selectFolder = Folder.selectDialog("Import audio and image files from folder:");
        if (selectFolder == null) {
            setStatus("Folder selection cancelled.");   
            return;
        }
        setStatus("Reading image and audio folders...");
        var imageFolder = new Folder(selectFolder.fsName + "\\" + imageFolderName); 
        setStatus("Looking for image folder at: \n  " + imageFolder.fsName);
        var audioFolder = new Folder(selectFolder.fsName + "\\" + audioFolderName);
        setStatus("Looking for audio folder at: \n  " + audioFolder.fsName);

        if (!imageFolder.exists) {
            setStatus("Image folder not found.");
            Window.alert("Image folder not found:\n" + imageFolder.fsName, "Folder Error");
            return;
        }
        if (!audioFolder.exists) {
            setStatus("Audio folder not found.");
            Window.alert("Audio folder not found:\n" + audioFolder.fsName, "Folder Error");
            return;
        }

	    setStatus("Found folders. Creating master comp...");

        try {
            var AEMasterComp = app.project.items.addComp("Master Comp", compW, compH, compPxAspect, 999, compFrameRate);
        } catch (e) {
            setStatus("Error creating master comp: " + e.toString());
            Window.alert("Failed to create Master Comp: " + e.toString(), "Comp Creation Error");
            return;
        }
        var AEMasterCompRuntime = 0;
        
        if (!app.project) {
            setStatus("No project open, create a new project to import the files into.");
            app.newProject();
        }    
        
       
        function processFile(theFile) {
            //setStatus(" -- processFile(theFile) theFile=" + debugValue(theFile));
            try {
                if (!(theFile instanceof File)) {
                    throw new Error("processFile expected a File object, got " + typeof theFile);
                }
                setStatus("Create a variable containing ImportOptions.");
                var re = /(?:\.([^.]+))?$/;
                var match = re.exec(theFile.absoluteURI);
                var ext = match && match[1] ? match[1].toLowerCase() : "";
                setStatus("  File extension: " + ext);
                if (ext == "jpg" || ext == "jpeg" || ext == "png") {
                    setStatus("  -> Image file detected, importing into comp: " + AEComp.name);
                    var imgImportOptions = new ImportOptions(theFile);
                    importSafeWithError(imgImportOptions);
                } else {
                    setStatus("  -> Skipping non-image file: " + ext);
                }
            } catch (error) {
                var errMsg = "There was an error importing file " + (theFile && theFile.name ? theFile.name : String(theFile)) + " in comp: " + compName + " - " + error.toString();
                setStatus(errMsg);
                throw error;
            }
        }
        
        function importSafeWithError(imgImportOptions) {          
            //setStatus(" -- importSafeWithError(imgImportOptions) imgImportOptions=" + debugValue(imgImportOptions));
            var stage = "start";
            try {
                stage = "importFile";
                ImageItem = app.project.importFile(imgImportOptions);
                if (!(ImageItem instanceof FootageItem)) {
                    throw new Error("Imported item is not a footage item.");
                }
                ImageItem.parentFolder = AEFolder;
                imagesImported++;
                setStatus("Imported image " + imagesImported + ": " + ImageItem.name);

                stage = "addLayer";
                AELayer = AEComp.layers.add(ImageItem);
                AELayer.moveToEnd();
                AELayer.inPoint = AEinPoint;
                AELayer.outPoint = AEinPoint + imgDuration;
                
                stage = "mask";
                var mask = AELayer.Masks.addProperty("Mask");
                var maskShape = mask.property("maskShape");
                var shape = maskShape.value;
                shape.vertices = [
                    [10, 10],
                    [10, (AELayer.height - 10)],
                    [(AELayer.width - 10), (AELayer.height - 10)],
                    [(AELayer.width - 10), 10]
                ];
                shape.closed = true;
                maskShape.setValue(shape);                
                
                stage = "moveTitle";
                AELayer.inPoint = AEinPoint;
                TitleBGLayer.moveBefore(AELayer);
                TitleItem.moveBefore(TitleBGLayer);

                stage = "scale";
                var precentScale = ((compH / AELayer.height) * 100);
                var keyIn = (AEinPoint + 1);
                var scaleProp = AELayer.property("Scale");
                var currentScaleValue = scaleProp.value;
                var scaleValue = currentScaleValue && currentScaleValue.length === 3 ? [precentScale, precentScale, currentScaleValue[2]] : [precentScale, precentScale];
                scaleProp.setValueAtTime(keyIn, scaleValue);
                var positionProp = AELayer.property("Position");
                positionProp.setValueAtTime(keyIn, positionProp.value);
                
                stage = "fade";
                var opacityProp = AELayer.property("Opacity");
                opacityProp.setValueAtTime(AEinPoint, 0);
                opacityProp.setValueAtTime(AEinPoint + 0.5, 100);
                AEinPoint += (imgDuration - 0.5);
                opacityProp.setValueAtTime(AEinPoint, 100);
                opacityProp.setValueAtTime(AEinPoint + 0.5, 0);

            } catch (error) {
                 var errMsg = "Error in importSafeWithError [" + stage + "] for comp: " + compName + " - " + error.toString();
                 $.writeln(errMsg);
                 setStatus(errMsg);
                 Window.alert(errMsg, "Image Import Error");
                 throw error;
            }
        }

        function normalizeAudioName(name) {
            //setStatus(" -- normalizeAudioName(name) name=" + name);
            if (name == null) {
                return "";
            }
            name = name.toString();
            name = name.replace(/\.[^.]+$/, "");
            name = name.replace(/[._]+/g, " ");
            name = name.replace(/\s*,\s*/g, ", ");
            name = name.replace(/\s+/g, " ");
            if (typeof name.toLowerCase === "function") {
                name = name.toLowerCase();
            }
            if (typeof name.trim === "function") {
                name = name.trim();
            } else {
                name = name.replace(/^\s+|\s+$/g, "");
            }
            return name;
        }

        function findAudioFile(folderName) {
            //setStatus(" -- findAudioFile(folderName) " + folderName);
            if (!folderName) {
                return null;
            }
            var expectedAudioFile = new File(audioFolder.fsName + "\\" + folderName + audioFileExt);
            setStatus("Checking for expected audio file: " + expectedAudioFile.fsName);
            if (expectedAudioFile.exists) {
                return expectedAudioFile;
            }
            var normalizedFolderName = normalizeAudioName(folderName);
            if (!normalizedFolderName) {
                return null;
            }
            try {
                var files = audioFolder.getFiles();
                if (files == null) return null;
                if (!(files instanceof Array)) files = [files];
                for (var i = 0; i < files.length; i++) {
                    var file = files[i];
                    if (file instanceof File) {
                        var fname = file.name.toString().toLowerCase();
                        if (fname.match(/\.(wav|mp3)$/i)) {
                            var baseName = normalizeAudioName(file.name);
                            if (baseName === normalizedFolderName) {
                                return file;
                            }
                        }
                    }
                }
            } catch (e) {
                $.writeln("Error in findAudioFile: " + e.toString());
            }
            return null;
        }

        function processImageFolder(folderItem) {
            //setStatus(" -- processImageFolder(folderItem) folderItem=" + debugValue(folderItem));
            var stage = "start";
            try {
                AEinPoint = 0;
                compName = folderItem.name.replace("%20", " ");
                stage = "folderName";
                setStatus("Processing folder: " + compName);
                AEFolder = app.project.items.addFolder(compName);

                //get the audio
                stage = "findAudio";
                var audioFile = findAudioFile(AEFolder.name);
                if (audioFile == null) {
                    var expectedAudioPath = audioFolder.fsName + "\\" + AEFolder.name + audioFileExt;
                    var msg = "Audio file not found for " + compName + ". Expected file: " + expectedAudioPath + ". Import stopped.";
                    setStatus(msg);
                    Window.alert(msg, "Audio File Problem");
                    return false;
                }
                try {
                    stage = "importAudio";
                    var audImportOptions = new ImportOptions(audioFile);
                    AudioItem = app.project.importFile(audImportOptions);
                    AudioItem.parentFolder = AEFolder;
                } catch (error) {
                    var msg = "Unable to import audio file " + audioFile.fsName + " (" + audioFile.fsName + "). Import stopped.";
                    setStatus(msg);
                    Window.alert(msg, "Audio Import Problem");
                    return false;
                }

                stage = "duration";
                compDuration = compDurationDefault;
                imgDuration = imgDurationDefault;
                var audioStart = 0.0;
                if (AudioItem.duration < 10) {
                    compDuration = shortestCompDuration;
                    audioStart = 2.0;
                }

                if (AudioItem.duration > (compDurationDefault - 2.0)) {
                    compDuration = AudioItem.duration + 2.0;
                    audioStart = 1.0;
                }

                imgDuration = (compDuration / imageCount) + 0.5;

                stage = "createComp";
                AEComp = app.project.items.addComp(compName, compW, compH, compPxAspect, compDuration, compFrameRate);
                AEComp.parentFolder = AEFolder;

                stage = "addMasterComp";
                addCompToMaster(AEComp);

                stage = "addAudioLayer";
                var audLay = AEComp.layers.add(AudioItem);
                audLay.startTime = audioStart;
                audLay.locked = true;

                stage = "addText";
                var name = compName.split(", ");
                var td = new TextDocument(name.length > 1 ? name[1] + " " + name[0] : compName);

                if (TitleItem != undefined) TitleItem.locked = true;
                TitleItem = AEComp.layers.addText(td);

                var textProp = TitleItem.property("Source Text");
                var textDocument = textProp.value;
                textDocument.resetCharStyle();
                textDocument.fontSize = titleFontSizePx;
                textDocument.fillColor = [0.9, 0.9, 0.9];
                textDocument.strokeColor = [0.5, 0.5, 0.5];
                textDocument.strokeWidth = 2;
                textDocument.font = "Utsaah";
                textDocument.strokeOverFill = false;
                textDocument.applyStroke = true;
                textDocument.applyFill = true;
                textDocument.justification = ParagraphJustification.RIGHT_JUSTIFY;
                textDocument.tracking = 10;
                textProp.setValue(textDocument);
                TitleItem.property("Position").setValue([compW-60,compH-60]);

                stage = "titleFade";
                var keyIn = compDuration - imgDuration + 0.5;
                TitleItem.inPoint = keyIn;
                TitleItem.property("opacity").setValueAtTime(keyIn, 0);
                TitleItem.property("opacity").setValueAtTime(keyIn + 0.5, 100);

                stage = "addTitleBG";
                if (TitleBGLayer != undefined) TitleBGLayer.locked = true;
                TitleBGLayer = AEComp.layers.add(TitleBG);

                stage = "addBlack";
                var Blk = AEComp.layers.addSolid([0.0,0.0,0.0], "Black", compW, compH, 1.0);
                Blk.maximized = true;
                Blk.property("opacity").setValueAtTime(compDuration - 1.0, 0);
                Blk.property("opacity").setValueAtTime(compDuration, 100);

                stage = "getFiles";
                var imageFiles = folderItem.getFiles();
                if (imageFiles == null) {
                    imageFiles = [];
                } else if(!(imageFiles instanceof Array)) {
                    imageFiles = [imageFiles];
                }
                var imageCountForFolder = 0;
                setStatus("Folder: " + compName + " has " + imageFiles.length + " items");
                for (var j = 0; j < imageFiles.length; j++) {
                    if (imageFiles[j] instanceof File) {
                        setStatus("  Processing file: " + imageFiles[j].name);
                        stage = "processFile:" + imageFiles[j].name;
                        processFile(imageFiles[j]);
                        imageCountForFolder++;
                    }
                }
                foldersProcessed++;               
                setStatus("Processed " + foldersProcessed + " folders, " + imagesImported + " images.");
                return true;
            } catch (error) {
                var errMsg = "Error processing folder: \n " + folderItem.name + " \n [" + stage + "]: \n" + error.toString();
                setStatus(errMsg);
                Window.alert(errMsg, "Folder Processing Error");
                return false;
            }
        }

        function getAllImageFolders(folderItem) {
            //setStatus(" -- getAllImageFolders(folderItem) folderItem=" + debugValue(folderItem) + " type=" + typeof folderItem + " exists=" + (folderItem ? folderItem.exists : "n/a"));
            var result = [];
            try {
                var rootName = String(folderItem.name || "").toLowerCase();
                var items;
                try {
                    items = folderItem.getFiles();
                } catch (e) {
                    setStatus("folderItem.getFiles() threw: " + e.toString());
                    throw e;
                }
                setStatus("getFiles() returned type=" + (items instanceof Array ? "array" : typeof items) + " value=" + debugValue(items));
                if (items == null) return result;
                if (!(items instanceof Array)) items = [items];
                for (var m = 0; m < items.length; m++) {
                    try {
                        var childItem = items[m];
                        setStatus(" child item[" + m + "] type=" + (childItem instanceof Folder ? "Folder" : childItem instanceof File ? "File" : typeof childItem) + " name=" + (childItem && childItem.name ? childItem.name : "<none>"));
                        if (childItem instanceof Folder) {
                            var childName = String(childItem.name || "").toLowerCase();
                            if (childName === rootName) {
                                // Skip the root image folder itself.
                                continue;
                            }
                            var childFiles = childItem.getFiles();
                            if (childFiles == null) {
                                continue;
                            }
                            if (!(childFiles instanceof Array)) childFiles = [childFiles];
                            var hasImage = false;
                            for (var f = 0; f < childFiles.length; f++) {
                                if (childFiles[f] instanceof File) {
                                    var extMatch = childFiles[f].name.match(/\.([^.]+)$/);
                                    if (extMatch) {
                                        var ext = extMatch[1].toLowerCase();
                                        if (ext === "jpg" || ext === "jpeg" || ext === "png") {
                                            hasImage = true;
                                            break;
                                        }
                                    }
                                }
                            }
                            if (!hasImage) {
                                continue;
                            }
                            result.push(childItem);
                        }
                    } catch (e) {
                        $.writeln("Error checking item " + m + ": " + e.toString());
                    }
                }
            } catch (e) {
                setStatus("Error in getAllImageFolders: " + e.toString());
                throw e;
            }
            return result;
        }

        function processAllImageFolders(rootFolder) {
            //setStatus(" -- processAllImageFolders(rootFolder) rootFolder=" + debugValue(rootFolder) + " type=" + typeof rootFolder + " exists=" + (rootFolder ? rootFolder.exists : "n/a"));
            if (!rootFolder || !(rootFolder instanceof Folder)) {
                throw new Error("Invalid rootFolder passed to processAllImageFolders");
            }
            var imageFolders = getAllImageFolders(rootFolder);
            if (!(imageFolders instanceof Array)) {
                throw new Error("getAllImageFolders did not return an array");
            }
            if (imageFolders.length === 0) {
                Window.alert("No subfolders found in the images folder. Place images in subfolders and try again.", "No Image Folders");
                return;
            }
            setStatus("Found " + imageFolders.length + " image folders to process.");
            for (var k = 0; k < imageFolders.length; k++) {
                setStatus("Processing folder " + (k+1) + " of " + imageFolders.length + ": " + imageFolders[k].name);
                var success = processImageFolder(imageFolders[k]);
                if (success === false) {
                    setStatus("Folder processing stopped at: " + imageFolders[k].name);
                    return;
                }
            }
        }
        
        function addCompToMaster(AEComp) {
            setStatus(" -- addCompToMaster(AEComp) AEComp=" + debugValue(AEComp));
            var masterLayer = AEMasterComp.layers.add(AEComp);
            masterLayer.startTime = AEMasterCompRuntime;
            masterLayer.moveToEnd();
            AEMasterCompRuntime = AEMasterCompRuntime + compDuration + 0.5;
        }
       
        try {
            processAllImageFolders(imageFolder);
        } catch (e) {
            setStatus("Error calling processAllImageFolders: " + e.toString());
            Window.alert("Error calling processAllImageFolders: " + e.toString(), "Script Error");
            return;
        }
        setStatus("Import complete. Processed " + foldersProcessed + " folders and " + imagesImported + " images.");

} //importContent() 

function dupAndMove(){    
    //get the active layers as an array (there will be only one in our case)
    setStatus("Duplicating and moving first keys...");
    try {
        var layerColl = app.project.activeItem.layers;
        for (var l = 1; l <= layerColl.length; ++l) {
            var curLayer = layerColl[l];
                if (curLayer.selectedProperties && curLayer.selectedProperties.length > 0) {      
                    
                    //This is the selected layer
                    //now get the transform properties
                    var s = curLayer.scale;
                    var p = curLayer.position;
                    //get the scale a position arrays
                    var scale = s.keyValue(1);
                    var pos = p.keyValue(1);    
                    
                    //remove the key frames
                    s.removeKey(1);
                    p.removeKey(1);
                    //get the in and out points of the image
                    var inP = curLayer.inPoint;
                    var outP = curLayer.outPoint;
                    //Get the duration and calc the size the image should zoom
                    //The zoom is based on two things:
                    //1. The duration
                    var dur = outP -  inP;
                    //2. The size of the image (it's largest dimintion)
                    var imageSize = curLayer.height * curLayer.width;
                    var caryGrant = (10000000 - imageSize) ;
                    var scaleByByThisMuch = (caryGrant/10000000) * 11;
                    //alert(imageSize + " " + caryGrant + " " + scaleByByThisMuch );
                    var grow = dur * scaleByByThisMuch;
                    //the scale of the second set of keys
                    var scaleOut = new Array();
                    scaleOut[0] = scale[0] + grow;
                    scaleOut[1] = scale[1] + grow;
                    scaleOut[2] = scale[2];        
                    //make the new key frames at the beginning of the image and 1 second before the end of the image       
                    curLayer.scale.setValueAtTime(inP, scale);
                    curLayer.position.setValueAtTime(inP, pos);
                    curLayer.scale.setValueAtTime(inP + 1.0, scaleOut);
                    curLayer.position.setValueAtTime(inP + 1.0, pos);
                } //if 
            }//for 
    }catch (e) {
        setStatus("Error in dupAndMove: " + e.toString());
        //Window.alert("Error in dupAndMove: " + e.toString(), "Script Error");
    }
}//dupAndMove()

function moveToEnd(){
    //get the active layers as an array (there will be only one in our case)
    var layerColl = app.project.activeItem.layers;
    for (var l = 1; l <= layerColl.length; ++l) {
        var curLayer = layerColl[l];
        if (curLayer.selectedProperties && curLayer.selectedProperties.length > 0) {
            //This is the selected layer
            //now get the transform properties
            var s = curLayer.scale;
            var p = curLayer.position;
            //get the scale a position arrays
            var scale = s.keyValue(2);
            var pos = p.keyValue(2);
            //remove the key frames
            s.removeKey(2);
            p.removeKey(2);
            //get the in and out points of the image
            var outP = curLayer.outPoint; 
            //make the new key frames at the end of the image  
            curLayer.scale.setValueAtTime(outP, scale);
            curLayer.position.setValueAtTime(outP, pos);            
           
            //select the next layer
            // if(curLayer.index == 3){
            //     app.project.activeItem.layer(3).selected = false; 
            //     app.project.activeItem.layer(4).selected = true; 
            // }
            // if(curLayer.index == 4){
            //     app.project.activeItem.layer(4).selected = false; 
            //     app.project.activeItem.layer(5).selected = true; 
            // }
            // if(curLayer.index == 5){
            //     app.project.activeItem.layer(5).selected = false; 
            //     app.project.activeItem.layer(8).selected = true; 
            // }
            // // jump to a keyframe on a property, e.g. Position
            // var prop = layer.property("ADBE Transform Group").property("ADBE Scale");
            // if (prop && prop.numKeys > 0) {            
            //     var keyTime = prop.keyTime(keyFrameIndex);
            //     // move playhead to that keyframe
            //     comp.time = keyTime;
            //     prop.setSelectedAtKey(keyFrameIndex, true);
            // }

        }//if
    }//for
}//moveToEnd()

function cropIn20(){
    
            //Set mask expansion property
            //Dont know how to do it in a script yet
    
    //get the active layers as an array (there will be only one in our case)
    var layerColl = app.project.activeItem.layers;
    var layer = layerColl[1];
    
    var mask = layer.mask(1).property("maskShape");

    
    //crop with a mask (so we don't see rough edges)
    //var mask = layer.Masks.addProperty("Mask");
    //newMask.inverted = true;
    var maskShape = mask.property("maskShape");
    var thing = maskShape.value;
    var thing2 = thing.vertices;
       // alert(thing2[1]);

    //shape = maskShape.value;
   // maskShape.vertices = [[200,100],[10,(layer.height-100)],[(layer.width-100),(layer.height-100)],[(layer.width-100),100]];
    //shape.closed = true;
    //maskShape.setValue(shape);                
    
}//cropIn20()

function openLayerandSelectKey(layerIndex, keyFrameIndex){
    setStatus("Open layer " + layerIndex.toString() + " and select keyframe " + keyFrameIndex.toString());
    //setStatus("Open layer");
    var comp = app.project.activeItem;
    if (comp && comp instanceof CompItem) {
        // open comp in viewer
        comp.openInViewer();

        // get a layer by index or name
        var layer = comp.layer(layerIndex); // or comp.layer("Your Layer Name")
        if (layer) {
            // select the layer
            layer.selected = true;

            // reveal the layer in the timeline
            comp.openInViewer();

            // jump to a keyframe on a property, e.g. Position
            var prop = layer.property("ADBE Transform Group").property("ADBE Scale");
            if (prop && prop.numKeys > 0) {            
                var keyTime = prop.keyTime(keyFrameIndex);
                // move playhead to that keyframe
                comp.time = keyTime;
                prop.setSelectedAtKey(keyFrameIndex, true);
            }
        }
    }
}

function autoStep(){
    var setp = autoStepKeyIndex[autoStepPostion];
    var stepName = setp[0].toString();
    setStatus("Auto Step:" + setp[0].toString() + "  Position:" + autoStepPostion.toString() );
    try{
        if(autoStepPostion >= autoStepKeyIndex.length){
            autoStepPostion = 0;   
            var setp = autoStepKeyIndex[autoStepPostion];
            var stepName = setp[0].toString();
            buttonGroup.AutoStepBtn.text = "Auto Step: " + stepName + "  Move to Layer " + setp[1].toString() + " and select keyframe " + setp[2].toString();
            return;   
        }else{
            autoStepPostion = autoStepPostion + 1;
        }

        if(stepName == "Select"){ 
            openLayerandSelectKey(setp[1],setp[2]);        
            buttonGroup.AutoStepBtn.text = "Auto Step: Duplicate First Keys and move";
            buttonGroup.instructionAutoStepLabel.text = "Instruction: Move the first keys (currently selected) where you want the move to start. Use the properties window for scaling. ";
        }    
        if(stepName == "Dup"){
            dupAndMove();      
            buttonGroup.AutoStepBtn.text = "Auto Step: Move Second Keys to End";
            buttonGroup.instructionAutoStepLabel.text = "Instruction: Move the second keys (currently selected) where you want the move to end. Use the properties window for scaling. ";
        }      
        if(stepName == "Move"){
            moveToEnd(); 
            app.project.activeItem.layer(setp[1]).selected = false; 
            autoStep();  
            buttonGroup.AutoStepBtn.text = "Auto Step: Move to Layer " + setp[1].toString() + " and select keyframe " + setp[2].toString();
            buttonGroup.instructionAutoStepLabel.text = "Instruction: Open The Next Comp";
        }   
    }catch (e) {
        setStatus("Error in autoStep: " + e.toString());    
    }
}