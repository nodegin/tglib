export default class TextStruct {
    constructor(text, parseMode) {
        this.text = text;
        if (["textParseModeHTML", "textParseModeMarkdown"].indexOf(parseMode) >= 0) {
            this.parseMode = parseMode;
        }
    }

    // Internal method
    async _format(_client) {
        let args;
        if (this.parseMode) {
            args = await _client._execute({
                "@type": "parseTextEntities",
                "text": this.text,
                "parse_mode": { "@type": this.parseMode },
            });
        } else {
            args = {
                "@type": "formattedText",
                "text": this.text,
            };
        }
        return args;
    }
}
