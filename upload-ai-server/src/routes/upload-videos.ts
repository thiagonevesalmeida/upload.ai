import { FastifyInstance } from "fastify";
import { fastifyMultipart } from "@fastify/multipart";
import path from "node:path";
import fs  from "node:fs";
import { randomUUID } from "node:crypto";
import { pipeline } from "node:stream";
import { promisify } from "node:util";
import { prisma } from "../lib/prisma";

const pump = promisify(pipeline);

export async function uploadVideosRoute(app: FastifyInstance) {
	app.register(fastifyMultipart, {
		limits: {
			fileSize: 1_048_576 * 25, //25mb
		}
	})

	app.post('/videos', async (req, res) => {
		const data = await req.file()

		if (!data) {
			return res.status(400).send({ error: "Missing file input." })
		}

		//check file extension
		const extension = path.extname(data.filename) 
		if (extension !== ".mp3") {
			return res.status(400).send({error: "Invalid input type, please upload a MP3."})
		}

		//save filename - avoid registering files with the same name
		const fileBaseName = path.basename(data.filename, extension)
		const fileUploadName = `${fileBaseName}-${randomUUID()}${extension}`
		// path where the videos will be saved
		const uploadDestination = path.resolve(__dirname, '../../tmp', fileUploadName)

		await pump(data.file, fs.createWriteStream(uploadDestination)) //upload video on video destination

		// record video info at database table video
		const video = await prisma.video.create({
			data: {
				name: data.filename,
				path: uploadDestination,
			}
		}) 

		return ({
			video,
		})
	})
}