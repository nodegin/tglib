const { Client, Structs } = require("tglib");

void async function() {
    const client = new Client({
        apiId: "YOUR_API_ID",
        apiHash: "YOUR_API_HASH",
    });

    // Save tglib default handler which prompt input at console
    const defaultHandler = client.callbacks["td:getInput"];

    // Register own callback for returning auth details
    client.registerCallback("td:getInput", async (args) => {
        if (args.string === "tglib.input.AuthorizationType") {
            return "user";
        } else if (args.string === "tglib.input.AuthorizationValue") {
            return "YOUR_INTERNATIONAL_PHONE_NUMBER";
        }
        return await defaultHandler(args);
    });

    await client.ready;

    await client._send({
        "@type": "sendMessage",
        "chat_id": -123456789,
        "input_message_content": {
            "@type": "inputMessageText",
            "text": {
                "@type": "formattedText",
                "text": "Hi",
            },
        },
    });

    // or use tglib API
    await client.tg.sendTextMessage({
        "$text": new Structs.TextStruct("<b>Hi bold</b>", "textParseModeHTML"),
        "chat_id": -123456789,
    });
}();
