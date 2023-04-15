import * as minio from "minio"
import { Minecraft, Spigot } from "./game/minecraft";
import { MinioHelper, to_readable } from "./utils/minio";

const client = new minio.Client({
    endPoint: '10.0.0.22',
    port: 9000,
    useSSL: false,
    accessKey: 'FjAqSqXPbtVLS0Ir',
    secretKey: 'uTiwQl953mlXy8WN5KTaukbhXhHHyHuL',
});

const helper = new MinioHelper(client)

async function main() {
    const spigot = new Spigot(helper)
    // helper.set("test","metadata.json",to_readable("[]"))
    // spigot.buildTool()
    spigot.download()
    // const minecraft = new Minecraft(helper)
    // minecraft.vanilla("mojang-mirror")
}

main()