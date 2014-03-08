# CKEditor for Brackets
	Tested with Brackets Sprint36 and CKEditor 4.3.3 (Standard Package)

###Installation:


 1. Place the ```brackets-ckeditor```-folder inside the [extension-folder](https://github.com/adobe/brackets/wiki/Extension-Location) or use Bracket's [Extension Manger](https://github.com/adobe/brackets/wiki/Brackets-Extensions) for installation
 2. Download [CKeditor](http://ckeditor.com/download) and extract it into the ```brackets-ckeditor```-folder (don't rename folder containing CKEditor, name must be ```ckeditor```)

###Usage:

In Brackets on the right, next to the Extension Manager, you will find now the button for CKEditor.

**To paste/insert content:** 
In Brackets put the cursor in a HTML-file where you want to paste content. Press the CKEditor-button. CKEditor opens with an empty screen. Enter your content and press ```Paste```.

**To edit content:** 
Select in Brackets the HTML you want to edit and press the CKEditor-button. Your content will open in Ckeditor. After you made your adjustements press ```Paste```. The selected HTML in Brackets will be replaced.


>**Notice:**

>CKEditor needs proper HTML with start- and end-tags. That's why the extension always tries to select complete code-blocks (i.e. if you only select ```<div ``` class="something"> in the editor the extension will select the complete div container). If your selection doen't contain any tag you will get an empty CKEditor and entered content will be inserted.
>
>Sometimes CKEditor strips code it doesn't agree with. That is not caused by the extension! 
Of course you are free to configure CKEditor in the way you like it. You can find the configuration of CKEditor in the file ```ckeditor.config.js``` in the extension folder.

![Screenshot](https://github.com/MomoPZ/screenshots/blob/master/Brackets-CKEditor.png?raw=true "Screenshot CKEditor in Brackets")
