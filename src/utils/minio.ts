import { ReadStream } from "fs";
import { Client } from "minio";
import { Readable } from "stream";
import https from "https"

export const to_readable = (text: string) => {
    const buff = Buffer.from(text)
    return Readable.from(buff)
}

export const url_buffer = async (url: string) => {
    return new Promise<Buffer>((resolve, reject) => {
        https.get(url, (res) => {
            let data: Array<any> = []
            res.on('data', (chunk) => {
                data.push(chunk)
            })
            res.on('end', () => {
                resolve(Buffer.concat(data))
                console.log(`downloaded ${url}`)
            })
            res.on('error', (error) => reject(error))
        })
    })
}


export class MinioHelper {
    constructor(
        private readonly client: Client
    ) { }
    get = async (bucket: string, file: string) => {
        return new Promise<Buffer>((resolve, reject) => {
            this.client.getObject(bucket, file, (err, stream) => {
                if (err) {
                    reject(err)
                } else {
                    let data: Array<any> = []
                    stream.on('data', (chunk) => {
                        data.push(chunk)
                    })
                    stream.on('end', () => resolve(Buffer.concat(data)))
                    stream.on('error', (error) => reject(error))
                }
            })
        })
    }

    set = async (bucket: string, file: string, stream: ReadStream | Readable | Buffer) => {
        return new Promise<boolean>((resolve, reject) => {
            this.client.putObject(bucket, file, stream, (err) => {
                if (err) {
                    resolve(false)
                } else {
                    resolve(true)
                }
            })
        })
    }
}