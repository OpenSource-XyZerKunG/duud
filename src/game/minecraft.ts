import axios from "axios";
import { MinioHelper, to_readable, url_buffer } from "../utils/minio";
import { not_supported } from "./minecraft_support";
import { createWriteStream, writeFileSync } from "fs";
import https from "https"
import { WritableStream } from "stream/web";
import { spawn } from "child_process";

export class Minecraft {
    constructor(
        private readonly client: MinioHelper
    ) { }

    async vanilla_manifest() {
        return (await axios.get("https://launchermeta.mojang.com/mc/game/version_manifest_v2.json")).data["versions"]
    }

    async vanilla(bucket: string) {
        const meta: {
            id: string,
            type: string,
            sha1: string
        }[] = JSON.parse(await (await this.client.get(bucket, "metadata.json")).toString("utf8"))
        const manifest: {
            id: string,
            type: string,
            sha1: string,
            url: string
        }[] = await this.vanilla_manifest()
        const need_update = manifest.filter(a => !not_supported.includes(a.id) && a.type == "release").filter(a => meta.find(b => a.id == b.id)?.sha1 != a.sha1)
        try {
            for (const mc of need_update) {
                const data = (await axios.get(mc.url)).data
                const server_url = data["downloads"]["server"]["url"]
                console.log(`putting ${mc.id}`)

                await this.client.set(bucket, `${mc.id}/server.jar`, await url_buffer(server_url))
                await this.client.set(bucket, `${mc.id}/metadata.json`, to_readable(
                    JSON.stringify({
                        javaVersion: data["javaVersion"] ? data["javaVersion"]["majorVersion"] : 8
                    })
                ))
                meta.push({
                    id: mc.id,
                    type: mc.type,
                    sha1: mc.sha1
                })
            }
        } catch (error) {
            console.log(error)
        }
        this.client.set(bucket, "metadata.json", to_readable(JSON.stringify(meta)))
    }
}

export class Spigot {
    constructor(
        private readonly client: MinioHelper
    ) { }

    async buildTool() {
        const buildToolId = (await axios.get("https://hub.spigotmc.org/jenkins/job/BuildTools/lastSuccessfulBuild/api/json")).data.number
        const buildToolIdCached = this.client.get("test", "buildtool.txt")
        if (buildToolId != buildToolIdCached) {
            this.client.set("test", "buildtool.txt", to_readable(buildToolId.toString()))
        }
        await new Promise<boolean>((resolve) => {
            const res = https.request("https://hub.spigotmc.org/jenkins/job/BuildTools/lastSuccessfulBuild/artifact/target/BuildTools.jar", {
                method: 'GET',
                headers: {
                    'User-Agent': 'Wget/1.21.1 (linux-gnu)',
                    'Accept': '*/*',
                }
            }, (res) => {
                const writer = createWriteStream("./BuildTool.jar")
                res.pipe(writer)
                res.on("close", () => {
                    writer.end()
                    resolve(true)
                })
                res.on("error", () => {
                    throw new Error("FUCK Spigot")
                })
            })
            res.end()
        })
    }

    async download() {
        const versions = [...(await axios.get("https://hub.spigotmc.org/versions/")).data.match(/(?:\<a href=")([^\"]+)(?:")/gm)]
        const supportedVersion = versions.map((data: string) => data.split('"')[1])
            .filter((data: string) => data.includes(".json"))
            .map((data: string) => data.replace(".json", ""))
            .filter(data => data.includes(".") && !data.includes("-"))
        const meta: {
            id: string,
            sha1: string
        }[] = JSON.parse((await this.client.get("test", "metadata.json")).toString("utf8"))
        for (const version of supportedVersion) {
            const manifest = (await axios.get(`https://hub.spigotmc.org/versions/${version}.json`)).data
            const old = meta.findIndex(data => data.id == version)
            const sha1 = manifest.refs.Spigot
            if (old != -1 && meta[old].sha1 != sha1) {
                meta[old].sha1 = sha1
            } else {
                meta.push({
                    id: version,
                    sha1: sha1
                })
            }
            console.log("Building", version)
            const execute = spawn("C:\\Program Files\\Common Files\\Oracle\\Java\\javapath\\java.exe", [
                "-jar",
                "./BuildTool.jar",
                "--rev",
                '1.19.3'
            ], {
                cwd: "E:\\_Project\\nodejs\\duud\\test"
            })
            execute.stdout.pipe(process.stdout)
            break
        }
    }
}