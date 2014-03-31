/*global define, $, brackets, Mustache */
define(function (require, exports, module) {
    "use strict";
    var COMMAND_ID      = "momo.ckeditor",
        CommandManager  = brackets.getModule("command/CommandManager"),
        Dialogs         = brackets.getModule("widgets/Dialogs"),
        EditorManager   = brackets.getModule("editor/EditorManager"),
        ExtensionUtils  = brackets.getModule("utils/ExtensionUtils"),

        template        = require("text!html/ckeditor.html"),
        ckjs            = require("ckeditor/ckeditor"),
        ckconfig        = require("ckeditor.config"),
        RightCol		= require("text!html/menu.html"),
        $ck_modal;



	/**
	 * @private
	 * Finds both, the staring and the closing html-tag or when not found an empty object
	 * @param {object} cm              Codemirror instance
	 * @param {object} startTagToken   {line, pos}  - the token the endtag must be find for
     *
     * returns an object with positions of starting and closing tags:
     *      { {line: startTagLine, ch: startTagPos}, {line: closingTagLine, ch: closingTagPos}  }
	 */
	function _getMatchingEndTag(cm, startTagToken) {

		var result = {},
            matchTags = CodeMirror.findMatchingTag(cm, startTagToken);

		if (matchTags && matchTags.open && matchTags.close) {
			result.start  = { line: matchTags.open.from.line, ch: matchTags.open.from.ch };
			result.end  = { line: matchTags.close.to.line, ch: matchTags.close.to.ch };
		}
		return result;
	}

	/**
	 * @private
	 * Finds the first starting tag in a range
	 * @param {object} cm      Codemirror instance
	 * @param {object} range   { {line: startline, ch: startPos}, {line: endLine, ch: EndPos}  }
     *
     * returns an object {line, pos} with the position of the starting range
	 */
	function _getRangeStart(cm, range) {

		var result = {},
            l = range.start.line;
		while (l <= range.end.line) {
			var tok = _getFirstTagInLine(cm, l);
			if (tok.start) {
				return {line: l, ch: tok.start};
			}
			l++;
		}
		return result;
	}

    /**
	 * @private
	 * Finds the last tag in a range.
     * To get proper html the result can exceed the given range when a tag in the given range contains a closing tag outside of the range.
	 * @param {object} cm      Codemirror instance
	 * @param {object} range   { {line: startline, ch: startPos}, {line: endLine, ch: EndPos}  }
     *
     * returns an object {line, pos} with the position of the end of the range
	 */
	function _getRangeEnd(cm, range) {
		var result = {},
            l = range.start.line;
		while (l <= range.end.line) {
			var tok = _getFirstTagInLine(cm, l),
                tokEndTag = _getMatchingEndTag(cm, {line: l, ch: tok.start});

			if (tokEndTag.end) {
				if (
					(tokEndTag.end.line > range.end.line) || //passed end line ??
					(tokEndTag.end.line == range.end.line && tokEndTag.end.ch >= range.end.ch) //same line but passed end ch ??
				) {
					return {line: tokEndTag.end.line, ch: tokEndTag.end.ch};

				}
			}
			l++;
		}
		return result;
	}

	/**
	 * @private
	 * _getFirstTagInLine
	 * @param {object} cm  Codemirror instance
	 * @param {int} l      Line
     *
     * returns {object} token with its position {startpos, endpos} when it's a tag else an empty {object}
	 */
	function _getFirstTagInLine(cm, l) {
		var result  = {},
            c       = 1,
            last_c  = 0,
            tok     = _getTokenAtCursor(cm, {line : l, ch: c});

		while (c > last_c) {
			last_c = c;
			if (tok.type == "tag") {
				return tok;
			}
			tok = _nextToken(cm, {line: l, ch: c});
			c = tok.end;
		}
		return result;
	}

    /**
	 * @private
	 * _getTokenAtCursor
	 * @param {object} cm              Codemirror instance
	 * @param {object} {line, pos} pos Cursor position
     *
     * returns {object} token with it's position {startpos, endpos}
	 */
	function _getTokenAtCursor(cm, pos) {

		return cm.getTokenAt({line: pos.line, ch: pos.ch});
	}

    /**
	 * @private
	 * _nextToken
	 * @param {object} cm              Codemirror instance
	 * @param {object} {line, pos} pos Cursor position
     *
     * returns {object} token with it's position {startpos, endpos}
	 */
	function _nextToken(cm, pos) {

		return cm.getTokenAt({line: pos.line, ch: pos.ch + 1});
	}

	/**
	 * @private
	 * This stupid function makes an attempt to find the paths of css-files which are included in the html
     * (a proper method would compare the paths with ProjectManager.getAllFiles(ProjectManager.getLanguageFilter("css")) )
     * ignores paths starting "/" or "../" etc.
	 * @param {object}     hostEditor
     *
     * returns {Array} with absolute Filepath of included css-files
	 */
	function _extractCSSFiles(hostEditor) {

		var docFolder = hostEditor.document.file.parentPath,
            docContent = hostEditor.document.getText(),
            cssLinks = [],
            cssPatt = /<link\s+(?:[^>]*?\s+)?href="([^"]*)"/g,
            links = docContent.match(cssPatt);

		if (links) {
			for (var i = 0; i < links.length; i++) {

				links[i] = links[i].substr(links[i].indexOf('href="')+6);
				links[i] = links[i].substr(0, links[i].lastIndexOf('"'));
				var ext = links[i].substr(links[i].lastIndexOf(".") +1);
				if (links[i].substr(0, 1).match(/[A-Z,a-z]/g) && ext == "css") {
					cssLinks.push(docFolder + links[i])
				}
			}
		}
		return cssLinks;
	}

	/**
	 * @private
	 * Loads the dialog with ckeditor an the content to edit
	 * @param {type} hostEditor
	 * @param {type} content   Content to edit
	 * @param {type} range     Range to replace in hostEditor
	 */
	function _loadCk (hostEditor, content, range) {

		Dialogs.showModalDialogUsingTemplate(template, false);

        //first the cancel-button - so if something goes wrong we at least can leave the dialog
        $ck_modal = $(".ckdialog.instance");
		$ck_modal.find("#ck_cancel").click( function () {
			if (CKEDITOR.instances["ckeditor1"]) {
				CKEDITOR.instances['ckeditor1'].destroy();
			}
            Dialogs.cancelModalDialogIfOpen("ckdialog", "ck_cancel");
        });

		//prepare the config for CKeditor
		var cssFilesConfig = {};
		cssFilesConfig.contentsCss = _extractCSSFiles(hostEditor)
        var config = $.extend({}, ckConfig, cssFilesConfig);

		CKEDITOR.replace("ckeditor1", config);
		CKEDITOR.on("instanceReady", function(ev) {
			CKEDITOR.instances.ckeditor1.setData(content);
			CKEDITOR.instances.ckeditor1.focus();
            ev.removeListener();
		});

        $ck_modal.find("#ck_paste").click( function () {
			var data = CKEDITOR.instances["ckeditor1"].getData(),
                dataLines = data.split("\n").length,
                dataEndLine = range.start.line + dataLines;

			hostEditor.document.replaceRange(data, { line: range.start.line, ch: 0 }, { line: range.end.line, ch: range.end.ch });
            for (var index = range.start.line; index <= (dataEndLine); index++) {
                hostEditor._codeMirror.indentLine(index);
            }
			if (CKEDITOR.instances["ckeditor1"]) {
				CKEDITOR.instances['ckeditor1'].destroy();
			}
            Dialogs.cancelModalDialogIfOpen("ckdialog", "ck_paste");
        });

	}

    /**
     * Kick-off - calculates the range to edit and init dialog with ckeditor...
     */
    function bracketsCkeditor() {

        var hostEditor = EditorManager.getCurrentFullEditor(),
            cm = hostEditor._codeMirror;

        // Only provide a CK-editor when cursor is in HTML content
        if (hostEditor.getLanguageForSelection().getId() !== "html") {
            return null;
        }

        //Conntent to edit:
        var range,
            content = "",
            sel = hostEditor.getSelection();

        //no selection -> empty editor
        if (sel.start.line === sel.end.line && sel.start.ch === sel.end.ch) {
			range = sel;
		}
		else {
			//find position of starting tag and ending tag
			var rangeStart = _getRangeStart(cm, sel),
                rangeEnd = _getRangeEnd(cm, sel);

			if(rangeStart.line && rangeEnd.line) {
				range = {start: rangeStart, end: rangeEnd};
				content = hostEditor.document.getRange(rangeStart, rangeEnd);
			}
			else {
                //invalid range - probably no tag in selection -> empty editor
				range = {start: sel.start, end: sel.start};
			}
		}

		_loadCk(hostEditor, content, range);

    }


	ExtensionUtils.loadStyleSheet(module, "css/styles.css");
	$("#main-toolbar .buttons").append(RightCol);
	$(".bracket-ckeditor").on("click", function () {
		bracketsCkeditor();
	});
	CommandManager.register("bracketsCkeditor", COMMAND_ID, bracketsCkeditor);

});
