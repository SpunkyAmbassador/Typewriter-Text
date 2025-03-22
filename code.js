import { RPM } from "../path.js"

const pluginName = "Typewriter Text";

class WaitUntilDoneTyping extends RPM.EventCommand.Base
{
	constructor(id)
	{
		super();
		this.id = id;
	}

	onKeyPressed(currentState, key)
	{
		if (RPM.Datas.Keyboards.checkActionMenu(key) || RPM.Datas.Keyboards.checkCancelMenu(key))
		{
			const p = RPM.Manager.Stack.displayedPictures;
			for (var i = 0; i < p.length; i++)
				if (p[i][0] === this.id)
					p[i][1].typewriterTextPlugin_skip = true;
		}
	}

	onMouseDown(currentState, x, y)
	{
		if (RPM.Datas.Systems.isMouseControls && RPM.Common.Inputs.mouseLeftPressed)
		{
			const p = RPM.Manager.Stack.displayedPictures;
			for (var i = 0; i < p.length; i++)
				if (p[i][0] === this.id)
					if (p[i][1].isInside(x, y))
						p[i][1].typewriterTextPlugin_skip = true;
		}
	}

	update(currentState)
	{
		if (RPM.Datas.Systems.isMouseControls && RPM.Common.Inputs.mouseLeftPressed)
			return 0;
		const p = RPM.Manager.Stack.displayedPictures;
		for (var i = 0; i < p.length; i++)
			if (p[i][0] === this.id && !!p[i][1].typewriterTextPlugin_doneTyping)
				return 1;
		return 0;
	}
}

function updateWindow(id, x, y, width, height, wholeText, count, sound, volume)
{
	var w = null;
	const p = RPM.Manager.Stack.displayedPictures;
	for (var i = 0; i < p.length; i++)
		if (p[i][0] === id)
			w = p[i][1];
	if (count < wholeText.length)
	{
		var stride = 1;
		var wait = 5;
		if (!!w && w.typewriterTextPlugin_skip)
			stride = wholeText.length;
		RPM.Manager.Songs.playSound(sound, volume);
		for (var i = stride; i > 0; i--)
		{
			if (wholeText[count] == "[")
			{
				const n = wholeText.indexOf("]", count);
				if (wholeText.substr(count).search(/\[wait=\d*\]/) === 0)
				{
					wait = parseInt(wholeText.slice(count + 6, n));
					wholeText = wholeText.substr(0, count) + wholeText.substr(n + 1);
					break;
				}
				console.log(wholeText.substring(count, n + 1), isText(wholeText.substring(count, n + 1)));
				if (n > 0 && !isText(wholeText.substring(count, n + 1)))
					count = n;
			}
			count++;
		}
		spawnWindow(id, x, y, height, width, wholeText.substring(0, count));
		setTimeout(updateWindow, wait, id, x, y, width, height, wholeText, count, sound, volume);
	}
	else
		w.typewriterTextPlugin_doneTyping = true;
}

function isText(text)
{
	console.log(text);
	const m = new RPM.Graphic.Message(text, -1, 0, 0);
	m.update();
	for (var i = 0; i < m.graphics.length; i++)
	{
		if (!m.graphics[i])
			continue;
		if (m.graphics[i].constructor.name !== "Text")
			return false;
		if (m.graphics[i].text == text)
			return true;
	}
	return false;
}

// Typewriter plugin code - Start
RPM.Manager.Plugins.registerCommand(pluginName, "Show Text", (id, text, sound, volume) =>
{
	var i;
	text = text.toString();
	while (true) // not the best practice but works in this scenario
	{
		i = text.search(/[^\\]\\n/); // regex for "find \n except when it's \\n"
		if (i === -1)
			break;
		text = text.slice(0, i + 1) + "\n" + text.slice(i + 3);
	}
	const d = RPM.Datas.Systems.dbOptions;
	updateWindow(id, d.v_x, d.v_y, d.v_h, d.v_w, text.replace("\\\\n", "\\n"), 0, sound.kind === RPM.Common.Enum.SongKind.Sound ? sound.id : 0, Math.max(0, Math.min(100, volume / 100)));
	const currentCommand = RPM.Core.ReactionInterpreter.currentReaction.currentCommand;
	if (!currentCommand.typewriterTextPlugin_finishedText)
	{
		currentCommand.typewriterTextPlugin_finishedText = true;
		const nextCommand = currentCommand.next;
		const showText = new RPM.EventCommand.ShowText([8, "", -1, 0, 0, 1, text.replace(/\[wait=\d*\]/, "").replace("\\n", "\n")]);
		showText.initialize();
		currentCommand.next = new RPM.Core.Node(currentCommand.parent, new WaitUntilDoneTyping(id));
		currentCommand.next.next = new RPM.Core.Node(currentCommand.parent, showText);
		currentCommand.next.next.next = nextCommand;
	}
});
// Typewriter plugin code - End

// "Multiple text boxes" plugin code by @Russo (https://github.com/yaleksander/RPM-Plugin-Multiple-text-boxes) - Start
RPM.Core.WindowBox.prototype.draw = function (isChoice = false, windowDimension = this.windowDimension, contentDimension = this.contentDimension)
{
	if (this.content)
		this.content.drawBehind(contentDimension[0], contentDimension[1], contentDimension[2], contentDimension[3]);

	// Single line alteration from source code
	!!this.customWindowSkin ? this.customWindowSkin.drawBox(windowDimension, this.selected, this.bordersVisible) : RPM.Datas.Systems.getCurrentWindowSkin().drawBox(windowDimension, this.selected, this.bordersVisible);

	if (this.content)
	{
		if (!isChoice && this.limitContent)
		{
			RPM.Common.Platform.ctx.save();
			RPM.Common.Platform.ctx.beginPath();
			RPM.Common.Platform.ctx.rect(contentDimension[0], contentDimension[1] - RPM.Common.ScreenResolution.getScreenY(this.padding[3] / 2), contentDimension[2], contentDimension[3] + RPM.Common.ScreenResolution.getScreenY(this.padding[3]));
			RPM.Common.Platform.ctx.clip();
		}
		if (isChoice)
			this.content.drawChoice(contentDimension[0], contentDimension[1], contentDimension[2], contentDimension[3]);
		else
			this.content.draw(contentDimension[0], contentDimension[1], contentDimension[2], contentDimension[3]);
		if (!isChoice && this.limitContent)
			RPM.Common.Platform.ctx.restore();
	}
}

// Tweaked this code to be a function instead of command
function spawnWindow(id, x, y, width, height, text)
{
	const pad = RPM.Datas.Systems.dbOptions;
	const value = [id, new RPM.Core.WindowBox(x, y, width, height,
	{
		content: new RPM.Graphic.Message(text.toString(), -1, 0, 0),
		padding: [pad.v_pLeft, pad.v_pTop, pad.v_pRight, pad.v_pBottom]
	})];
	value[1].content.update();
	value[1].customWindowSkin = RPM.Datas.Systems.getCurrentWindowSkin();
	const p = RPM.Manager.Stack.displayedPictures;
	var ok = false;
	for (var i = 0; i < p.length; i++)
	{
		if (id === p[i][0])
		{
			p[i] = value;
			ok = true;
			break;
		}
		else if (id < p[i][0])
		{
			p.splice(i, 0, value);
			ok = true;
			break;
		}
	}
	if (!ok)
		p.push(value);
	return value[1];
};
// "Multiple text boxes" plugin code by @Russo - End
